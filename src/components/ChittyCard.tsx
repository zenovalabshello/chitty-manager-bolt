import type { ChittyStatus } from '@/lib/chitties';

export function ChittyStatusBadge({ status }: { status: ChittyStatus }) {
  const styles: Record<ChittyStatus, string> = {
    draft:
      'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    active:
      'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
    completed:
      'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    cancelled:
      'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  };
  const labels: Record<ChittyStatus, string> = {
    draft: 'Draft',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}
