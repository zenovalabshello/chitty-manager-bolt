/*
# Create payouts table

1. New Tables
- `payouts`
  - `id` (uuid, primary key)
  - `chitty_id` (uuid, FK to chitties, ON DELETE CASCADE)
  - `draw_id` (uuid, FK to draws, ON DELETE CASCADE) — links payout to the completed draw/cycle
  - `cycle_number` (integer, not null) — denormalized for easy display
  - `winner_type` (text, 'full' | 'pair') — denormalized from draw
  - `winner_member_id` (uuid, nullable) — for full member winners
  - `winner_pair_id` (uuid, nullable) — for half-pair winners
  - `total_payout` (numeric, not null) — installment_amount × cycles_count
  - `member1_payout` (numeric, nullable) — for half pairs, individual payout of member1
  - `member2_payout` (numeric, nullable) — for half pairs, individual payout of member2
  - `payout_date` (date, nullable) — when the payout was paid
  - `status` (text, not null, default 'pending') — 'pending' | 'paid'
  - `note` (text, nullable) — optional organizer note
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `payouts`.
- Allow anon + authenticated full CRUD (single-tenant, no auth app).

3. Indexes
- Index on `chitty_id` for filtering payouts by chitty.
- Unique constraint on `draw_id` so each completed draw has at most one payout record.
*/

CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chitty_id uuid NOT NULL REFERENCES chitties(id) ON DELETE CASCADE,
  draw_id uuid NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  cycle_number integer NOT NULL,
  winner_type text NOT NULL CHECK (winner_type IN ('full', 'pair')),
  winner_member_id uuid,
  winner_pair_id uuid,
  total_payout numeric(12,2) NOT NULL,
  member1_payout numeric(12,2),
  member2_payout numeric(12,2),
  payout_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payouts_chitty_id ON payouts(chitty_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_draw_id_unique ON payouts(draw_id);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_payouts" ON payouts;
CREATE POLICY "anon_select_payouts" ON payouts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_payouts" ON payouts;
CREATE POLICY "anon_insert_payouts" ON payouts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_payouts" ON payouts;
CREATE POLICY "anon_update_payouts" ON payouts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_payouts" ON payouts;
CREATE POLICY "anon_delete_payouts" ON payouts FOR DELETE
  TO anon, authenticated USING (true);
