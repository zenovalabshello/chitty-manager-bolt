import { useEffect, useState, useCallback } from 'react';
import { Loader2, Download, HandCoins, CheckCircle2, Clock, User, Link2, Pencil } from 'lucide-react';
import type { Chitty } from '@/lib/chitties';
import type { Member, MemberPair } from '@/lib/members';
import type { Draw } from '@/lib/draws';
import type { PayoutWithDetails, PayoutStatus } from '@/lib/payouts';
import { fetchPayoutsForChitty, ensurePayoutsForDraws, updatePayout, effectiveTotalPayout, effectiveMemberPayout } from '@/lib/payouts';
import { generatePayoutReceiptImage } from '@/lib/payoutReceipt';
import { supabase } from '@/lib/supabase';
import { formatDate, formatCurrency } from '@/components/ChittyCard';
import { Placeholder } from '@/components/chitty-detail/Placeholder';
import { recordActivity } from '@/lib/activities';

interface ChittyPayoutTabProps {
  chitty: Chitty;
}

export default function ChittyPayoutTab({ chitty }: ChittyPayoutTabProps) {
  const [payouts, setPayouts] = useState<PayoutWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPayout, setEditingPayout] = useState<PayoutWithDetails | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [drawsRes, membersRes, pairsRes] = await Promise.all([
      supabase.from('draws').select('*').eq('chitty_id', chitty.id).order('cycle_number', { ascending: true }),
      supabase.from('members').select('*').eq('chitty_id', chitty.id),
      supabase.from('member_pairs').select('*').eq('chitty_id', chitty.id),
    ]);

    if (drawsRes.error || membersRes.error || pairsRes.error) {
      setError('Could not load payout data.');
      setLoading(false);
      return;
    }

    const memberList = (membersRes.data as Member[]) ?? [];
    const pairList = (pairsRes.data as MemberPair[]) ?? [];
    const drawList = (drawsRes.data as Draw[]) ?? [];

    const pairsWithMembers = pairList.map((pair) => ({
      pair,
      member1: memberList.find((m) => m.id === pair.member1_id)!,
      member2: memberList.find((m) => m.id === pair.member2_id)!,
    }));

    // Auto-create payout records for completed draws that don't have one yet
    const { error: ensureErr } = await ensurePayoutsForDraws(chitty, drawList, memberList, pairsWithMembers);
    if (ensureErr) {
      setError('Could not initialize payout records.');
      setLoading(false);
      return;
    }

    const { data, error: fetchErr } = await fetchPayoutsForChitty(chitty.id);
    if (fetchErr) {
      setError('Could not load payouts.');
      setLoading(false);
      return;
    }

    setPayouts(data ?? []);
    setLoading(false);
  }, [chitty]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownload = (payout: PayoutWithDetails) => {
    generatePayoutReceiptImage({ chitty, payout });
  };

  const handleSavePayout = async (payoutId: string, payoutDate: string, status: PayoutStatus, note: string, customAmount: number | null) => {
    const { error: updateErr } = await updatePayout(payoutId, {
      payout_date: payoutDate || null,
      status,
      note: note || null,
      custom_payout_amount: customAmount,
    });
    if (updateErr) {
      setError('Could not save payout details.');
      return;
    }
    const oldPayout = payouts.find((p) => p.id === payoutId);
    if (oldPayout && oldPayout.status !== status) {
      const isPair = oldPayout.winner_type === 'pair';
      const winnerName = isPair
        ? `${oldPayout.winnerMember1?.name ?? '?'} + ${oldPayout.winnerMember2?.name ?? '?'}`
        : oldPayout.winnerMember?.name ?? 'Unknown';
      if (oldPayout.status === 'pending' && status === 'paid') {
        await recordActivity(chitty.id, 'payout_recorded', `Payout for Cycle ${oldPayout.cycle_number} (${winnerName}) was marked as paid.`, { cycle_number: oldPayout.cycle_number, winner_name: winnerName });
      } else {
        await recordActivity(chitty.id, 'payout_status_changed', `Payout status for Cycle ${oldPayout.cycle_number} (${winnerName}) changed from ${oldPayout.status} to ${status}.`, { cycle_number: oldPayout.cycle_number, winner_name: winnerName, old_status: oldPayout.status, new_status: status });
      }
    }
    setEditingPayout(null);
    loadData();
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-2 px-6 py-16 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading payouts…
      </div>
    );
  }

  if (error) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button onClick={loadData} className="btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  if (payouts.length === 0) {
    return (
      <Placeholder
        icon={HandCoins}
        title="No payouts yet"
        message="Payout records are created automatically when draws are completed. Run a draw to get started."
      />
    );
  }

  const paidCount = payouts.filter((p) => p.status === 'paid').length;
  const pendingCount = payouts.filter((p) => p.status === 'pending').length;
  const totalAmount = payouts.reduce((sum, p) => sum + effectiveTotalPayout(p), 0);

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs font-medium text-neutral-400">Total Payouts</p>
          <p className="mt-1 text-lg font-bold">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-neutral-400">Paid</p>
          <p className="mt-1 text-lg font-bold text-green-600 dark:text-green-400">{paidCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-neutral-400">Pending</p>
          <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
        </div>
      </div>

      {/* Payout history list */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <HandCoins className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            Payout History ({payouts.length})
          </h3>
        </div>

        {payouts.map((payout) => (
          <PayoutRow
            key={payout.id}
            payout={payout}
            onDownload={() => handleDownload(payout)}
            onEdit={() => setEditingPayout(payout)}
          />
        ))}
      </div>

      {editingPayout && (
        <EditPayoutModal
          payout={editingPayout}
          onClose={() => setEditingPayout(null)}
          onSave={handleSavePayout}
        />
      )}
    </div>
  );
}

