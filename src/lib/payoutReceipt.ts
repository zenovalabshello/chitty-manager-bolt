import type { Chitty } from './chitties';
import type { PayoutWithDetails } from './payouts';
import { effectiveTotalPayout, effectiveMemberPayout } from './payouts';

interface PayoutReceiptData {
  chitty: Chitty;
  payout: PayoutWithDetails;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function generatePayoutReceiptImage({ chitty, payout }: PayoutReceiptData): void {
  const W = 800;
  const H = 640;
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);

  const isPair = payout.winner_type === 'pair';
  const isCustom = payout.custom_payout_amount != null;
  const actualTotal = effectiveTotalPayout(payout);
  const winnerName = isPair
    ? `${payout.winnerMember1?.name ?? '?'} + ${payout.winnerMember2?.name ?? '?'}`
    : payout.winnerMember?.name ?? 'Unknown';

  const statusLabel = payout.status === 'paid' ? 'Paid' : 'Pending';
  const statusColor = payout.status === 'paid' ? '#16a34a' : '#737373';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  ctx.fillStyle = '#4f46e5';
  ctx.fillRect(0, 0, W, 8);

  // Header
  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillText('Payout Receipt', 40, 55);

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
    { label: 'Winner', value: winnerName },
    { label: 'Winner Type', value: isPair ? 'Half-member pair' : 'Full member' },
    { label: 'Cycle / Draw', value: `#${payout.cycle_number}` },
    { label: isCustom ? 'Custom Payout' : 'Total Payout', value: formatCurrency(actualTotal), valueColor: '#4f46e5' },
  ];

  if (isPair) {
    fields.push({
      label: `${payout.winnerMember1?.name ?? 'Member 1'}'s Share`,
      value: formatCurrency(effectiveMemberPayout(payout, 1)),
      valueColor: '#16a34a',
    });
    fields.push({
      label: `${payout.winnerMember2?.name ?? 'Member 2'}'s Share`,
      value: formatCurrency(effectiveMemberPayout(payout, 2)),
      valueColor: '#16a34a',
    });
  }

  fields.push({ label: 'Payout Date', value: formatDate(payout.payout_date) });
  if (payout.note) {
    fields.push({ label: 'Note', value: payout.note });
  }

  let y = 155;
  const labelX = 40;
  const valueX = 340;

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
  ctx.fillStyle = statusColor;
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Status: ${statusLabel}`, 40, badgeY);

  // Footer
  ctx.fillStyle = '#d4d4d4';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.fillText('This is a computer-generated payout receipt reflecting current records.', 40, H - 30);

  // Synchronous download via data URL
  const dataUrl = canvas.toDataURL('image/png');
  const filename = `payout_${chitty.name.replace(/\s+/g, '_')}_cycle${payout.cycle_number}.png`;

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
