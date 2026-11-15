import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  Loader2,
  Users,
  Link2,
  Trophy,
  Wallet,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import type { Chitty } from '@/lib/chitties';
import type { Member, MemberPair } from '@/lib/members';
import type { Payment } from '@/lib/payments';
import type { Draw } from '@/lib/draws';
import type { Payout } from '@/lib/payouts';
import { effectiveTotalPayout } from '@/lib/payouts';
import { supabase } from '@/lib/supabase';
import { ChittyStatusBadge, formatCurrency } from '@/components/ChittyCard';

export default function Reports() {
  const [chitties, setChitties] = useState<Chitty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChittyId, setSelectedChittyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from('chitties')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        setChitties((data as Chitty[]) ?? []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading reports…
      </div>
    );
  }

  if (chitties.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Reports</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Summaries of collections, payouts, and draw history across your Chitties.
          </p>
        </div>
        <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <BarChart3 className="h-7 w-7" />
          </div>
          <div className="max-w-sm space-y-1.5">
            <h2 className="text-lg font-semibold">No reports available</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Reports are generated once you have at least one Chitty with recorded
              installments and payouts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selectedChitty = chitties.find((c) => c.id === selectedChittyId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Reports</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Summaries of collections, payouts, and draw history across your Chitties.
        </p>
      </div>

      <OverviewReport chitties={chitties} />

      <ChittySelector
        chitties={chitties}
        selectedId={selectedChittyId}
        onSelect={setSelectedChittyId}
      />

      {selectedChitty && <ChittyReport chitty={selectedChitty} />}
    </div>
  );
}

/* ── Overview ────────────────────────────────────────────────── */

interface OverviewData {
  totalChitties: number;
  activeChitties: number;
  completedChitties: number;
  totalMembers: number;
  totalDrawUnits: number;
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  totalPayouts: number;
  pendingPayouts: number;
}