function PayoutRow({
  payout,
  onDownload,
  onEdit,
}: {
  payout: PayoutWithDetails;
  onDownload: () => void;
  onEdit: () => void;
}) {
  const isPair = payout.winner_type === 'pair';
  const winnerName = isPair
    ? `${payout.winnerMember1?.name ?? '?'} + ${payout.winnerMember2?.name ?? '?'}`
    : payout.winnerMember?.name ?? 'Unknown';

  const statusIcon =
    payout.status === 'paid' ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <Clock className="h-4 w-4 text-amber-500" />
    );

  const statusLabel = payout.status === 'paid' ? 'Paid' : 'Pending';
  const statusColor =
    payout.status === 'paid'
      ? 'text-green-600 dark:text-green-400'
      : 'text-amber-600 dark:text-amber-400';

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
            <span className="text-sm font-bold">#{payout.cycle_number}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isPair ? (
                <Link2 className="h-4 w-4 shrink-0 text-brand-500" />
              ) : (
                <User className="h-4 w-4 shrink-0 text-brand-500" />
              )}
              <p className="truncate text-sm font-semibold">{winnerName}</p>
            </div>
            <p className="mt-0.5 text-xs text-neutral-400">
              Cycle {payout.cycle_number}
              {payout.payout_date && ` · ${formatDate(payout.payout_date)}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${statusColor}`}>
            {statusIcon}
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-400">
            {payout.custom_payout_amount != null ? 'Custom Payout' : 'Total Payout'}
          </span>
          <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
            {formatCurrency(effectiveTotalPayout(payout))}
          </span>
        </div>
        {payout.custom_payout_amount == null && isPair && (
          <div className="mt-2 space-y-1 border-t border-neutral-200 pt-2 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">{payout.winnerMember1?.name ?? 'Member 1'}</span>
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(effectiveMemberPayout(payout, 1))}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">{payout.winnerMember2?.name ?? 'Member 2'}</span>
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(effectiveMemberPayout(payout, 2))}
              </span>
            </div>
          </div>
        )}
        {payout.note && (
          <p className="mt-2 border-t border-neutral-200 pt-2 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            Note: {payout.note}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
        >
          <Pencil className="h-3 w-3" />
          {payout.status === 'pending' ? 'Record Payout' : 'Edit'}
        </button>
        <button
          onClick={onDownload}
          className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
        >
          <Download className="h-3 w-3" />
          Download
        </button>
      </div>
    </div>
  );
}

function EditPayoutModal({
  payout,
  onClose,
  onSave,
}: {
  payout: PayoutWithDetails;
  onClose: () => void;
  onSave: (payoutId: string, payoutDate: string, status: PayoutStatus, note: string, customAmount: number | null) => void;
}) {
  const [payoutDate, setPayoutDate] = useState(
    payout.payout_date ? payout.payout_date.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<PayoutStatus>(payout.status);
  const [note, setNote] = useState(payout.note ?? '');
  const [customAmount, setCustomAmount] = useState(
    payout.custom_payout_amount != null ? String(payout.custom_payout_amount) : ''
  );
  const [saving, setSaving] = useState(false);

  const isPair = payout.winner_type === 'pair';
  const winnerName = isPair
    ? `${payout.winnerMember1?.name ?? '?'} + ${payout.winnerMember2?.name ?? '?'}`
    : payout.winnerMember?.name ?? 'Unknown';

  const handleSubmit = async () => {
    setSaving(true);
    const parsed = customAmount.trim() === '' ? null : parseFloat(customAmount);
    await onSave(payout.id, payoutDate, status, note, parsed);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl dark:bg-neutral-900 sm:rounded-2xl">
        <div className="mb-4">
          <h2 className="text-lg font-bold">Payout Details</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Cycle {payout.cycle_number} · {winnerName}
          </p>
        </div>

        <div className="space-y-4">
          {/* Default payout display (read-only) */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400">Default Payout</span>
              <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300">
                {formatCurrency(Number(payout.total_payout))}
              </span>
            </div>
            {isPair && (
              <div className="mt-2 space-y-1 border-t border-neutral-200 pt-2 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">{payout.winnerMember1?.name ?? 'Member 1'}</span>
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(Number(payout.member1_payout ?? 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">{payout.winnerMember2?.name ?? 'Member 2'}</span>
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(Number(payout.member2_payout ?? 0))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Custom payout amount (optional) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Custom Payout Amount (optional)</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Leave empty to use default"
              className="input w-full"
            />
            <p className="mt-1 text-xs text-neutral-400">
              {customAmount.trim() === ''
                ? 'Using default payout amount.'
                : `Actual payout will be ${formatCurrency(parseFloat(customAmount) || 0)}`}
            </p>
          </div>

          {/* Payout date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Payout Date</label>
            <input
              type="date"
              value={payoutDate}
              onChange={(e) => setPayoutDate(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Status</label>
            <div className="flex gap-2">
              <button
                onClick={() => setStatus('pending')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  status === 'pending'
                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                    : 'border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatus('paid')}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  status === 'paid'
                    ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/50 dark:text-green-400'
                    : 'border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400'
                }`}
              >
                Paid
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add a note..."
              className="input w-full resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
