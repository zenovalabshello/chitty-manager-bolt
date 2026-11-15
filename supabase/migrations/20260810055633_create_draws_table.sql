/*
# Create draws table

1. Purpose
- Permanently stores completed draw results for each Chitty.
- Each draw is associated with a specific cycle/draw number.
- Records the winning draw unit (either a full member or a half-member pair),
  the selection method used, and the date/time of the draw.

2. New Table: draws
- id (uuid, primary key)
- chitty_id (uuid, FK to chitties, ON DELETE CASCADE)
- cycle_number (int, not null, > 0) — which cycle this draw belongs to
- winner_type (text, not null, 'full' | 'pair') — whether the winner is a full member or a half pair
- winner_member_id (uuid, FK to members, nullable) — set when winner_type = 'full'
- winner_pair_id (uuid, FK to member_pairs, nullable) — set when winner_type = 'pair'
- selection_method (text, not null, 'lucky_draw' | 'manual') — method used for this draw
- drawn_at (timestamptz, not null, default now()) — when the draw was completed
- created_at (timestamptz, default now())

3. Constraints
- UNIQUE(chitty_id, cycle_number) — one draw per cycle, prevents duplicate draws
- CHECK(winner_type IN ('full', 'pair'))
- CHECK(selection_method IN ('lucky_draw', 'manual'))
- CHECK(
    (winner_type = 'full' AND winner_member_id IS NOT NULL AND winner_pair_id IS NULL)
    OR
    (winner_type = 'pair' AND winner_pair_id IS NOT NULL AND winner_member_id IS NULL)
  ) — exactly one winner reference depending on type

4. Security
- Enable RLS on draws.
- Allow anon + authenticated full CRUD (single-tenant, no-auth app).
- Only INSERT and SELECT are needed by the app, but we allow DELETE for
  potential admin cleanup (the app itself never deletes draws).

5. Indexes
- Index on draws(chitty_id) for per-chitty queries.
- Index on draws(chitty_id, cycle_number) for cycle lookups.
*/

CREATE TABLE IF NOT EXISTS draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chitty_id uuid NOT NULL REFERENCES chitties(id) ON DELETE CASCADE,
  cycle_number integer NOT NULL CHECK (cycle_number > 0),
  winner_type text NOT NULL CHECK (winner_type IN ('full', 'pair')),
  winner_member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  winner_pair_id uuid REFERENCES member_pairs(id) ON DELETE SET NULL,
  selection_method text NOT NULL CHECK (selection_method IN ('lucky_draw', 'manual')),
  drawn_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT draws_one_winner CHECK (
    (winner_type = 'full' AND winner_member_id IS NOT NULL AND winner_pair_id IS NULL)
    OR
    (winner_type = 'pair' AND winner_pair_id IS NOT NULL AND winner_member_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_draws_chitty_cycle ON draws(chitty_id, cycle_number);
CREATE INDEX IF NOT EXISTS idx_draws_chitty_id ON draws(chitty_id);

ALTER TABLE draws ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_draws" ON draws;
CREATE POLICY "anon_select_draws" ON draws FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_draws" ON draws;
CREATE POLICY "anon_insert_draws" ON draws FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_draws" ON draws;
CREATE POLICY "anon_delete_draws" ON draws FOR DELETE
  TO anon, authenticated USING (true);
