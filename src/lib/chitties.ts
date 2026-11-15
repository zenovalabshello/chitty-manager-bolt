import { supabase } from './supabase';

export type Frequency = 'monthly' | 'custom';
export type SelectionMethod = 'lucky_draw' | 'manual';
export type ChittyStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface VisibilitySettings {
  chitty_info: boolean;
  own_details: boolean;
  installment_info: boolean;
  own_payment_history: boolean;
  own_pending_amount: boolean;
  draw_status: boolean;
  draw_history: boolean;
  winner_info: boolean;
  payout_info: boolean;
  other_members: boolean;
}

export const DEFAULT_VISIBILITY: VisibilitySettings = {
  chitty_info: true,
  own_details: true,
  installment_info: true,
  own_payment_history: true,
  own_pending_amount: true,
  draw_status: true,
  draw_history: true,
  winner_info: true,
  payout_info: true,
  other_members: false,
};

export interface PaymentAccountDetails {
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_number: string;
  bank_name: string;
}

export type PaymentAccountDetailsInput = {
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  upi_number: string;
  bank_name: string;
} | null;

export interface Chitty {
  id: string;
  name: string;
  description: string | null;
  installment_amount: number;
  members_count: number;
  cycles_count: number;
  frequency: Frequency;
  start_date: string;
  selection_method: SelectionMethod;
  rules: string | null;
  status: ChittyStatus;
  visibility_settings: VisibilitySettings;
  payment_account_details: PaymentAccountDetails | null;
  created_at: string;
}

export async function syncChittyStatus(chittyId: string): Promise<ChittyStatus | null> {
  const { count: memberCount, error: memberErr } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('chitty_id', chittyId);

  if (memberErr) return null;

  const { count: drawCount, error: drawErr } = await supabase
    .from('draws')
    .select('*', { count: 'exact', head: true })
    .eq('chitty_id', chittyId);

  if (drawErr) return null;

  let newStatus: ChittyStatus;
  if (memberCount === 0) {
    newStatus = 'draft';
  } else if (drawCount !== null && drawCount > 0) {
    const { data: chittyData, error: chittyErr } = await supabase
      .from('chitties')
      .select('cycles_count')
      .eq('id', chittyId)
      .maybeSingle();

    if (chittyErr || !chittyData) return null;
    newStatus = drawCount >= chittyData.cycles_count ? 'completed' : 'active';
  } else {
    newStatus = 'active';
  }

  const { error: updateErr } = await supabase
    .from('chitties')
    .update({ status: newStatus })
    .eq('id', chittyId);

  if (updateErr) return null;
  return newStatus;
}

export interface ChittyInput {
  name: string;
  description: string | null;
  installment_amount: number;
  members_count: number;
  cycles_count: number;
  frequency: Frequency;
  start_date: string;
  selection_method: SelectionMethod;
  rules: string | null;
  payment_account_details: PaymentAccountDetailsInput;
}
