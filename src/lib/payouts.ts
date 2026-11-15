import type { Chitty } from './chitties';
import type { Member, MemberPair } from './members';
import type { Draw } from './draws';
import { supabase } from './supabase';

export type PayoutStatus = 'pending' | 'paid';
export type PayoutWinnerType = 'full' | 'pair';

export interface Payout {
  id: string;
  chitty_id: string;
  draw_id: string;
  cycle_number: number;
  winner_type: PayoutWinnerType;
  winner_member_id: string | null;
  winner_pair_id: string | null;
  total_payout: number;
  custom_payout_amount: number | null;
  member1_payout: number | null;
  member2_payout: number | null;
  payout_date: string | null;
  status: PayoutStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayoutWithDetails extends Payout {
  winnerMember?: Member;
  winnerPair?: MemberPair;
  winnerMember1?: Member;
  winnerMember2?: Member;
  draw?: Draw;
}

export interface PayoutInput {
  payout_date: string | null;
  status: PayoutStatus;
  note: string | null;
  custom_payout_amount: number | null;
}

export function calculateTotalPayout(installmentAmount: number, cyclesCount: number): number {
  return installmentAmount * cyclesCount;
}

export function calculateHalfPayout(totalPayout: number): number {
  return totalPayout / 2;
}

export function effectiveTotalPayout(payout: Pick<Payout, 'total_payout' | 'custom_payout_amount'>): number {
  if (payout.custom_payout_amount != null) return Number(payout.custom_payout_amount);
  return Number(payout.total_payout);
}

export function effectiveMemberPayout(
  payout: Pick<Payout, 'total_payout' | 'custom_payout_amount' | 'member1_payout' | 'member2_payout' | 'winner_type'>,
  which: 1 | 2
): number {
  if (payout.custom_payout_amount != null) {
    return Number(payout.custom_payout_amount) / 2;
  }
  return Number(which === 1 ? payout.member1_payout : payout.member2_payout ?? 0);
}

export async function fetchPayoutsForChitty(
  chittyId: string
): Promise<{ data: PayoutWithDetails[] | null; error: string | null }> {
  const [payoutsRes, membersRes, pairsRes, drawsRes] = await Promise.all([
    supabase.from('payouts').select('*').eq('chitty_id', chittyId).order('cycle_number', { ascending: true }),
    supabase.from('members').select('*').eq('chitty_id', chittyId),
    supabase.from('member_pairs').select('*').eq('chitty_id', chittyId),
    supabase.from('draws').select('*').eq('chitty_id', chittyId).order('cycle_number', { ascending: true }),
  ]);

  if (payoutsRes.error) return { data: null, error: payoutsRes.error.message };
  if (membersRes.error) return { data: null, error: membersRes.error.message };
  if (pairsRes.error) return { data: null, error: pairsRes.error.message };
  if (drawsRes.error) return { data: null, error: drawsRes.error.message };

  const memberList = (membersRes.data as Member[]) ?? [];
  const pairList = (pairsRes.data as MemberPair[]) ?? [];
  const drawList = (drawsRes.data as Draw[]) ?? [];
  const payoutList = (payoutsRes.data as Payout[]) ?? [];

  const withDetails: PayoutWithDetails[] = payoutList.map((p) => {
    const details: PayoutWithDetails = { ...p };
    details.draw = drawList.find((d) => d.id === p.draw_id);
    if (p.winner_type === 'full' && p.winner_member_id) {
      details.winnerMember = memberList.find((m) => m.id === p.winner_member_id);
    } else if (p.winner_type === 'pair' && p.winner_pair_id) {
      details.winnerPair = pairList.find((pp) => pp.id === p.winner_pair_id);
      if (details.winnerPair) {
        details.winnerMember1 = memberList.find((m) => m.id === details.winnerPair!.member1_id);
        details.winnerMember2 = memberList.find((m) => m.id === details.winnerPair!.member2_id);
      }
    }
    return details;
  });

  return { data: withDetails, error: null };
}

export async function ensurePayoutsForDraws(
  chitty: Chitty,
  draws: Draw[],
  members: Member[],
  pairs: { pair: MemberPair; member1: Member; member2: Member }[]
): Promise<{ created: number; error: string | null }> {
  const completedDraws = draws;
  if (completedDraws.length === 0) return { created: 0, error: null };

  const { data: existingPayouts, error: fetchErr } = await supabase
    .from('payouts')
    .select('draw_id')
    .eq('chitty_id', chitty.id);

  if (fetchErr) return { created: 0, error: fetchErr.message };

  const existingDrawIds = new Set((existingPayouts ?? []).map((p: { draw_id: string }) => p.draw_id));
  const drawsNeedingPayouts = completedDraws.filter((d) => !existingDrawIds.has(d.id));

  if (drawsNeedingPayouts.length === 0) return { created: 0, error: null };

  const totalPayout = calculateTotalPayout(chitty.installment_amount, chitty.cycles_count);
  const halfPayout = calculateHalfPayout(totalPayout);

  const rows = drawsNeedingPayouts.map((draw) => {
    if (draw.winner_type === 'full') {
      return {
        chitty_id: chitty.id,
        draw_id: draw.id,
        cycle_number: draw.cycle_number,
        winner_type: 'full' as const,
        winner_member_id: draw.winner_member_id,
        winner_pair_id: null,
        total_payout: totalPayout,
        member1_payout: null,
        member2_payout: null,
        status: 'pending' as const,
      };
    } else {
      const pair = pairs.find((pp) => pp.pair.id === draw.winner_pair_id);
      return {
        chitty_id: chitty.id,
        draw_id: draw.id,
        cycle_number: draw.cycle_number,
        winner_type: 'pair' as const,
        winner_member_id: null,
        winner_pair_id: draw.winner_pair_id,
        total_payout: totalPayout,
        member1_payout: halfPayout,
        member2_payout: halfPayout,
        status: 'pending' as const,
      };
    }
  });

  const { error: insertErr } = await supabase.from('payouts').insert(rows);
  if (insertErr) return { created: 0, error: insertErr.message };

  return { created: rows.length, error: null };
}

export async function updatePayout(
  payoutId: string,
  input: PayoutInput
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('payouts')
    .update({
      payout_date: input.payout_date,
      status: input.status,
      note: input.note,
      custom_payout_amount: input.custom_payout_amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payoutId);

  return { error: error?.message ?? null };
}
