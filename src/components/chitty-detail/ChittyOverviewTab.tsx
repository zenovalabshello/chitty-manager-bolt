import { useEffect, useState } from 'react';
import {
  IndianRupee,
  Users,
  Repeat,
  Calendar,
  Shuffle,
  HandCoins,
  FileText,
  BookOpen,
  UserCircle,
  UserCircle2,
  Link2,
  Layers,
  Trophy,
} from 'lucide-react';
import type { Chitty } from '@/lib/chitties';
import type { Member, MemberPair } from '@/lib/members';
import type { Draw } from '@/lib/draws';
import { supabase } from '@/lib/supabase';
import { formatDate, formatCurrency } from '@/components/ChittyCard';

interface ChittyOverviewTabProps {
  chitty: Chitty;
  refreshKey: number;
}

export default function ChittyOverviewTab({ chitty, refreshKey }: ChittyOverviewTabProps) {
  const [memberCount, setMemberCount] = useState<number>(0);
  const [fullCount, setFullCount] = useState<number>(0);
  const [halfCount, setHalfCount] = useState<number>(0);
  const [pairCount, setPairCount] = useState<number>(0);
  const [drawsCompleted, setDrawsCompleted] = useState<number>(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from('members').select('id, membership_type').eq('chitty_id', chitty.id),
      supabase.from('member_pairs').select('id').eq('chitty_id', chitty.id),
      supabase.from('draws').select('id').eq('chitty_id', chitty.id),
    ]).then(([membersRes, pairsRes, drawsRes]) => {
      if (!active) return;
      const memberList = (membersRes.data as Pick<Member, 'id' | 'membership_type'>[]) ?? [];
      const pairList = (pairsRes.data as Pick<MemberPair, 'id'>[]) ?? [];
      const drawList = (drawsRes.data as Pick<Draw, 'id'>[]) ?? [];
      setMemberCount(memberList.length);
      setFullCount(memberList.filter((m) => m.membership_type === 'full').length);
      setHalfCount(memberList.filter((m) => m.membership_type === 'half').length);
      setPairCount(pairList.length);
      setDrawsCompleted(drawList.length);
    });
    return () => {
      active = false;
    };
  }, [chitty.id, refreshKey]);

  const drawUnits = fullCount + pairCount;
  const drawsRemaining = chitty.cycles_count - drawsCompleted;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          Chitty details
        </h3>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Detail icon={IndianRupee} label="Installment amount" value={formatCurrency(chitty.installment_amount)} />
          <Detail icon={Users} label="Number of members" value={String(memberCount)} />
          <Detail icon={Repeat} label="Number of cycles" value={String(chitty.cycles_count)} />
          <Detail
            icon={Calendar}
            label="Payment frequency"
            value={chitty.frequency === 'monthly' ? 'Monthly' : 'Custom'}
          />
          <Detail icon={Calendar} label="Start date" value={formatDate(chitty.start_date)} />
          <Detail
            icon={chitty.selection_method === 'lucky_draw' ? Shuffle : HandCoins}
            label="Selection method"
            value={chitty.selection_method === 'lucky_draw' ? 'Lucky Draw' : 'Manual Selection'}
          />
        </div>
      </div>

      {/* Member summary */}
      <div className="card p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          Member summary
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat icon={Users} label="Total" value={memberCount} />
          <SummaryStat icon={UserCircle} label="Full" value={fullCount} />
          <SummaryStat icon={UserCircle2} label="Half" value={halfCount} />
          <SummaryStat icon={Link2} label="Pairs" value={pairCount} />
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
          <Layers className="h-4 w-4 text-brand-500" />
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            <span className="font-semibold">{drawUnits}</span> draw unit{drawUnits !== 1 ? 's' : ''} total
            <span className="text-neutral-400"> (Full members + Half-member pairs)</span>
          </p>
        </div>
      </div>

      {/* Draw summary */}
      <div className="card p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          Draw summary
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat icon={Shuffle} label="Total cycles" value={chitty.cycles_count} />
          <SummaryStat icon={Trophy} label="Completed" value={drawsCompleted} />
          <SummaryStat icon={Calendar} label="Remaining" value={drawsRemaining} />
          <SummaryStat icon={Layers} label="Draw units" value={drawUnits} />
        </div>
        {drawsCompleted > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
            <Trophy className="h-4 w-4 text-amber-500" />
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              <span className="font-semibold">{drawsCompleted}</span> of {chitty.cycles_count} draws completed
              {drawsRemaining > 0 && <span className="text-neutral-400"> · {drawsRemaining} remaining</span>}
            </p>
          </div>
        )}
      </div>

      {chitty.description && (
        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-neutral-400" />
            <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Description</h3>
          </div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{chitty.description}</p>
        </div>
      )}

      {chitty.rules && (
        <div className="card p-5">
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-neutral-400" />
            <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Rules / terms</h3>
          </div>
          <p className="whitespace-pre-line text-sm text-neutral-700 dark:text-neutral-300">{chitty.rules}</p>
        </div>
      )}
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/50">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-neutral-400" />
        <p className="text-xs text-neutral-400">{label}</p>
      </div>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
