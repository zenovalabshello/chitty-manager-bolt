/*
# Create payments table

1. Purpose
- Stores individual payment transactions for each member per cycle.
- Supports full, half, and partial/chunk payments.
- Multiple payments can be recorded against the same member and cycle
  without overwriting previous ones.

2. New Table: payments
- id (uuid, primary key)
- chitty_id (uuid, FK to chitties, ON DELETE CASCADE)
- member_id (uuid, FK to members, ON DELETE CASCADE)
- cycle_number (int, not null) — which installment cycle (1-based)
- amount (numeric, not null, > 0) — the payment amount
- collection_date (date, not null) — when the payment was collected
- created_at (timestamptz, default now())

3. Security
- Enable RLS on payments.
- Allow anon + authenticated full CRUD (single-tenant, no-auth app).

4. Indexes
- Index on payments(chitty_id) for per-chitty queries.
- Index on payments(member_id, cycle_number) for per-member-per-cycle lookups.
- Index on payments(chitty_id, cycle_number) for per-cycle collection totals.

5. Notes
- The source of truth for "how much a member has paid for a cycle" is the
  SUM of all payment rows for that member + cycle, not a single field.
- Expected installment per member is derived from the Chitty's
  installment_amount and the member's membership_type:
    Full member → installment_amount
    Half member  → installment_amount / 2
*/

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chitty_id uuid NOT NULL REFERENCES chitties(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  cycle_number integer NOT NULL CHECK (cycle_number > 0),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  collection_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_chitty_id ON payments(chitty_id);
CREATE INDEX IF NOT EXISTS idx_payments_member_cycle ON payments(member_id, cycle_number);
CREATE INDEX IF NOT EXISTS idx_payments_chitty_cycle ON payments(chitty_id, cycle_number);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_payments" ON payments;
CREATE POLICY "anon_select_payments" ON payments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
CREATE POLICY "anon_insert_payments" ON payments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_payments" ON payments;
CREATE POLICY "anon_delete_payments" ON payments FOR DELETE
  TO anon, authenticated USING (true);
