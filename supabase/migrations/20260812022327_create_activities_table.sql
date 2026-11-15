/*
# Create activities table

1. New Tables
- `activities`
  - `id` (uuid, primary key)
  - `chitty_id` (uuid, FK to chitties, ON DELETE CASCADE)
  - `action` (text, not null) — the type of action performed
  - `description` (text, not null) — human-readable description of the action
  - `meta` (jsonb, nullable) — optional structured data (member name, amount, cycle number, etc.)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `activities`.
- Allow anon + authenticated full CRUD (single-tenant, no auth app).

3. Indexes
- Index on `chitty_id` for filtering activities by chitty.
- Index on `created_at` for chronological ordering.
*/

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chitty_id uuid NOT NULL REFERENCES chitties(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text NOT NULL,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_chitty_id ON activities(chitty_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_activities" ON activities;
CREATE POLICY "anon_select_activities" ON activities FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_activities" ON activities;
CREATE POLICY "anon_insert_activities" ON activities FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_activities" ON activities;
CREATE POLICY "anon_update_activities" ON activities FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_activities" ON activities;
CREATE POLICY "anon_delete_activities" ON activities FOR DELETE
  TO anon, authenticated USING (true);
