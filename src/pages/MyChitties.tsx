import { useEffect, useState } from 'react';
import { Plus, Wallet, Users, Repeat, Calendar, IndianRupee } from 'lucide-react';
import type { Chitty } from '@/lib/chitties';
import { supabase } from '@/lib/supabase';
import { ChittyStatusBadge, formatDate, formatCurrency } from '@/components/ChittyCard';

interface MyChittiesProps {
  onCreateChitty: () => void;
  onOpenChitty: (id: string) => void;
  refreshKey: number;
}

export default function MyChitties({ onCreateChitty, onOpenChitty, refreshKey }: MyChittiesProps) {
  const [chitties, setChitties] = useState<Chitty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from('chitties')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError('Could not load your Chitties.');
        else setChitties(data as Chitty[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Chitties</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Every Chitty you organize, with its members and installment progress.
          </p>
        </div>
        <button onClick={onCreateChitty} className="btn-primary shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create Chitty</span>
          <span className="sm:hidden">Create</span>
        </button>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center px-6 py-16 text-sm text-neutral-400">
          Loading…
        </div>
      ) : error ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={onCreateChitty} className="btn-primary">
            <Plus className="h-4 w-4" />
            Create your first Chitty
          </button>
        </div>
      ) : chitties.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <Wallet className="h-7 w-7" />
          </div>
          <div className="max-w-sm space-y-1.5">
            <h2 className="text-lg font-semibold">No Chitties yet</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Once you create a Chitty, it will appear here with its members, installment schedule,
              and draw status.
            </p>
          </div>
          <button onClick={onCreateChitty} className="btn-primary">
            <Plus className="h-4 w-4" />
            Create your first Chitty
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {chitties.map((chitty) => (
            <ChittyCard key={chitty.id} chitty={chitty} onOpen={() => onOpenChitty(chitty.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChittyCard({ chitty, onOpen }: { chitty: Chitty; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="card p-5 text-left transition-shadow hover:shadow-soft-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{chitty.name}</h3>
          {chitty.description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">
              {chitty.description}
            </p>
          )}
        </div>
        <ChittyStatusBadge status={chitty.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Detail icon={IndianRupee} label="Installment" value={formatCurrency(chitty.installment_amount)} />
        <Detail icon={Users} label="Members" value={String(chitty.members_count)} />
        <Detail icon={Repeat} label="Cycles" value={String(chitty.cycles_count)} />
        <Detail
          icon={Calendar}
          label="Frequency"
          value={chitty.frequency === 'monthly' ? 'Monthly' : 'Custom'}
        />
        <Detail icon={Calendar} label="Starts" value={formatDate(chitty.start_date)} />
        <Detail
          icon={chitty.selection_method === 'lucky_draw' ? Wallet : Users}
          label="Selection"
          value={chitty.selection_method === 'lucky_draw' ? 'Lucky Draw' : 'Manual'}
        />
      </div>
    </button>
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
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-neutral-400" />
      <div className="min-w-0">
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  );
}
