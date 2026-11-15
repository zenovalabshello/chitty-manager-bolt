import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VisibilitySettings {
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

const DEFAULT_VISIBILITY: VisibilitySettings = {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch the member by share_token
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("share_token", token)
      .maybeSingle();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: "Member not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the chitty
    const { data: chitty, error: chittyError } = await supabase
      .from("chitties")
      .select("*")
      .eq("id", member.chitty_id)
      .maybeSingle();

    if (chittyError || !chitty) {
      return new Response(JSON.stringify({ error: "Chitty not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const visibility: VisibilitySettings = {
      ...DEFAULT_VISIBILITY,
      ...(chitty.visibility_settings as Partial<VisibilitySettings> ?? {}),
    };

    const installmentAmount =
      member.membership_type === "half"
        ? chitty.installment_amount / 2
        : chitty.installment_amount;

    // Build response object — only include permitted sections
    const result: Record<string, unknown> = {
      member: {
        id: member.id,
        name: member.name,
        membership_type: member.membership_type,
      },
      visibility,
    };

    // Chitty info
    if (visibility.chitty_info) {
      result.chitty = {
        name: chitty.name,
        description: chitty.description,
        installment_amount: chitty.installment_amount,
        members_count: chitty.members_count,
        cycles_count: chitty.cycles_count,
        frequency: chitty.frequency,
        start_date: chitty.start_date,
        selection_method: chitty.selection_method,
        rules: chitty.rules,
        status: chitty.status,
      };
    }

    // Own details (no sensitive info like ID proof, contact numbers)
    if (visibility.own_details) {
      result.member = {
        ...result.member,
        place: member.place,
        job: member.job,
        membership_type: member.membership_type,
      };
    }

    // Installment info
    if (visibility.installment_info) {
      result.installment = {
        amount: installmentAmount,
        cycles_count: chitty.cycles_count,
        frequency: chitty.frequency,
        start_date: chitty.start_date,
      };
    }

    // Fetch payments for this member
    const { data: payments } = await supabase
      .from("payments")
      .select("id, cycle_number, amount, collection_date")
      .eq("member_id", member.id)
      .order("collection_date", { ascending: true });

    // Own payment history
    if (visibility.own_payment_history && payments) {
      result.payment_history = payments.map((p: { id: string; cycle_number: number; amount: number; collection_date: string }) => ({
        cycle: p.cycle_number,
        amount: p.amount,
        date: p.collection_date,
      }));
    }

    // Own pending amount
    if (visibility.own_pending_amount) {
      const paidByCycle = new Map<number, number>();
      if (payments) {
        for (const p of payments as { cycle_number: number; amount: number }[]) {
          paidByCycle.set(p.cycle_number, (paidByCycle.get(p.cycle_number) ?? 0) + p.amount);
        }
      }
      const pendingCycles: { cycle: number; expected: number; paid: number; pending: number; status: string }[] = [];
      for (let i = 1; i <= chitty.cycles_count; i++) {
        const paid = paidByCycle.get(i) ?? 0;
        const pending = Math.max(0, installmentAmount - paid);
        const status = paid <= 0 ? "pending" : paid >= installmentAmount - 0.01 ? "paid" : "partial";
        pendingCycles.push({ cycle: i, expected: installmentAmount, paid, pending, status });
      }
      result.pending_amount = pendingCycles;
    }

    // Fetch draws
    const { data: draws } = await supabase
      .from("draws")
      .select("*")
      .eq("chitty_id", chitty.id)
      .order("cycle_number", { ascending: true });

    // Fetch all members (for winner names and other members)
    const { data: allMembers } = await supabase
      .from("members")
      .select("id, name, membership_type")
      .eq("chitty_id", chitty.id)
      .order("created_at", { ascending: true });

    // Fetch pairs (for winner pair names)
    const { data: pairs } = await supabase
      .from("member_pairs")
      .select("id, member1_id, member2_id")
      .eq("chitty_id", chitty.id);

    const memberMap = new Map<string, { id: string; name: string; membership_type: string }>();
    if (allMembers) {
      for (const m of allMembers as { id: string; name: string; membership_type: string }[]) {
        memberMap.set(m.id, m);
      }
    }

    const pairMap = new Map<string, { id: string; member1_id: string; member2_id: string }>();
    if (pairs) {
      for (const p of pairs as { id: string; member1_id: string; member2_id: string }[]) {
        pairMap.set(p.id, p);
      }
    }

    // Draw status
    if (visibility.draw_status) {
      const completedCycles = (draws as { cycle_number: number }[] ?? []).map((d) => d.cycle_number);
      const nextCycle = (() => {
        const completed = new Set(completedCycles);
        for (let i = 1; i <= chitty.cycles_count; i++) {
          if (!completed.has(i)) return i;
        }
        return null;
      })();
      result.draw_status = {
        completed_count: completedCycles.length,
        total_cycles: chitty.cycles_count,
        next_cycle: nextCycle,
      };
    }

    // Draw history + winner info
    if (visibility.draw_history || visibility.winner_info) {
      const drawHistory = (draws as {
        id: string;
        cycle_number: number;
        winner_type: string;
        winner_member_id: string | null;
        winner_pair_id: string | null;
        selection_method: string;
        drawn_at: string;
      }[] ?? []).map((d) => {
        let winnerName: string | null = null;
        if (visibility.winner_info) {
          if (d.winner_type === "full" && d.winner_member_id) {
            const m = memberMap.get(d.winner_member_id);
            winnerName = m?.name ?? null;
          } else if (d.winner_type === "pair" && d.winner_pair_id) {
            const p = pairMap.get(d.winner_pair_id);
            if (p) {
              const m1 = memberMap.get(p.member1_id);
              const m2 = memberMap.get(p.member2_id);
              winnerName = `${m1?.name ?? "?"} + ${m2?.name ?? "?"}`;
            }
          }
        }
        return {
          cycle: d.cycle_number,
          winner_type: d.winner_type,
          winner_name: winnerName,
          selection_method: d.selection_method,
          drawn_at: d.drawn_at,
        };
      });
      if (visibility.draw_history) {
        result.draw_history = drawHistory;
      } else {
        // Only winner info — still return draw history but without winner names
        result.draw_history = drawHistory.map((d) => ({
          cycle: d.cycle,
          winner_type: d.winner_type,
          winner_name: null,
          selection_method: d.selection_method,
          drawn_at: d.drawn_at,
        }));
      }
    }

    // Payout info
    if (visibility.payout_info) {
      const { data: payouts } = await supabase
        .from("payouts")
        .select("cycle_number, winner_type, winner_member_id, winner_pair_id, total_payout, custom_payout_amount, member1_payout, member2_payout, payout_date, status, note")
        .eq("chitty_id", chitty.id)
        .order("cycle_number", { ascending: true });

      if (payouts) {
        result.payouts = (payouts as {
          cycle_number: number;
          winner_type: string;
          winner_member_id: string | null;
          winner_pair_id: string | null;
          total_payout: number;
          custom_payout_amount: number | null;
          member1_payout: number | null;
          member2_payout: number | null;
          payout_date: string | null;
          status: string;
          note: string | null;
        }[]).map((p) => {
          let winnerName: string | null = null;
          if (p.winner_type === "full" && p.winner_member_id) {
            const m = memberMap.get(p.winner_member_id);
            winnerName = m?.name ?? null;
          } else if (p.winner_type === "pair" && p.winner_pair_id) {
            const pair = pairMap.get(p.winner_pair_id);
            if (pair) {
              const m1 = memberMap.get(pair.member1_id);
              const m2 = memberMap.get(pair.member2_id);
              winnerName = `${m1?.name ?? "?"} + ${m2?.name ?? "?"}`;
            }
          }
          return {
            cycle: p.cycle_number,
            winner_name: winnerName,
            total_payout: p.custom_payout_amount != null ? p.custom_payout_amount : p.total_payout,
            payout_date: p.payout_date,
            status: p.status,
            note: p.note,
          };
        });
      }
    }

    // Other members (names only — no contact, ID proof, etc.)
    if (visibility.other_members && allMembers) {
      result.other_members = (allMembers as { id: string; name: string; membership_type: string }[])
        .filter((m) => m.id !== member.id)
        .map((m) => ({
          name: m.name,
          membership_type: m.membership_type,
        }));
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