function OverviewReport({ chitties }: { chitties: Chitty[] }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const chittyIds = chitties.map((c) => c.id);
      if (chittyIds.length === 0) {
        setData({
          totalChitties: 0,
          activeChitties: 0,
          completedChitties: 0,
          totalMembers: 0,
          totalDrawUnits: 0,
          totalExpected: 0,
          totalCollected: 0,
          totalPending: 0,
          totalPayouts: 0,
          pendingPayouts: 0,
        });
        setLoading(false);
        return;
      }

      const [membersRes, pairsRes, paymentsRes, payoutsRes] = await Promise.all([
        supabase.from('members').select('id, chitty_id, membership_type').in('chitty_id', chittyIds),
        supabase.from('member_pairs').select('id, chitty_id').in('chitty_id', chittyIds),
        supabase.from('payments').select('chitty_id, member_id, cycle_number, amount').in('chitty_id', chittyIds),
        supabase.from('payouts').select('chitty_id, total_payout, custom_payout_amount, status').in('chitty_id', chittyIds),
      ]);

      if (!active) return;

      const members = (membersRes.data as Pick<Member, 'id' | 'chitty_id' | 'membership_type'>[]) ?? [];
      const pairs = (pairsRes.data as Pick<MemberPair, 'id' | 'chitty_id'>[]) ?? [];
      const payments = (paymentsRes.data as Pick<Payment, 'chitty_id' | 'member_id' | 'cycle_number' | 'amount'>[]) ?? [];
      const payouts = (payoutsRes.data as Pick<Payout, 'chitty_id' | 'total_payout' | 'custom_payout_amount' | 'status'>[]) ?? [];

      const fullByChitty = new Map<string, number>();
      const pairsByChitty = new Map<string, number>();
      for (const m of members) {
        if (m.membership_type === 'full') {
          fullByChitty.set(m.chitty_id, (fullByChitty.get(m.chitty_id) ?? 0) + 1);
        }
      }
      for (const p of pairs) {
        pairsByChitty.set(p.chitty_id, (pairsByChitty.get(p.chitty_id) ?? 0) + 1);
      }

      let totalExpected = 0;
      let totalCollected = 0;
      let totalPayouts = 0;
      let pendingPayouts = 0;

      for (const chitty of chitties) {
        const fullCount = fullByChitty.get(chitty.id) ?? 0;
        const pairCount = pairsByChitty.get(chitty.id) ?? 0;
        const drawUnits = fullCount + pairCount;
        const perCycleExpected = drawUnits * chitty.installment_amount;
        totalExpected += perCycleExpected * chitty.cycles_count;
      }

      totalCollected = payments.reduce((s, p) => s + p.amount, 0);

      for (const p of payouts) {
        totalPayouts += effectiveTotalPayout(p);
        if (p.status === 'pending') pendingPayouts += effectiveTotalPayout(p);
      }

      const totalPending = Math.max(0, totalExpected - totalCollected);

      setData({
        totalChitties: chitties.length,
        activeChitties: chitties.filter((c) => c.status === 'active').length,
        completedChitties: chitties.filter((c) => c.status === 'completed').length,
        totalMembers: members.length,
        totalDrawUnits: members.filter((m) => m.membership_type === 'full').length + pairs.length,
        totalExpected,
        totalCollected,
        totalPending,
        totalPayouts,
        pendingPayouts,
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [chitties]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Calculating overview…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Overview</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Chitties" value={String(data.totalChitties)} />
        <StatCard label="Active" value={String(data.activeChitties)} />
        <StatCard label="Completed" value={String(data.completedChitties)} />
        <StatCard label="Total Members" value={String(data.totalMembers)} />
        <StatCard label="Draw Units" value={String(data.totalDrawUnits)} />
        <StatCard label="Expected Collections" value={formatCurrency(data.totalExpected)} />
        <StatCard label="Collected" value={formatCurrency(data.totalCollected)} accent="green" />
        <StatCard label="Pending" value={formatCurrency(data.totalPending)} accent={data.totalPending > 0 ? 'amber' : undefined} />
        <StatCard label="Total Payouts" value={formatCurrency(data.totalPayouts)} />
        <StatCard label="Pending Payouts" value={formatCurrency(data.pendingPayouts)} accent={data.pendingPayouts > 0 ? 'amber' : undefined} />
      </div>
    </div>
  );
}

/* ── Chitty Selector ─────────────────────────────────────────── */

function ChittySelector({
  chitties,
  selectedId,
  onSelect,
}: {
  chitties: Chitty[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Chitty Report</h2>
      <div className="card p-4">
        <label className="mb-2 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Select a Chitty
        </label>
        <select
          value={selectedId ?? ''}
          onChange={(e) => onSelect(e.target.value || null)}
          className="input"
        >
          <option value="">Choose a Chitty…</option>
          {chitties.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ── Chitty Report ───────────────────────────────────────────── */

function ChittyReport({ chitty }: { chitty: Chitty }) {
  const [data, setData] = useState<ChittyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      const [membersRes, pairsRes, paymentsRes, drawsRes, payoutsRes] = await Promise.all([
        supabase.from('members').select('*').eq('chitty_id', chitty.id).order('created_at', { ascending: true }),
        supabase.from('member_pairs').select('*').eq('chitty_id', chitty.id),
        supabase.from('payments').select('*').eq('chitty_id', chitty.id).order('collection_date', { ascending: true }),
        supabase.from('draws').select('*').eq('chitty_id', chitty.id).order('cycle_number', { ascending: true }),
        supabase.from('payouts').select('*').eq('chitty_id', chitty.id).order('cycle_number', { ascending: true }),
      ]);

      if (!active) return;

      if (membersRes.error || pairsRes.error || paymentsRes.error || drawsRes.error || payoutsRes.error) {
        setError('Could not load report data.');
        setLoading(false);
        return;
      }

      const members = (membersRes.data as Member[]) ?? [];
      const pairs = (pairsRes.data as MemberPair[]) ?? [];
      const payments = (paymentsRes.data as Payment[]) ?? [];
      const draws = (drawsRes.data as Draw[]) ?? [];
      const payouts = (payoutsRes.data as Payout[]) ?? [];

      const fullMembers = members.filter((m) => m.membership_type === 'full');
      const halfMembers = members.filter((m) => m.membership_type === 'half');
      const drawUnits = fullMembers.length + pairs.length;
      const perCycleExpected = drawUnits * chitty.installment_amount;
      const totalExpected = perCycleExpected * chitty.cycles_count;
      const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
      const totalPending = Math.max(0, totalExpected - totalCollected);
      const completedDraws = draws.length;
      const remainingDraws = Math.max(0, chitty.cycles_count - completedDraws);
      const totalPayouts = payouts.reduce((s, p) => s + effectiveTotalPayout(p), 0);
      const pendingPayouts = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + effectiveTotalPayout(p), 0);

      // Cycle-wise collection
      const cycleData: CycleCollection[] = [];
      const startDate = new Date(chitty.start_date);
      for (let i = 1; i <= chitty.cycles_count; i++) {
        const dueDate = new Date(startDate);
        if (chitty.frequency === 'monthly') {
          dueDate.setMonth(dueDate.getMonth() + (i - 1));
        } else {
          dueDate.setDate(dueDate.getDate() + (i - 1) * 30);
        }
        const cyclePayments = payments.filter((p) => p.cycle_number === i);
        const collected = cyclePayments.reduce((s, p) => s + p.amount, 0);
        const expected = perCycleExpected;
        const pending = Math.max(0, expected - collected);
        const status = collected <= 0 ? 'pending' : collected >= expected - 0.01 ? 'collected' : 'partial';
        cycleData.push({
          cycle: i,
          dueDate: dueDate.toISOString().slice(0, 10),
          expected,
          collected,
          pending,
          status,
        });
      }

      // Draw & payout summary
      const memberMap = new Map(members.map((m) => [m.id, m]));
      const pairMap = new Map(pairs.map((p) => [p.id, p]));
      const drawSummaries: DrawSummary[] = draws.map((d) => {
        let winnerName: string | null = null;
        if (d.winner_type === 'full' && d.winner_member_id) {
          winnerName = memberMap.get(d.winner_member_id)?.name ?? null;
        } else if (d.winner_type === 'pair' && d.winner_pair_id) {
          const pair = pairMap.get(d.winner_pair_id);
          if (pair) {
            const m1 = memberMap.get(pair.member1_id);
            const m2 = memberMap.get(pair.member2_id);
            winnerName = `${m1?.name ?? '?'} + ${m2?.name ?? '?'}`;
          }
        }
        return {
          cycle: d.cycle_number,
          winnerType: d.winner_type,
          winnerName,
          drawnAt: d.drawn_at,
        };
      });

      const paidPayouts = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + effectiveTotalPayout(p), 0);

      setData({
        members,
        fullMembers: fullMembers.length,
        halfMembers: halfMembers.length,
        pairs: pairs.length,
        drawUnits,
        cycles: chitty.cycles_count,
        completedDraws,
        remainingDraws,
        totalExpected,
        totalCollected,
        totalPending,
        totalPayouts,
        pendingPayouts,
        paidPayouts,
        cycleData,
        drawSummaries,
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [chitty]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading report…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error ?? 'Could not load report'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Chitty header */}
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{chitty.name}</h3>
          <ChittyStatusBadge status={chitty.status} />
        </div>
        {chitty.description && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{chitty.description}</p>
        )}
      </div>

      {/* Chitty stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Members" value={String(data.members.length)} />
        <StatCard icon={Users} label="Full Members" value={String(data.fullMembers)} />
        <StatCard icon={Users} label="Half Members" value={String(data.halfMembers)} />
        <StatCard icon={Link2} label="Half Pairs" value={String(data.pairs)} />
        <StatCard icon={Link2} label="Draw Units" value={String(data.drawUnits)} />
        <StatCard icon={Calendar} label="Cycles" value={String(data.cycles)} />
        <StatCard icon={Trophy} label="Completed Draws" value={String(data.completedDraws)} />
        <StatCard icon={Trophy} label="Remaining Draws" value={String(data.remainingDraws)} />
        <StatCard icon={TrendingUp} label="Expected Collection" value={formatCurrency(data.totalExpected)} />
        <StatCard icon={CheckCircle2} label="Collected" value={formatCurrency(data.totalCollected)} accent="green" />
        <StatCard icon={AlertCircle} label="Pending" value={formatCurrency(data.totalPending)} accent={data.totalPending > 0 ? 'amber' : undefined} />
        <StatCard icon={Wallet} label="Total Payouts" value={formatCurrency(data.totalPayouts)} />
        <StatCard icon={Wallet} label="Pending Payouts" value={formatCurrency(data.pendingPayouts)} accent={data.pendingPayouts > 0 ? 'amber' : undefined} />
      </div>

      {/* Cycle-wise collection */}
      <CycleCollectionReport cycles={data.cycleData} />

      {/* Draw & Payout Summary */}
      <DrawPayoutSummary
        draws={data.drawSummaries}
        completedDraws={data.completedDraws}
        totalPayouts={data.totalPayouts}
        paidPayouts={data.paidPayouts}
        pendingPayouts={data.pendingPayouts}
      />
    </div>
  );
}

/* ── Cycle-wise Collection ───────────────────────────────────── */

interface CycleCollection {
  cycle: number;
  dueDate: string;
  expected: number;
  collected: number;
  pending: number;
  status: string;
}

function CycleCollectionReport({ cycles }: { cycles: CycleCollection[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        Cycle-wise Collection
      </h3>
      <div className="space-y-2">
        {cycles.map((c) => {
          const isOpen = expanded === c.cycle;
          const percent = c.expected > 0 ? Math.round((c.collected / c.expected) * 100) : 0;
          const statusInfo = {
            collected: { icon: CheckCircle2, label: 'Collected', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500' },
            partial: { icon: Clock, label: 'Partial', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500' },
            pending: { icon: AlertCircle, label: 'Pending', color: 'text-neutral-400', bg: 'bg-neutral-300 dark:bg-neutral-600' },
          }[c.status] ?? { icon: AlertCircle, label: c.status, color: 'text-neutral-400', bg: 'bg-neutral-300 dark:bg-neutral-600' };
          const StatusIcon = statusInfo.icon;

          return (
            <div key={c.cycle} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : c.cycle)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Cycle {c.cycle}</span>
                      <span className={`inline-flex items-center gap-1 text-xs ${statusInfo.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      Due {new Date(c.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(c.collected)}</p>
                  <p className="text-xs text-neutral-400">of {formatCurrency(c.expected)}</p>
                </div>
              </button>
              <div className="px-4 pb-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div className={`h-full rounded-full ${statusInfo.bg}`} style={{ width: `${percent}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-neutral-400">
                  <span>{percent}% collected</span>
                  {c.pending > 0 && <span className="font-medium text-amber-600 dark:text-amber-400">{formatCurrency(c.pending)} pending</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Draw & Payout Summary ──────────────────────────────────── */

interface DrawSummary {
  cycle: number;
  winnerType: string;
  winnerName: string | null;
  drawnAt: string;
}

function DrawPayoutSummary({
  draws,
  completedDraws,
  totalPayouts,
  paidPayouts,
  pendingPayouts,
}: {
  draws: DrawSummary[];
  completedDraws: number;
  totalPayouts: number;
  paidPayouts: number;
  pendingPayouts: number;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        Draw & Payout Summary
      </h3>

      {/* Payout summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Trophy} label="Completed Draws" value={String(completedDraws)} />
        <StatCard icon={Wallet} label="Total Payout" value={formatCurrency(totalPayouts)} />
        <StatCard icon={CheckCircle2} label="Paid Payouts" value={formatCurrency(paidPayouts)} accent="green" />
        <StatCard icon={Clock} label="Pending Payouts" value={formatCurrency(pendingPayouts)} accent={pendingPayouts > 0 ? 'amber' : undefined} />
      </div>

      {/* Draw list */}
      {draws.length > 0 ? (
        <div className="card divide-y divide-neutral-100 dark:divide-neutral-800/50">
          {draws.map((d) => (
            <div key={d.cycle} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Cycle {d.cycle}</p>
                  <p className="text-xs text-neutral-400">
                    {new Date(d.drawnAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {d.winnerName ? (
                  <p className="text-sm font-medium">{d.winnerName}</p>
                ) : (
                  <p className="text-sm text-neutral-400">No winner</p>
                )}
                <p className="text-xs text-neutral-400">
                  {d.winnerType === 'full' ? 'Full member' : 'Half pair'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card flex items-center gap-3 px-5 py-8 text-center">
          <Receipt className="h-5 w-5 text-neutral-400" />
          <p className="text-sm text-neutral-400">No draws completed yet.</p>
        </div>
      )}
    </div>
  );
}

/* ── Shared ──────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon?: typeof Receipt;
  label: string;
  value: string;
  accent?: 'green' | 'amber';
}) {
  const valueColor = accent === 'green'
    ? 'text-green-600 dark:text-green-400'
    : accent === 'amber'
    ? 'text-amber-600 dark:text-amber-400'
    : '';
  return (
    <div className="card px-4 py-3">
      {Icon && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-neutral-400" />
          <p className="text-xs text-neutral-400">{label}</p>
        </div>
      )}
      {!Icon && <p className="text-xs text-neutral-400">{label}</p>}
      <p className={`mt-0.5 text-lg font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

interface ChittyReportData {
  members: Member[];
  fullMembers: number;
  halfMembers: number;
  pairs: number;
  drawUnits: number;
  cycles: number;
  completedDraws: number;
  remainingDraws: number;
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  totalPayouts: number;
  pendingPayouts: number;
  paidPayouts: number;
  cycleData: CycleCollection[];
  drawSummaries: DrawSummary[];
}
