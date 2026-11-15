export type MembershipType = 'full' | 'half';

export interface Member {
  id: string;
  chitty_id: string;
  name: string;
  place: string | null;
  contact1: string;
  contact2: string | null;
  job: string | null;
  id_proof_type: string | null;
  id_number: string | null;
  membership_type: MembershipType;
  share_token: string;
  created_at: string;
}

export interface MemberInput {
  name: string;
  place: string | null;
  contact1: string;
  contact2: string | null;
  job: string | null;
  id_proof_type: string | null;
  id_number: string | null;
  membership_type: MembershipType;
}

export interface MemberPair {
  id: string;
  chitty_id: string;
  member1_id: string;
  member2_id: string;
  created_at: string;
}

export interface PairWithMembers {
  pair: MemberPair;
  member1: Member;
  member2: Member;
}
