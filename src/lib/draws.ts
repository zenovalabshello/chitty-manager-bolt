import type { Member, MemberPair } from './members';
import type { SelectionMethod } from './chitties';

export type WinnerType = 'full' | 'pair';

export interface Draw {
  id: string;
  chitty_id: string;
  cycle_number: number;
  winner_type: WinnerType;
  winner_member_id: string | null;
  winner_pair_id: string | null;
  selection_method: SelectionMethod;
  drawn_at: string;
  created_at: string;
}

export interface DrawUnit {
  type: WinnerType;
  member?: Member;
  pair?: MemberPair;
  member1?: Member;
  member2?: Member;
  label: string;
  id: string;
}

export interface DrawWithDetails extends Draw {
  winnerMember?: Member;
  winnerPair?: MemberPair;
  winnerMember1?: Member;
  winnerMember2?: Member;
}

export function buildDrawUnits(
  members: Member[],
  pairs: { pair: MemberPair; member1: Member; member2: Member }[]
): DrawUnit[] {
  const units: DrawUnit[] = [];

  for (const m of members) {
    if (m.membership_type === 'full') {
      units.push({
        type: 'full',
        member: m,
        label: m.name,
        id: m.id,
      });
    }
  }

  for (const p of pairs) {
    units.push({
      type: 'pair',
      pair: p.pair,
      member1: p.member1,
      member2: p.member2,
      label: `${p.member1.name} + ${p.member2.name}`,
      id: p.pair.id,
    });
  }

  return units;
}

export function getEligibleDrawUnits(
  allUnits: DrawUnit[],
  completedDraws: Draw[]
): DrawUnit[] {
  const wonMemberIds = new Set<string>();
  const wonPairIds = new Set<string>();

  for (const d of completedDraws) {
    if (d.winner_type === 'full' && d.winner_member_id) {
      wonMemberIds.add(d.winner_member_id);
    } else if (d.winner_type === 'pair' && d.winner_pair_id) {
      wonPairIds.add(d.winner_pair_id);
    }
  }

  return allUnits.filter((u) => {
    if (u.type === 'full') return !wonMemberIds.has(u.id);
    return !wonPairIds.has(u.id);
  });
}

export function getNextCycleNumber(completedDraws: Draw[], totalCycles: number): number | null {
  const completed = new Set(completedDraws.map((d) => d.cycle_number));
  for (let i = 1; i <= totalCycles; i++) {
    if (!completed.has(i)) return i;
  }
  return null;
}
