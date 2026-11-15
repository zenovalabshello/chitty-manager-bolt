import type { Member } from './members';

export interface Payment {
  id: string;
  chitty_id: string;
  member_id: string;
  cycle_number: number;
  amount: number;
  collection_date: string;
  created_at: string;
}

export interface PaymentInput {
  member_id: string;
  cycle_number: number;
  amount: number;
  collection_date: string;
}

export interface MemberCycleStatus {
  member: Member;
  expected: number;
  paid: number;
  pending: number;
  status: 'paid' | 'partial' | 'pending';
  payments: Payment[];
}

export function expectedInstallment(chittyAmount: number, member: Pick<Member, 'membership_type'>): number {
  return member.membership_type === 'half' ? chittyAmount / 2 : chittyAmount;
}

export function computeStatus(paid: number, expected: number): 'paid' | 'partial' | 'pending' {
  if (paid <= 0) return 'pending';
  if (paid >= expected - 0.01) return 'paid';
  return 'partial';
}
