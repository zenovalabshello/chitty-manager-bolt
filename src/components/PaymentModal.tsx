import { useState, useEffect } from 'react';
import { X, Loader2, IndianRupee } from 'lucide-react';
import type { Member } from '@/lib/members';
import type { Payment } from '@/lib/payments';
import { expectedInstallment } from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/components/ChittyCard';
import { recordActivity } from '@/lib/activities';

interface PaymentModalProps {
  open: boolean;
  chittyId: string;
  installmentAmount: number;
  cycleNumber: number;
  member: Member | null;
  existingPayments: Payment[];
  onClose: () => void;
  onSaved: () => void;
}

export default function PaymentModal({
  open,
  chittyId,
  installmentAmount,
  cycleNumber,
  member,
  existingPayments,
  onClose,
  onSaved,
}: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expected = member ? expectedInstallment(installmentAmount, member) : 0;
  const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, expected - totalPaid);

  useEffect(() => {
    if (open) {
      setAmount('');
      setCollectionDate(new Date().toISOString().slice(0, 10));
      setError(null);
    }
  }, [open]);

  if (!open || !member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    if (!collectionDate) {
      setError('Collection date is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from('payments').insert({
      chitty_id: chittyId,
      member_id: member.id,
      cycle_number: cycleNumber,
      amount: amt,
      collection_date: collectionDate,
    });

    setSubmitting(false);
    if (insertError) {
      setError('Could not record the payment. Please try again.');
      return;
    }
    await recordActivity(chittyId, 'payment_recorded', `Payment of ${formatCurrency(amt)} recorded for "${member.name}" (Cycle ${cycleNumber}).`, { member_name: member.name, amount: amt, cycle_number: cycleNumber });
    onSaved();
  };

  const quickFill = (value: number) => {
    setAmount(String(value));
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-soft-lg animate-scale-in dark:bg-neutral-900 sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Record payment</h2>
          <button
            onClick={() => !submitting && onClose()}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="mb-4 space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">Member</span>
            <span className="font-medium">{member.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">Membership</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                member.membership_type === 'half'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
              }`}
            >
              {member.membership_type === 'half' ? 'Half' : 'Full'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">Cycle</span>
            <span className="font-medium">#{cycleNumber}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">Expected</span>
            <span className="font-medium">{formatCurrency(expected)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">Already paid</span>
            <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-sm dark:border-neutral-700">
            <span className="font-medium text-neutral-600 dark:text-neutral-300">Remaining</span>
            <span className="font-bold text-brand-600 dark:text-brand-400">{formatCurrency(remaining)}</span>
          </div>
        </div>

        {existingPayments.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-neutral-400">Previous payments</p>
            <div className="space-y-1.5">
              {existingPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-800/50"
                >
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {new Date(p.collection_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Payment amount
            </label>
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="0.00"
                className="input pl-9"
              />
            </div>
            {remaining > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => quickFill(remaining)}
                  className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
                >
                  Full remaining ({formatCurrency(remaining)})
                </button>
                <button
                  type="button"
                  onClick={() => quickFill(Math.round(remaining / 2 * 100) / 100)}
                  className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                >
                  Half remaining
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Collection date
            </label>
            <input
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              className="input"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={() => !submitting && onClose()} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                'Record payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
