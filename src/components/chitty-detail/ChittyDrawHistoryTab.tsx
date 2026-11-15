import { useEffect, useState, useCallback } from 'react';
import { Shuffle, Loader2, Calendar, User, Link2, Trophy } from 'lucide-react';
import type { Chitty } from '@/lib/chitties';
import type { Member, MemberPair, PairWithMembers } from '@/lib/members';
import type { Draw, DrawWithDetails } from '@/lib/draws';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/components/ChittyCard';
import { Placeholder } from '@/components/chitty-detail/Placeholder';

interface ChittyDrawHistoryTabProps {
  chitty: Chitty;
}

export default function ChittyDrawHistoryTab({ chitty }: ChittyDrawHistoryTabProps) {
  const [draws, setDraws] = useState<DrawWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [drawsRes, membersRes, pairsRes] = await Promise.all([
      supabase.from('draws').select('*').eq('chitty_id', chitty.id).order('cycle_number', { ascending: true }),
      supabase.from('members').select('*').eq('chitty_id', chitty.id),
      supabase.from('member_pairs').select('*').eq('chitty_id', chitty.id),
    ]);

    if (drawsRes.error || membersRes.error || pairsRes.error) {
      setError('Could not load draw history.');
      setLoading(false);
      return;
    }

    const memberList = (membersRes.data as Member[]) ?? [];
    const pairList = (pairsRes.data as MemberPair[]) ?? [];
    const drawList = (drawsRes.data as Draw[]) ?? [];

    const withDetails: DrawWithDetails[] = drawList.map((d) => {
      const details: DrawWithDetails = { ...d };
      if (d.winner_type === 'full' && d.winner_member_id) {
        details.winnerMember = memberList.find((m) => m.id === d.winner_member_id);
      } else if (d.winner_type === 'pair' && d.winner_pair_id) {
        const pair = pairList.find((p) => p.id === d.winner_pair_id);
        if (pair) {
          details.winnerPair = pair;
          details.winnerMember1 = memberList.find((m) => m.id === pair.member1_id);
          details.winnerMember2 = memberList.find((m) => m.id === pair.member2_id);
        }
      }
      return details;
    });

    setDraws(withDetails);
    setLoading(false);
  }, [chitty.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-2 px-6 py-16 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading draw history…
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

  if (draws.length === 0) {
    return (
      <Placeholder
        icon={Shuffle}
        title="No draws yet"
        message="Completed draws will appear here with the cycle number, date, selection method, and winning member or pair."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-brand-500" />
        <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          {draws.length} completed draw{draws.length !== 1 ? 's' : ''}
        </h3>
      </div>

      {draws.map((draw) => (
        <div key={draw.id} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                <span className="text-sm font-bold">#{draw.cycle_number}</span>
              </div>
              <div>
                <p className="text-sm font-semibold">Draw {draw.cycle_number}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-400">
                  <Calendar className="h-3 w-3" />
                  {new Date(draw.drawn_at).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {' · '}
                  {new Date(draw.drawn_at).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  draw.selection_method === 'lucky_draw'
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                }`}
              >
                {draw.selection_method === 'lucky_draw' ? 'Lucky Draw' : 'Manual'}
              </span>
              <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700 dark:bg-green-950/50 dark:text-green-400">
                Completed
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
            <p className="mb-2 text-xs font-medium text-neutral-400">Winner</p>
            {draw.winner_type === 'full' && draw.winnerMember ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-neutral-500 shadow-soft dark:bg-neutral-900 dark:text-neutral-400">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{draw.winnerMember.name}</p>
                  <p className="text-xs text-neutral-400">Full member</p>
                </div>
              </div>
            ) : draw.winner_type === 'pair' && draw.winnerMember1 && draw.winnerMember2 ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-500 shadow-soft dark:bg-neutral-900">
                  <Link2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {draw.winnerMember1.name} + {draw.winnerMember2.name}
                  </p>
                  <p className="text-xs text-neutral-400">Half-member pair</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-400">Winner data unavailable</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
