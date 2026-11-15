import { useEffect, useState } from 'react';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import type { Chitty } from '@/lib/chitties';
import { supabase } from '@/lib/supabase';
import { ChittyStatusBadge, formatDate, formatCurrency } from '@/components/ChittyCard';

interface DashboardProps {
  onCreateChitty: () => void;
  onOpenChitty: (id: string) => void;
  refreshKey: number;
}

export default function Dashboard({ onCreateChitty, onOpenChitty, refreshKey }: DashboardProps) {
  const [chitties, setChitties] = useState<Chitty[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [refreshKey]);

  const hasChitties = chitties.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-brand-600 dark:text-brand-400">Welcome back</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Your dashboard</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          A clear overview of every Chitty you manage, all in one place.
        </p>
      </div>

      {!hasChitties && !loading && (
        <div className="card flex flex-col items-center gap-5 px-6 py-12 text-center sm:py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="max-w-sm space-y-1.5">
            <h2 className="text-lg font-semibold">Start your first Chitty</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Set up a fixed-installment Chitty in a few steps. Add members, track installments, and
              run the lucky draw — all from one place.
            </p>
          </div>
          <button onClick={onCreateChitty} className="btn-primary">
            <Plus className="h-4 w-4" />
            Create your first Chitty
          </button>
        </div>
      )}

      {loading && (
        <div className="card flex items-center justify-center gap-2 px-6 py-16 text-sm text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}

      {hasChitties && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Your Chitties</h2>
            <button onClick={onCreateChitty} className="btn-primary">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Chitty</span>
              <span className="sm:hidden">Create</span>
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {chitties.map((chitty) => (
              <button
                key={chitty.id}
                onClick={() => onOpenChitty(chitty.id)}
                className="card p-5 text-left transition-shadow hover:shadow-soft-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold">{chitty.name}</h3>
                    <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                      {formatCurrency(chitty.installment_amount)} / installment
                    </p>
                  </div>
                  <ChittyStatusBadge status={chitty.status} />
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-neutral-400">
                  <span>{chitty.members_count} members</span>
                  <span>·</span>
                  <span>{chitty.cycles_count} cycles</span>
                  <span>·</span>
                  <span>Starts {formatDate(chitty.start_date)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
