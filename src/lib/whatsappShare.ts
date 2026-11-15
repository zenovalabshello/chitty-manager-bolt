import type { Chitty, PaymentAccountDetails } from './chitties';
import type { MemberCycleStatus } from './payments';
import { formatCurrency, formatDate } from '@/components/ChittyCard';

export function buildWhatsAppMessage(
  chitty: Chitty,
  cycleNumber: number,
  dueDate: string,
  statuses: MemberCycleStatus[]
): string {
  const lines: string[] = [];

  lines.push(`Chitty Name: ${chitty.name}`);
  lines.push(`Cycle: ${cycleNumber}`);
  lines.push(`Due Date: ${formatDate(dueDate)}`);
  lines.push(`Installment: ${formatCurrency(chitty.installment_amount)}`);
  lines.push('');

  for (const st of statuses) {
    if (st.status === 'paid') {
      lines.push(`${st.member.name} — 🟢 Paid`);
    } else if (st.status === 'partial') {
      lines.push(`${st.member.name} — ${formatCurrency(st.paid)}`);
    } else {
      lines.push(`${st.member.name} — 🔴 Pending`);
    }
  }

  const details = chitty.payment_account_details;
  if (details && hasAnyDetail(details)) {
    lines.push('');
    lines.push('Payment Account Details:');
    if (details.account_holder_name) lines.push(`Account Holder: ${details.account_holder_name}`);
    if (details.bank_name) lines.push(`Bank: ${details.bank_name}`);
    if (details.account_number) lines.push(`Account Number: ${details.account_number}`);
    if (details.ifsc_code) lines.push(`IFSC: ${details.ifsc_code}`);
    if (details.upi_number) lines.push(`UPI Number: ${details.upi_number}`);
  }

  lines.push('');
  lines.push('Thank you');

  return lines.join('\n');
}

function hasAnyDetail(d: PaymentAccountDetails): boolean {
  return Boolean(
    d.account_holder_name || d.account_number || d.ifsc_code || d.upi_number || d.bank_name
  );
}

export function openWhatsApp(text: string): void {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
