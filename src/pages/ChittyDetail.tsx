import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Pencil, Loader2 } from 'lucide-react';
import type { Chitty } from '@/lib/chitties';
import { supabase } from '@/lib/supabase';
import { ChittyStatusBadge, formatDate, formatCurrency } from '@/components/ChittyCard';
import EditChittyModal from '@/components/EditChittyModal';
import ChittyOverviewTab from '@/components/chitty-detail/ChittyOverviewTab';
import ChittyMembersTab from '@/components/chitty-detail/ChittyMembersTab';
import ChittyInstallmentsTab from '@/components/chitty-detail/ChittyInstallmentsTab';
import ChittyDrawTab from '@/components/chitty-detail/ChittyDrawTab';
import ChittyDrawHistoryTab from '@/components/chitty-detail/ChittyDrawHistoryTab';
import ChittyPayoutTab from '@/components/chitty-detail/ChittyPayoutTab';
import ChittyActivityTab from '@/components/chitty-detail/ChittyActivityTab';
import ChittySharingTab from '@/components/chitty-detail/ChittySharingTab';

export type ChittyTab =
  | 'overview'
  | 'members'
  | 'installments'
  | 'draw'
  | 'draw-history'
  | 'payouts'
  | 'activity'
  | 'sharing';

const TABS: { id: ChittyTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'installments', label: 'Installments' },
  { id: 'draw', label: 'Draw' },
  { id: 'draw-history', label: 'Draw History' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'activity', label: 'Activity History' },
  { id: 'sharing', label: 'Sharing' },
];

interface ChittyDetailProps {
  chittyId: string;
  onBack: () => void;
  onUpdated: () => void;
}

export default function ChittyDetail({ chittyId, onBack, onUpdated }: ChittyDetailProps) {
  const [chitty, setChitty] = useState<Chitty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ChittyTab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [memberRefreshKey, setMemberRefreshKey] = useState(0);

  const fetchChitty = useCallback(() => {
    supabase
      .from('chitties')
      .select('*')
      .eq('id', chittyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError('Could not load this Chitty.');
        else if (!data) setError('This Chitty could not be found.');
        else setChitty(data as Chitty);
      });
  }, [chittyId]);

  const handleMembersChanged = useCallback(() => {
    setMemberRefreshKey((k) => k + 1);
    fetchChitty();
  }, [fetchChitty]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from('chitties')
      .select('*')
      .eq('id', chittyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError('Could not load this Chitty.');
        else if (!data) setError('This Chitty could not be found.');
        else setChitty(data as Chitty);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [chittyId]);

  const handleEditSaved = (updated: Chitty) => {
    setChitty(updated);
    onUpdated();
  };

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Chitties
        </button>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center gap-2 px-6 py-16 text-sm text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : error ? (
        <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={onBack} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
        </div>
      ) : chitty ? (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
                  {chitty.name}
                </h1>
                <ChittyStatusBadge status={chitty.status} />
              </div>
              {chitty.description && (
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  {chitty.description}
                </p>
              )}
            </div>
            <button onClick={() => setEditOpen(true)} className="btn-secondary shrink-0">
              <Pencil className="h-4 w-4" />
              Edit Chitty
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-1 border-b border-neutral-200 dark:border-neutral-800">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                    tab === t.id
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                  }`}
                >
                  {t.label}
                  {tab === t.id && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2">
            {tab === 'overview' && <ChittyOverviewTab chitty={chitty} refreshKey={memberRefreshKey} />}
            {tab === 'members' && (
              <ChittyMembersTab chitty={chitty} onMembersChanged={handleMembersChanged} />
            )}
            {tab === 'installments' && <ChittyInstallmentsTab chitty={chitty} />}
            {tab === 'draw' && <ChittyDrawTab chitty={chitty} onDrawCompleted={handleMembersChanged} />}
            {tab === 'draw-history' && <ChittyDrawHistoryTab chitty={chitty} />}
            {tab === 'payouts' && <ChittyPayoutTab chitty={chitty} />}
            {tab === 'activity' && <ChittyActivityTab chittyId={chitty.id} />}
            {tab === 'sharing' && <ChittySharingTab chitty={chitty} onSaved={handleEditSaved} />}
          </div>

          <EditChittyModal
            open={editOpen}
            chitty={chitty}
            onClose={() => setEditOpen(false)}
            onSaved={handleEditSaved}
          />
        </>
      ) : null}
    </div>
  );
}
