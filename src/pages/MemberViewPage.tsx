import { useEffect, useState } from 'react';
import {
  Loader2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trophy,
  Wallet,
  Users,
  Info,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import type { MemberViewData } from '@/lib/memberView';
import Logo from '@/components/Logo';
import { useTheme } from '@/theme/ThemeProvider';
import { Moon, Sun } from 'lucide-react';

interface MemberViewPageProps {
  token: string;
}

export default function MemberViewPage({ token }: MemberViewPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [data, setData] = useState<MemberViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/member-view?token=${encodeURIComponent(token)}`;
    fetch(url, {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'Could not load your view');
        }
        return res.json();
      })
      .then((json) => {
        if (!active) return;
        setData(json as MemberViewData);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (!active) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 px-4 dark:bg-neutral-950">
        <Logo className="h-12 w-12" />
        <p className="text-sm text-red-600 dark:text-red-400">{error ?? 'Could not load your view'}</p>
        <p className="text-xs text-neutral-400">This personal link may be invalid or expired.</p>
      </div>
    );
  }

  const v = data.visibility;
  const memberName = data.member.name;
  const isHalf = data.member.membership_type === 'half';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/80 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="text-base font-semibold tracking-tight">Chitty Manager</span>
          </div>
          <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Greeting */}
        <div className="mb-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Hello,</p>
          <h1 className="text-2xl font-bold tracking-tight">{memberName}</h1>
          {isHalf && (
            <span className="mt-1 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              Half member
            </span>
          )}
          {!isHalf && (
            <span className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
              Full member
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* Chitty info */}
          {v.chitty_info && data.chitty && <ChittyInfoCard chitty={data.chitty} />}

          {/* Own details */}
          {v.own_details && <OwnDetailsCard member={data.member} />}

          {/* Installment info */}
          {v.installment_info && data.installment && <InstallmentCard installment={data.installment} />}

          {/* Payment status */}
          {v.own_pending_amount && data.pending_amount && <PaymentStatusCard cycles={data.pending_amount} />}

          {/* Payment history */}
          {v.own_payment_history && data.payment_history && <PaymentHistoryCard history={data.payment_history} />}

          {/* Draw status */}
          {v.draw_status && data.draw_status && <DrawStatusCard status={data.draw_status} />}

          {/* Draw history */}
          {v.draw_history && data.draw_history && (
            <DrawHistoryCard history={data.draw_history} showWinner={v.winner_info} />
          )}

          {/* Payout info */}
          {v.payout_info && data.payouts && <PayoutCard payouts={data.payouts} />}

          {/* Other members */}
          {v.other_members && data.other_members && <OtherMembersCard members={data.other_members} />}

          {/* Nothing visible */}
          {!v.chitty_info && !v.own_details && !v.installment_info && !v.own_payment_history && !v.own_pending_amount && !v.draw_status && !v.draw_history && !v.payout_info && !v.other_members && (
            <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
              <Info className="h-8 w-8 text-neutral-400" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                The organizer has not enabled any visible information for this Chitty yet.
              </p>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-neutral-400">
          This is a read-only personal view. For any changes, please contact your Chitty organizer.
        </p>
      </main>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }: { icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function ChittyInfoCard({ chitty }: { chitty: NonNullable<MemberViewData['chitty']> }) {
  return (
    <SectionCard icon={Info} title="Chitty Information">
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
        <InfoRow label="Name" value={chitty.name} />
        {chitty.description && <InfoRow label="Description" value={chitty.description} />}
        <InfoRow label="Installment amount" value={formatCurrency(chitty.installment_amount)} />
        <InfoRow label="Members" value={String(chitty.members_count)} />
        <InfoRow label="Cycles" value={String(chitty.cycles_count)} />
        <InfoRow label="Frequency" value={chitty.frequency === 'monthly' ? 'Monthly' : 'Custom'} />
        <InfoRow label="Start date" value={formatDate(chitty.start_date)} />
        <InfoRow label="Selection method" value={chitty.selection_method === 'lucky_draw' ? 'Lucky Draw' : 'Manual'} />
        <InfoRow label="Status" value={chitty.status.charAt(0).toUpperCase() + chitty.status.slice(1)} />
        {chitty.rules && (
          <div className="pt-2">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Rules</span>
            <p className="mt-1 text-sm">{chitty.rules}</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function OwnDetailsCard({ member }: { member: MemberViewData['member'] }) {
  return (
    <SectionCard icon={Users} title="My Details">
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
        <InfoRow label="Name" value={member.name} />
        <InfoRow label="Membership" value={member.membership_type === 'half' ? 'Half' : 'Full'} />
        {member.place && <InfoRow label="Place" value={member.place} />}
        {member.job && <InfoRow label="Job" value={member.job} />}
      </div>
    </SectionCard>
  );
}

function InstallmentCard({ installment }: { installment: NonNullable<MemberViewData['installment']> }) {
  return (
    <SectionCard icon={Wallet} title="Installment Information">
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
        <InfoRow label="My installment" value={formatCurrency(installment.amount)} />
        <InfoRow label="Total cycles" value={String(installment.cycles_count)} />
        <InfoRow label="Frequency" value={installment.frequency === 'monthly' ? 'Monthly' : 'Custom'} />
        <InfoRow label="Start date" value={formatDate(installment.start_date)} />
      </div>
    </SectionCard>
  );
}

function PaymentStatusCard({ cycles }: { cycles: NonNullable<MemberViewData['pending_amount']> }) {
  const totalPaid = cycles.reduce((s, c) => s + c.paid, 0);
  const totalPending = cycles.reduce((s, c) => s + c.pending, 0);
  return (
    <SectionCard icon={TrendingUp} title="My Payment Status">
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-green-50 px-3 py-2.5 dark:bg-green-950/30">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Total paid</p>
          <p className="mt-0.5 text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl bg-red-50 px-3 py-2.5 dark:bg-red-950/30">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Total pending</p>
          <p className="mt-0.5 text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(totalPending)}</p>
        </div>
      </div>
      <div className="space-y-2">
        {cycles.map((c) => {
          const statusIcon = c.status === 'paid' ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : c.status === 'partial' ? (
            <Clock className="h-4 w-4 text-amber-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-neutral-300 dark:text-neutral-600" />
          );
          const statusLabel = c.status.charAt(0).toUpperCase() + c.status.slice(1);
          const statusColor = c.status === 'paid' ? 'text-green-600 dark:text-green-400' : c.status === 'partial' ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400';
          const percent = c.expected > 0 ? Math.min(100, Math.round((c.paid / c.expected) * 100)) : 0;
          return (
            <div key={c.cycle} className="flex items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
              {statusIcon}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Cycle {c.cycle}</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div className={`h-full rounded-full ${c.status === 'paid' ? 'bg-green-500' : c.status === 'partial' ? 'bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-600'}`} style={{ width: `${percent}%` }} />
                  </div>
                  <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium">{formatCurrency(c.paid)} / {formatCurrency(c.expected)}</p>
                {c.pending > 0 && <p className="text-xs text-neutral-400">{formatCurrency(c.pending)} due</p>}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function PaymentHistoryCard({ history }: { history: NonNullable<MemberViewData['payment_history']> }) {
  if (history.length === 0) {
    return (
      <SectionCard icon={Receipt} title="My Payment History">
        <p className="text-sm text-neutral-400">No payments recorded yet.</p>
      </SectionCard>
    );
  }
  return (
    <SectionCard icon={Receipt} title="My Payment History">
      <div className="space-y-2">
        {history.map((p, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Cycle {p.cycle}</p>
                <p className="text-xs text-neutral-400">{formatDate(p.date)}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(p.amount)}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function DrawStatusCard({ status }: { status: NonNullable<MemberViewData['draw_status']> }) {
  return (
    <SectionCard icon={Trophy} title="Draw Status">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-neutral-50 px-3 py-2.5 text-center dark:bg-neutral-800/50">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Completed</p>
          <p className="mt-0.5 text-lg font-bold">{status.completed_count}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 px-3 py-2.5 text-center dark:bg-neutral-800/50">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Total</p>
          <p className="mt-0.5 text-lg font-bold">{status.total_cycles}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 px-3 py-2.5 text-center dark:bg-neutral-800/50">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Next</p>
          <p className="mt-0.5 text-lg font-bold">{status.next_cycle ?? '-'}</p>
        </div>
      </div>
    </SectionCard>
  );
}

function DrawHistoryCard({ history, showWinner }: { history: NonNullable<MemberViewData['draw_history']>; showWinner: boolean }) {
  return (
    <SectionCard icon={Calendar} title="Draw History">
      <div className="space-y-2">
        {history.map((d) => (
          <div key={d.cycle} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Cycle {d.cycle}</p>
                <p className="text-xs text-neutral-400">{formatDate(d.drawn_at)}</p>
              </div>
            </div>
            {showWinner && d.winner_name && (
              <span className="text-sm font-medium">{d.winner_name}</span>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function PayoutCard({ payouts }: { payouts: NonNullable<MemberViewData['payouts']> }) {
  if (payouts.length === 0) {
    return (
      <SectionCard icon={Wallet} title="Payout Information">
        <p className="text-sm text-neutral-400">No payouts recorded yet.</p>
      </SectionCard>
    );
  }
  return (
    <SectionCard icon={Wallet} title="Payout Information">
      <div className="space-y-2">
        {payouts.map((p) => (
          <div key={p.cycle} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
            <div>
              <p className="text-sm font-medium">Cycle {p.cycle}</p>
              {p.winner_name && <p className="text-xs text-neutral-400">Winner: {p.winner_name}</p>}
              {p.payout_date && <p className="text-xs text-neutral-400">Paid: {formatDate(p.payout_date)}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{formatCurrency(p.total_payout)}</p>
              <span className={`text-xs font-medium ${p.status === 'paid' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {p.status === 'paid' ? 'Paid' : 'Pending'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function OtherMembersCard({ members }: { members: NonNullable<MemberViewData['other_members']> }) {
  return (
    <SectionCard icon={Users} title="Other Members">
      <div className="space-y-2">
        {members.map((m, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl border border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{m.name}</p>
              <span className={`text-xs ${m.membership_type === 'half' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {m.membership_type === 'half' ? 'Half' : 'Full'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
