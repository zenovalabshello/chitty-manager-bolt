import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Shuffle,
  HandCoins,
  Loader2,
  User,
  Link2,
  CheckCircle2,
  Sparkles,
  Calendar,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import type { Chitty } from '@/lib/chitties';
import { syncChittyStatus } from '@/lib/chitties';
import type { Member, MemberPair } from '@/lib/members';
import type { Draw, DrawUnit } from '@/lib/draws';
import { buildDrawUnits, getEligibleDrawUnits, getNextCycleNumber } from '@/lib/draws';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/components/ChittyCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Placeholder } from '@/components/chitty-detail/Placeholder';
import { recordActivity } from '@/lib/activities';

interface ChittyDrawTabProps {
  chitty: Chitty;
  onDrawCompleted?: () => void;
}

type DrawPhase = 'idle' | 'spinning' | 'revealed';

export default function ChittyDrawTab({ chitty, onDrawCompleted }: ChittyDrawTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [pairs, setPairs] = useState<{ pair: MemberPair; member1: Member; member2: Member }[]>([]);
  const [completedDraws, setCompletedDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<DrawPhase>('idle');
  const [spinningName, setSpinningName] = useState('');
  const [winnerUnit, setWinnerUnit] = useState<DrawUnit | null>(null);
  const [manualSelected, setManualSelected] = useState<DrawUnit | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [membersRes, pairsRes, drawsRes] = await Promise.all([
      supabase.from('members').select('*').eq('chitty_id', chitty.id).order('created_at', { ascending: true }),
      supabase.from('member_pairs').select('*').eq('chitty_id', chitty.id),
      supabase.from('draws').select('*').eq('chitty_id', chitty.id).order('cycle_number', { ascending: true }),
    ]);

    if (membersRes.error || pairsRes.error || drawsRes.error) {
      setError('Could not load draw data.');
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

    setMembers(memberList);
    setPairs(pairsWithMembers);
    setCompletedDraws(drawList);
    setLoading(false);
  }, [chitty.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, []);

  const allUnits = buildDrawUnits(members, pairs);
  const eligibleUnits = getEligibleDrawUnits(allUnits, completedDraws);
  const nextCycle = getNextCycleNumber(completedDraws, chitty.cycles_count);
  const isLuckyDraw = chitty.selection_method === 'lucky_draw';

  const handleLuckyDraw = () => {
    if (eligibleUnits.length === 0 || !nextCycle) return;
    setPhase('spinning');
    setWinnerUnit(null);
    setSaveError(null);

    const eligible = eligibleUnits;
    let ticks = 0;
    const totalTicks = 28;
    const baseInterval = 70;
    const maxInterval = 280;

    spinIntervalRef.current = setInterval(() => {
      const randomUnit = eligible[Math.floor(Math.random() * eligible.length)];
      setSpinningName(randomUnit.label);

      ticks++;
      if (ticks >= totalTicks) {
        if (spinIntervalRef.current) {
          clearInterval(spinIntervalRef.current);
          spinIntervalRef.current = null;
        }
        const winner = eligible[Math.floor(Math.random() * eligible.length)];
        setWinnerUnit(winner);
        setPhase('revealed');
        saveDraw(winner);
      }
    }, baseInterval + Math.min(maxInterval, Math.floor(ticks / totalTicks * (maxInterval - baseInterval))));
  };

  const saveDraw = async (unit: DrawUnit) => {
    if (!nextCycle) return;
    setSaving(true);
    setSaveError(null);

    const payload = {
      chitty_id: chitty.id,
      cycle_number: nextCycle,
      winner_type: unit.type,
      winner_member_id: unit.type === 'full' ? unit.id : null,
      winner_pair_id: unit.type === 'pair' ? unit.id : null,
      selection_method: chitty.selection_method,
    };

    const { error } = await supabase.from('draws').insert(payload);

    setSaving(false);
    if (error) {
      setSaveError('Could not save the draw result. Please try again.');
      setPhase('idle');
      setWinnerUnit(null);
      return;
    }

    await recordActivity(chitty.id, 'draw_completed', `Draw ${nextCycle} completed — Winner: ${unit.label}.`, { cycle_number: nextCycle, winner: unit.label, winner_type: unit.type });
    await syncChittyStatus(chitty.id);
    onDrawCompleted?.();
    loadData();
  };

  const handleManualConfirm = () => {
    if (!manualSelected) return;
    setConfirmOpen(false);
    setWinnerUnit(manualSelected);
    setPhase('revealed');
    saveDraw(manualSelected);
  };

  const resetDraw = () => {
    setPhase('idle');
    setWinnerUnit(null);
    setManualSelected(null);
    setSaveError(null);
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-2 px-6 py-16 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading draw data…
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
        icon={Shuffle}
        title="No members yet"
        message="Add members to this Chitty and pair any half members before running a draw."
      />
    );
  }

  if (!nextCycle) {
    return (
      <div className="space-y-4">
        <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="max-w-sm space-y-1.5">
            <h2 className="text-lg font-semibold">All draws completed</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              All {chitty.cycles_count} cycles have been drawn. No more draws are available for this Chitty.
            </p>
          </div>
        </div>
        <CompletedDrawsSummary completedDraws={completedDraws} members={members} pairs={pairs} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Draw header */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              {isLuckyDraw ? <Shuffle className="h-5 w-5" /> : <HandCoins className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-semibold">Draw {nextCycle}</h3>
              <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                {isLuckyDraw ? 'Lucky Draw' : 'Manual Selection'} · {eligibleUnits.length} eligible unit{eligibleUnits.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            {completedDraws.length}/{chitty.cycles_count} done
          </span>
        </div>
      </div>

      {saveError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {saveError}
        </p>
      )}

      {/* Lucky Draw animation */}
      {isLuckyDraw && phase === 'spinning' && (
        <div className="card flex flex-col items-center gap-6 px-6 py-12 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-brand-400/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <Shuffle className="h-10 w-10 animate-spin" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-400">Drawing…</p>
            <p className="mt-2 animate-pulse text-2xl font-bold tracking-tight">{spinningName}</p>
          </div>
        </div>
      )}

      {isLuckyDraw && phase === 'revealed' && winnerUnit && (
        <div className="card flex flex-col items-center gap-6 px-6 py-12 text-center animate-scale-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-950/50 dark:text-amber-400">
            <Trophy className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-400">Winner of Draw {nextCycle}</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              {winnerUnit.type === 'pair' ? (
                <Link2 className="h-5 w-5 text-brand-500" />
              ) : (
                <User className="h-5 w-5 text-brand-500" />
              )}
              <p className="text-2xl font-bold tracking-tight">{winnerUnit.label}</p>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {winnerUnit.type === 'pair' ? 'Half-member pair' : 'Full member'}
            </p>
          </div>
          {saving && (
            <p className="flex items-center gap-1.5 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving result…
            </p>
          )}
          {!saving && !saveError && (
            <button onClick={resetDraw} className="btn-secondary">
              Done
            </button>
          )}
        </div>
      )}

      {/* Manual selection revealed */}
      {!isLuckyDraw && phase === 'revealed' && winnerUnit && (
        <div className="card flex flex-col items-center gap-6 px-6 py-12 text-center animate-scale-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-950/50 dark:text-amber-400">
            <Trophy className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-400">Winner of Draw {nextCycle}</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              {winnerUnit.type === 'pair' ? (
                <Link2 className="h-5 w-5 text-brand-500" />
              ) : (
                <User className="h-5 w-5 text-brand-500" />
              )}
              <p className="text-2xl font-bold tracking-tight">{winnerUnit.label}</p>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {winnerUnit.type === 'pair' ? 'Half-member pair' : 'Full member'}
            </p>
          </div>
          {saving && (
            <p className="flex items-center gap-1.5 text-sm text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving result…
            </p>
          )}
          {!saving && !saveError && (
            <button onClick={resetDraw} className="btn-secondary">
              Done
            </button>
          )}
        </div>
      )}

      {/* Lucky Draw idle — eligible list + draw button */}
      {isLuckyDraw && phase === 'idle' && (
        <>
          {eligibleUnits.length === 0 ? (
            <div className="card flex flex-col items-center gap-4 px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-950/50 dark:text-amber-400">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div className="max-w-sm space-y-1.5">
                <h2 className="text-lg font-semibold">No eligible draw units</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  All draw units have already won or there are no paired half members. Add or pair members to enable more draws.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Eligible draw units ({eligibleUnits.length})
                </p>
                {eligibleUnits.map((unit) => (
                  <DrawUnitRow key={unit.id} unit={unit} selected={false} selectable={false} onSelect={() => {}} />
                ))}
              </div>
              <button onClick={handleLuckyDraw} className="btn-primary w-full">
                <Sparkles className="h-5 w-5" />
                Run Lucky Draw
              </button>
            </>
          )}
        </>
      )}

      {/* Manual selection idle — eligible list + select */}
      {!isLuckyDraw && phase === 'idle' && (
        <>
          {eligibleUnits.length === 0 ? (
            <div className="card flex flex-col items-center gap-4 px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-950/50 dark:text-amber-400">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div className="max-w-sm space-y-1.5">
                <h2 className="text-lg font-semibold">No eligible draw units</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  All draw units have already won or there are no paired half members. Add or pair members to enable more draws.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Select a winner for Draw {nextCycle}
                </p>
                {eligibleUnits.map((unit) => (
                  <DrawUnitRow
                    key={unit.id}
                    unit={unit}
                    selected={manualSelected?.id === unit.id}
                    selectable
                    onSelect={() => setManualSelected(unit)}
                  />
                ))}
              </div>
              {manualSelected && (
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="btn-primary w-full"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Confirm {manualSelected.label} as winner
                </button>
              )}
            </>
          )}
        </>
      )}

      {/* Completed draws summary */}
      {completedDraws.length > 0 && (
        <CompletedDrawsSummary completedDraws={completedDraws} members={members} pairs={pairs} />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm winner?"
        message={
          manualSelected
            ? `"${manualSelected.label}" will be recorded as the winner of Draw ${nextCycle}. This cannot be undone or changed.`
            : ''
        }
        confirmLabel="Confirm winner"
        destructive
        onConfirm={handleManualConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function DrawUnitRow({
  unit,
  selected,
  selectable,
  onSelect,
}: {
  unit: DrawUnit;
  selected: boolean;
  selectable: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={selectable ? onSelect : undefined}
      disabled={!selectable}
      className={`card w-full p-4 text-left transition-all ${
        selected ? 'ring-2 ring-brand-500' : ''
      } ${selectable ? 'cursor-pointer hover:shadow-soft-lg' : 'cursor-default'}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            unit.type === 'pair'
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400'
              : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
          }`}
        >
          {unit.type === 'pair' ? <Link2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{unit.label}</p>
          <p className="text-xs text-neutral-400">
            {unit.type === 'pair' ? 'Half-member pair · 1 draw unit' : 'Full member · 1 draw unit'}
          </p>
        </div>
        {selectable && (
          <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              selected
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-neutral-300 dark:border-neutral-600'
            }`}
          >
            {selected && (
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

function CompletedDrawsSummary({
  completedDraws,
  members,
  pairs,
}: {
  completedDraws: Draw[];
  members: Member[];
  pairs: { pair: MemberPair; member1: Member; member2: Member }[];
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        Completed draws ({completedDraws.length})
      </h3>
      {completedDraws.map((draw) => {
        let label = 'Unknown';
        let isPair = false;
        if (draw.winner_type === 'full' && draw.winner_member_id) {
          const m = members.find((mm) => mm.id === draw.winner_member_id);
          if (m) label = m.name;
        } else if (draw.winner_type === 'pair' && draw.winner_pair_id) {
          isPair = true;
          const p = pairs.find((pp) => pp.pair.id === draw.winner_pair_id);
          if (p) label = `${p.member1.name} + ${p.member2.name}`;
        }
        return (
          <div key={draw.id} className="card flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                <span className="text-xs font-bold">#{draw.cycle_number}</span>
              </div>
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-neutral-400">
                  {isPair ? 'Pair' : 'Full'} · {formatDate(draw.drawn_at)}
                </p>
              </div>
            </div>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
        );
      })}
    </div>
  );
}
