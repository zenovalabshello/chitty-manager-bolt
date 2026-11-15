import { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  Loader2,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Users,
  TrendingUp,
  Download,
  Share2,
} from 'lucide-react';
import type { Chitty } from '@/lib/chitties';
import type { Member } from '@/lib/members';
import type { Payment, MemberCycleStatus } from '@/lib/payments';
import { expectedInstallment, computeStatus } from '@/lib/payments';
import { generateReceiptImage } from '@/lib/receipt';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/components/ChittyCard';
import PaymentModal from '@/components/PaymentModal';
import { Placeholder } from '@/components/chitty-detail/Placeholder';
import { buildWhatsAppMessage, openWhatsApp } from '@/lib/whatsappShare';

interface ChittyInstallmentsTabProps {
  chitty: Chitty;
}

interface CycleData {
  number: number;
  dueDate: string;
  statuses: MemberCycleStatus[];
  expectedTotal: number;
  collectedTotal: number;
  pendingTotal: number;
}

export default function ChittyInstallmentsTab({ chitty }: ChittyInstallmentsTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCycle, setExpandedCycle] = useState<number | null>(null);
  const [paymentModal, setPaymentModal] = useState<{
    cycle: number;
    member: Member;
    payments: Payment[];
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [membersRes, paymentsRes] = await Promise.all([
      supabase.from('members').select('*').eq('chitty_id', chitty.id).order('created_at', { ascending: true }),
      supabase.from('payments').select('*').eq('chitty_id', chitty.id).order('collection_date', { ascending: true }),
    ]);

    if (membersRes.error || paymentsRes.error) {
      setError('Could not load installment data.');
      setLoading(false);
      return;
    }

    setMembers((membersRes.data as Member[]) ?? []);
    setPayments((paymentsRes.data as Payment[]) ?? []);
    setLoading(false);
  }, [chitty.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const buildCycleData = useCallback((): CycleData[] => {
    const cycles: CycleData[] = [];
    const startDate = new Date(chitty.start_date);

    for (let i = 1; i <= chitty.cycles_count; i++) {
      const dueDate = new Date(startDate);
      if (chitty.frequency === 'monthly') {
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
      } else {
        dueDate.setDate(dueDate.getDate() + (i - 1) * 30);
      }

      const statuses: MemberCycleStatus[] = members.map((member) => {
        const expected = expectedInstallment(chitty.installment_amount, member);
        const memberPayments = payments.filter(
          (p) => p.member_id === member.id && p.cycle_number === i
        );
        const paid = memberPayments.reduce((sum, p) => sum + p.amount, 0);
        const pending = Math.max(0, expected - paid);
        return {
          member,
          expected,
          paid,
          pending,
          status: computeStatus(paid, expected),
          payments: memberPayments,
        };
      });

      const expectedTotal = statuses.reduce((s, st) => s + st.expected, 0);
      const collectedTotal = statuses.reduce((s, st) => s + st.paid, 0);
      const pendingTotal = statuses.reduce((s, st) => s + st.pending, 0);

      cycles.push({
        number: i,
        dueDate: dueDate.toISOString().slice(0, 10),
        statuses,
        expectedTotal,
        collectedTotal,
        pendingTotal,
      });
    }
    return cycles;
  }, [chitty, members, payments]);

  const cycles = buildCycleData();

  const handlePaymentSaved = () => {
    setPaymentModal(null);
    loadData();
  };

  const openPaymentModal = (cycle: number, member: Member, memberPayments: Payment[]) => {
    setPaymentModal({ cycle, member, payments: memberPayments });
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-2 px-6 py-16 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading installments…
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

  if (members.length === 0) {
    return (
      <Placeholder
        icon={Receipt}
        title="No members yet"
        message="Add members to this Chitty first. The installment schedule will appear here once members are added."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard icon={Receipt} label="Cycles" value={String(chitty.cycles_count)} />
        <SummaryCard icon={Users} label="Members" value={String(members.length)} />
        <SummaryCard
          icon={TrendingUp}
          label="Total expected"
          value={formatCurrency(cycles.reduce((s, c) => s + c.expectedTotal, 0))}
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Total collected"
          value={formatCurrency(cycles.reduce((s, c) => s + c.collectedTotal, 0))}
        />
      </div>

      {/* Cycle cards */}
      {cycles.map((cycle) => {
        const expanded = expandedCycle === cycle.number;
        const paidCount = cycle.statuses.filter((s) => s.status === 'paid').length;
        const partialCount = cycle.statuses.filter((s) => s.status === 'partial').length;
        const pendingCount = cycle.statuses.filter((s) => s.status === 'pending').length;
        const collectionPercent = cycle.expectedTotal > 0
          ? Math.round((cycle.collectedTotal / cycle.expectedTotal) * 100)
          : 0;

        return (
          <div key={cycle.number} className="card overflow-hidden">
            {/* Cycle header */}
            <button
              onClick={() => setExpandedCycle(expanded ? null : cycle.number)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            >
              <div className="flex items-center gap-3">
                {expanded ? (
                  <ChevronDown className="h-5 w-5 shrink-0 text-neutral-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Cycle {cycle.number}</span>
                    <CycleStatusBadge
                      paidCount={paidCount}
                      partialCount={partialCount}
                      pendingCount={pendingCount}
                      total={cycle.statuses.length}
                    />
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-400">
                    <Calendar className="h-3 w-3" />
                    Due {formatDate(cycle.dueDate)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCurrency(cycle.collectedTotal)}</p>
                <p className="text-xs text-neutral-400">of {formatCurrency(cycle.expectedTotal)}</p>
              </div>
            </button>

            {/* Progress bar */}
            <div className="px-5 pb-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${collectionPercent}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-neutral-400">
                <span>{collectionPercent}% collected</span>
                <span>{formatCurrency(cycle.pendingTotal)} pending</span>
              </div>
            </div>

            {/* Expanded member list */}
            {expanded && (
              <div className="border-t border-neutral-200 dark:border-neutral-800">
                <div className="px-5 py-3">
                  {/* Legend */}
                  <div className="mb-3 flex flex-wrap gap-3 text-xs">
                    <LegendItem color="green" label={`Paid (${paidCount})`} />
                    <LegendItem color="amber" label={`Partial (${partialCount})`} />
                    <LegendItem color="neutral" label={`Pending (${pendingCount})`} />
                  </div>

                  <div className="space-y-2">
                    {cycle.statuses.map((st) => (
                      <MemberPaymentRow
                        key={st.member.id}
                        status={st}
                        chitty={chitty}
                        cycleNumber={cycle.number}
                        onRecordPayment={() =>
                          openPaymentModal(cycle.number, st.member, st.payments)
                        }
                      />
                    ))}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => {
                        const text = buildWhatsAppMessage(chitty, cycle.number, cycle.dueDate, cycle.statuses);
                        openWhatsApp(text);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100 dark:bg-green-950/50 dark:text-green-400 dark:hover:bg-green-900/50"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share on WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {paymentModal && (
        <PaymentModal
          open={!!paymentModal}
          chittyId={chitty.id}
          installmentAmount={chitty.installment_amount}
          cycleNumber={paymentModal.cycle}
          member={paymentModal.member}
          existingPayments={paymentModal.payments}
          onClose={() => setPaymentModal(null)}
          onSaved={handlePaymentSaved}
        />
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof Receipt; label: string; value: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-neutral-400" />
        <p className="text-xs text-neutral-400">{label}</p>
      </div>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}

function CycleStatusBadge({
  paidCount,
  partialCount,
  pendingCount,
  total,
}: {
  paidCount: number;
  partialCount: number;
  pendingCount: number;
  total: number;
}) {
  let label: string;
  let className: string;

  if (paidCount === total) {
    label = 'Fully collected';
    className = 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400';
  } else if (paidCount > 0 || partialCount > 0) {
    label = 'In progress';
    className = 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400';
  } else {
    label = 'Not started';
    className = 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400';
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {label}
    </span>
  );
}

function LegendItem({ color, label }: { color: 'green' | 'amber' | 'neutral'; label: string }) {
  const colors = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    neutral: 'bg-neutral-300 dark:bg-neutral-600',
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${colors[color]}`} />
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
    </div>
  );
}

function MemberPaymentRow({
  status,
  chitty,
  cycleNumber,
  onRecordPayment,
}: {
  status: MemberCycleStatus;
  chitty: Chitty;
  cycleNumber: number;
  onRecordPayment: () => void;
}) {
  const { member, expected, paid, pending, status: payStatus } = status;
  const handleDownload = () => {
    generateReceiptImage({ chitty, status, cycleNumber });
  };
  const percent = expected > 0 ? Math.min(100, Math.round((paid / expected) * 100)) : 0;

  const statusIcon = {
    paid: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    partial: <Clock className="h-4 w-4 text-amber-500" />,
    pending: <AlertCircle className="h-4 w-4 text-neutral-300 dark:text-neutral-600" />,
  }[payStatus];

  const statusLabel = {
    paid: 'Paid',
    partial: 'Partial',
    pending: 'Pending',
  }[payStatus];

  const statusColor = {
    paid: 'text-green-600 dark:text-green-400',
    partial: 'text-amber-600 dark:text-amber-400',
    pending: 'text-neutral-400',
  }[payStatus];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {statusIcon}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{member.name}</p>
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                member.membership_type === 'half'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
              }`}
            >
              {member.membership_type === 'half' ? 'Half' : 'Full'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className={`h-full rounded-full transition-all ${
                  payStatus === 'paid' ? 'bg-green-500' : payStatus === 'partial' ? 'bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${statusColor}`}>
              {statusLabel} · {formatCurrency(paid)} / {formatCurrency(expected)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {pending > 0 && (
          <span className="text-xs text-neutral-400">{formatCurrency(pending)} due</span>
        )}
        <button
          onClick={onRecordPayment}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
        >
          <Plus className="h-3 w-3" />
          {payStatus === 'pending' ? 'Record' : 'Add'}
        </button>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
        >
          <Download className="h-3 w-3" />
          Receipt
        </button>
      </div>
    </div>
  );
}
