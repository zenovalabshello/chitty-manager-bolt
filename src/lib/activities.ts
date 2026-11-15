import { supabase } from './supabase';

export type ActivityAction =
  | 'chitty_created'
  | 'chitty_updated'
  | 'member_added'
  | 'member_removed'
  | 'members_paired'
  | 'members_unpaired'
  | 'payment_recorded'
  | 'payment_updated'
  | 'draw_completed'
  | 'payout_recorded'
  | 'payout_status_changed';

export interface Activity {
  id: string;
  chitty_id: string;
  action: string;
  description: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export async function recordActivity(
  chittyId: string,
  action: ActivityAction,
  description: string,
  meta?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from('activities').insert({
    chitty_id: chittyId,
    action,
    description,
    meta: meta ?? null,
  });
  if (error) {
    console.error('Failed to record activity:', error.message);
  }
}

export async function fetchActivities(
  chittyId: string
): Promise<{ data: Activity[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('chitty_id', chittyId)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data as Activity[], error: null };
}
