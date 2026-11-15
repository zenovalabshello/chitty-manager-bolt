export interface MemberViewVisibility {
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

export interface MemberViewData {
  member: {
    id: string;
    name: string;
    membership_type: string;
    place?: string | null;
    job?: string | null;
  };
  visibility: MemberViewVisibility;
  chitty?: {
    name: string;
    description: string | null;
    installment_amount: number;
    members_count: number;
    cycles_count: number;
    frequency: string;
    start_date: string;
    selection_method: string;
    rules: string | null;
    status: string;
  };
  installment?: {
    amount: number;
    cycles_count: number;
    frequency: string;
    start_date: string;
  };
  payment_history?: {
    cycle: number;
    amount: number;
    date: string;
  }[];
  pending_amount?: {
    cycle: number;
    expected: number;
    paid: number;
    pending: number;
    status: string;
  }[];
  draw_status?: {
    completed_count: number;
    total_cycles: number;
    next_cycle: number | null;
  };
  draw_history?: {
    cycle: number;
    winner_type: string;
    winner_name: string | null;
    selection_method: string;
    drawn_at: string;
  }[];
  payouts?: {
    cycle: number;
    winner_name: string | null;
    total_payout: number;
    payout_date: string | null;
    status: string;
    note: string | null;
  }[];
  other_members?: {
    name: string;
    membership_type: string;
  }[];
}
