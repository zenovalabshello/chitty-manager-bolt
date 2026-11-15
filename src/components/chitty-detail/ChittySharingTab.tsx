import { useState } from 'react';
import { Share2, Loader2, Check, Info } from 'lucide-react';
import type { Chitty, VisibilitySettings } from '@/lib/chitties';
import { DEFAULT_VISIBILITY } from '@/lib/chitties';
import { supabase } from '@/lib/supabase';

interface ChittySharingTabProps {
  chitty: Chitty;
  onSaved: (updated: Chitty) => void;
}

const VISIBILITY_OPTIONS: { key: keyof VisibilitySettings; label: string; description: string }[] = [
  {
    key: 'chitty_info',
    label: 'Chitty information',
    description: 'Name, description, installment amount, cycles, and frequency.',
  },
  {
    key: 'own_details',
    label: "Member's own details",
    description: 'The member\u2019s own name, contact, and participation status.',
  },
  {
    key: 'installment_info',
    label: 'Installment information',
    description: 'Installment amounts and the cycle schedule.',
  },
  {
    key: 'own_payment_history',
    label: 'Own payment history',
    description: 'A member\u2019s own payment records across cycles.',
  },
  {
    key: 'own_pending_amount',
    label: 'Own pending amount',
    description: 'How much a member still owes for completed cycles.',
  },
  {
    key: 'draw_status',
    label: 'Draw status',
    description: 'Whether draws have taken place and the current cycle\u2019s status.',
  },
  {
    key: 'draw_history',
    label: 'Draw history',
    description: 'The full history of draws and their outcomes.',
  },
  {
    key: 'winner_info',
    label: 'Winner information',
    description: 'Who won each cycle\u2019s draw.',
  },
  {
    key: 'payout_info',
    label: 'Payout information',
    description: 'Payout amounts and status for each cycle.',
  },
  {
    key: 'other_members',
    label: 'Other members',
    description: 'Names and details of other members in this Chitty.',
  },
];

export default function ChittySharingTab({ chitty, onSaved }: ChittySharingTabProps) {
  const [settings, setSettings] = useState<VisibilitySettings>(() => ({
    ...DEFAULT_VISIBILITY,
    ...(chitty.visibility_settings ?? {}),
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: keyof VisibilitySettings) => {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { data, error } = await supabase
      .from('chitties')
      .update({ visibility_settings: settings })
      .eq('id', chitty.id)
      .select()
      .maybeSingle();

    setSaving(false);
    if (error || !data) {
      setError('Could not save sharing settings. Please try again.');
      return;
    }
    onSaved(data as Chitty);
    setSaved(true);
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Member View / Sharing</h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Control what members can see through their personal links. Copy a member's personal link
              from the Members tab and share it with them. These settings control what that member can view.
            </p>
          </div>
        </div>
      </div>

      <div className="card divide-y divide-neutral-200 dark:divide-neutral-800">
        {VISIBILITY_OPTIONS.map((opt) => {
          const enabled = settings[opt.key];
          return (
            <div
              key={opt.key}
              className="flex items-start justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {opt.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle(opt.key)}
                role="switch"
                aria-checked={enabled}
                className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  enabled
                    ? 'bg-brand-600'
                    : 'bg-neutral-200 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-neutral-400">
          <Info className="h-3.5 w-3.5" />
          Changes apply to all member links for this Chitty.
        </p>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          ) : (
            'Save sharing settings'
          )}
        </button>
      </div>
    </div>
  );
}
