/*
# Create chitties table

1. Purpose
- Stores Chitty/Kuri records created by the organizer.
- This is a single-tenant app with no sign-in screen, so all rows are
  intentionally shared/public and accessible by the anon-key frontend.

2. New Table: chitties
- id (uuid, primary key)
- name (text, not null) — display name of the Chitty
- description (text, nullable) — optional freeform description
- installment_amount (numeric, not null) — amount each member pays per installment
- members_count (int, not null) — number of members participating
- cycles_count (int, not null) — total number of installment cycles
- frequency (text, not null) — 'monthly' or 'custom'
- start_date (date, not null) — when the Chitty begins
- selection_method (text, not null) — 'lucky_draw' or 'manual'
- rules (text, nullable) — optional rules/terms text
- status (text, not null, default 'draft') — lifecycle status
- created_at (timestamptz, default now())

3. Security
- Enable RLS on chitties.
- Allow anon + authenticated full CRUD because the data is intentionally
  public/shared in this single-tenant, no-auth app.

4. Notes
- status defaults to 'draft' so newly created Chitties start as Draft.
- CHECK constraints keep frequency, selection_method, and status values valid.
*/

CREATE TABLE IF NOT EXISTS chitties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  installment_amount numeric(12, 2) NOT NULL CHECK (installment_amount > 0),
  members_count integer NOT NULL CHECK (members_count > 0),
  cycles_count integer NOT NULL CHECK (cycles_count > 0),
  frequency text NOT NULL CHECK (frequency IN ('monthly', 'custom')),
  start_date date NOT NULL,
  selection_method text NOT NULL CHECK (selection_method IN ('lucky_draw', 'manual')),
  rules text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chitties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chitties" ON chitties;
CREATE POLICY "anon_select_chitties" ON chitties FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chitties" ON chitties;
CREATE POLICY "anon_insert_chitties" ON chitties FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chitties" ON chitties;
CREATE POLICY "anon_update_chitties" ON chitties FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chitties" ON chitties;
CREATE POLICY "anon_delete_chitties" ON chitties FOR DELETE
  TO anon, authenticated USING (true);
