import { useEffect, useState, useCallback } from 'react';
import {
  History,
  Loader2,
  Plus,
  Pencil,
  UserPlus,
  UserMinus,
  Link2,
  Unlink,
  IndianRupee,
  Shuffle,
  HandCoins,
  RefreshCw,
} from 'lucide-react';
import type { Activity, ActivityAction } from '@/lib/activities';
import { fetchActivities } from '@/lib/activities';
import { Placeholder } from '@/components/chitty-detail/Placeholder';

interface ChittyActivityTabProps {
  chittyId: string;
}

const ACTION_CONFIG: Record<ActivityAction, { icon: typeof History; label: string; color: string; bg: string }> = {
  chitty_created: { icon: Plus, label: 'Chitty Created', color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-950' },
  chitty_updated: { icon: Pencil, label: 'Chitty Updated', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50' },
  member_added: { icon: UserPlus, label: 'Member Added', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/50' },
  member_removed: { icon: UserMinus, label: 'Member Removed', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/50' },
  members_paired: { icon: Link2, label: 'Members Paired', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/50' },
  members_unpaired: { icon: Unlink, label: 'Members Unpaired', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/50' },
  payment_recorded: { icon: IndianRupee, label: 'Payment Recorded', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/50' },
  payment_updated: { icon: Pencil, label: 'Payment Updated', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50' },
  draw_completed: { icon: Shuffle, label: 'Draw Completed', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50' },
  payout_recorded: { icon: HandCoins, label: 'Payout Recorded', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/50' },
  payout_status_changed: { icon: RefreshCw, label: 'Payout Status Changed', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/50' },
};

function formatActivityDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function ChittyActivityTab({ chittyId }: ChittyActivityTabProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await fetchActivities(chittyId);
    if (error) {
      setError('Could not load activity history.');
      setLoading(false);
      return;
    }
    setActivities(data ?? []);
    setLoading(false);
  }, [chittyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-2 px-6 py-16 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading activity history…
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

  if (activities.length === 0) {
    return (
      <Placeholder
        icon={History}
        title="No activity yet"
        message="Important actions within this Chitty — creation, edits, member changes, draws, and payouts — will be recorded here in chronological order."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-brand-500" />
        <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
          Activity History ({activities.length})
        </h3>
      </div>

      <div className="relative">
        <div className="absolute left-5 top-3 bottom-3 w-px bg-neutral-200 dark:bg-neutral-800" />

        <div className="space-y-1">
          {activities.map((activity) => {
            const config = ACTION_CONFIG[activity.action as ActivityAction] ?? {
              icon: History,
              label: activity.action,
              color: 'text-neutral-500 dark:text-neutral-400',
              bg: 'bg-neutral-100 dark:bg-neutral-800',
            };
            const Icon = config.icon;

            return (
              <div key={activity.id} className="relative flex gap-4 px-1 py-2.5">
                <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bg} ${config.color} ring-4 ring-white dark:ring-neutral-900`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold">{config.label}</span>
                    <span className="text-xs text-neutral-400">
                      {timeAgo(activity.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                    {activity.description}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {formatActivityDate(activity.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
