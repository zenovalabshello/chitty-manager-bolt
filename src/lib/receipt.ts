import type { Chitty } from './chitties';
import type { MemberCycleStatus } from './payments';

interface ReceiptData {
  chitty: Chitty;
  status: MemberCycleStatus;
  cycleNumber: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function generateReceiptImage({ chitty, status, cycleNumber }: ReceiptData): void {
  const W = 800;
  const H = 560;
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);

  const { member, expected, paid, pending, status: payStatus, payments } = status;

  const latestDate = payments.length > 0
    ? [...payments].sort((a, b) => a.collection_date.localeCompare(b.collection_date)).reverse()[0].collection_date
    : '';

  const statusLabel = { paid: 'Fully Paid', partial: 'Partially Paid', pending: 'Pending' }[payStatus];
  const statusColor: Record<string, string> = {
    paid: '#16a34a',
    partial: '#d97706',
    pending: '#737373',
  };

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  ctx.fillStyle = '#4f46e5';
  ctx.fillRect(0, 0, W, 8);

  // Header
  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillText('Payment Receipt', 40, 55);

  ctx.fillStyle = '#6366e1';
  ctx.font = '600 16px system-ui, -apple-system, sans-serif';
  ctx.fillText(chitty.name, 40, 82);

  // Receipt meta line
  ctx.fillStyle = '#a3a3a3';
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  const generatedDate = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  ctx.fillText(`Generated: ${generatedDate}`, 40, 102);

  // Divider
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 120);
  ctx.lineTo(W - 40, 120);
  ctx.stroke();

  // Fields
  const fields: { label: string; value: string; valueColor?: string }[] = [
    { label: 'Member', value: member.name },
    { label: 'Membership', value: member.membership_type === 'half' ? 'Half Member' : 'Full Member' },
    { label: 'Cycle', value: `#${cycleNumber}` },
    { label: 'Installment Amount', value: formatCurrency(expected) },
    { label: 'Total Paid', value: formatCurrency(paid), valueColor: '#16a34a' },
    { label: 'Remaining', value: formatCurrency(pending), valueColor: pending > 0 ? '#dc2626' : '#16a34a' },
    { label: 'Latest Collection Date', value: latestDate ? formatDate(latestDate) : '—' },
  ];

  let y = 155;
  const labelX = 40;
  const valueX = 320;

  for (const f of fields) {
    ctx.fillStyle = '#737373';
    ctx.font = '500 14px system-ui, -apple-system, sans-serif';
    ctx.fillText(f.label, labelX, y);

    ctx.fillStyle = f.valueColor ?? '#1a1a1a';
    ctx.font = '600 16px system-ui, -apple-system, sans-serif';
    ctx.fillText(f.value, valueX, y);

    y += 36;
  }

  // Divider before status
  ctx.strokeStyle = '#e5e5e5';
  ctx.beginPath();
  ctx.moveTo(40, y + 6);
  ctx.lineTo(W - 40, y + 6);
  ctx.stroke();

  // Status badge
  const badgeY = y + 36;
  ctx.fillStyle = statusColor[payStatus];
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Status: ${statusLabel}`, 40, badgeY);

  // Footer
  ctx.fillStyle = '#d4d4d4';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.fillText('This is a computer-generated receipt reflecting current payment records.', 40, H - 30);

  // Synchronous download via data URL — keeps the operation inside the
  // user-gesture call stack so mobile browsers honour the download.
  const dataUrl = canvas.toDataURL('image/png');
  const filename = `receipt_${chitty.name.replace(/\s+/g, '_')}_cycle${cycleNumber}_${member.name.replace(/\s+/g, '_')}.png`;

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
