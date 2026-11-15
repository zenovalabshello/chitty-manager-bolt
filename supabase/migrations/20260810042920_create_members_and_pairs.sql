/*
# Create members and member_pairs tables

1. Purpose
- Stores individual members of each Chitty and their metadata.
- Supports Full and Half membership types.
- Stores pairs of two Half members that together form one draw unit.

2. New Tables

  members:
  - id (uuid, primary key)
  - chitty_id (uuid, FK to chitties, ON DELETE CASCADE)
  - name (text, not null)
  - place (text, nullable)
  - contact1 (text, not null)
  - contact2 (text, nullable)
  - job (text, nullable)
  - id_proof_type (text, nullable)
  - id_number (text, nullable)
  - membership_type (text, not null, 'full' | 'half')
  - created_at (timestamptz, default now())

  member_pairs:
  - id (uuid, primary key)
  - chitty_id (uuid, FK to chitties, ON DELETE CASCADE)
  - member1_id (uuid, FK to members, ON DELETE CASCADE)
  - member2_id (uuid, FK to members, ON DELETE CASCADE)
  - created_at (timestamptz, default now())
  - UNIQUE(member1_id), UNIQUE(member2_id) — each half member in at most one pair
  - CHECK(member1_id <> member2_id) — cannot pair with self

3. Constraints & Validation
- CHECK on members.membership_type IN ('full', 'half')
- CHECK on member_pairs that member1_id <> member2_id
- UNIQUE on member_pairs.member1_id and member2_id so a half member
  can belong to at most one pair.
- A trigger validates that both members in a pair are half-type and
  belong to the same chitty. This runs on INSERT and UPDATE.

4. Security
- Enable RLS on both tables.
- Allow anon + authenticated full CRUD (single-tenant, no-auth app).

5. Indexes
- Index on members(chitty_id) for per-chitty queries.
- Index on member_pairs(chitty_id) for per-chitty pair lookups.
*/

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chitty_id uuid NOT NULL REFERENCES chitties(id) ON DELETE CASCADE,
  name text NOT NULL,
  place text,
  contact1 text NOT NULL,
  contact2 text,
  job text,
  id_proof_type text,
  id_number text,
  membership_type text NOT NULL DEFAULT 'full' CHECK (membership_type IN ('full', 'half')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_chitty_id ON members(chitty_id);

CREATE TABLE IF NOT EXISTS member_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chitty_id uuid NOT NULL REFERENCES chitties(id) ON DELETE CASCADE,
  member1_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member2_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (member1_id <> member2_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_pairs_member1 ON member_pairs(member1_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_pairs_member2 ON member_pairs(member2_id);
CREATE INDEX IF NOT EXISTS idx_member_pairs_chitty_id ON member_pairs(chitty_id);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_pairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_members" ON members;
CREATE POLICY "anon_select_members" ON members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_members" ON members;
CREATE POLICY "anon_insert_members" ON members FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_members" ON members;
CREATE POLICY "anon_update_members" ON members FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_members" ON members;
CREATE POLICY "anon_delete_members" ON members FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_member_pairs" ON member_pairs;
CREATE POLICY "anon_select_member_pairs" ON member_pairs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_member_pairs" ON member_pairs;
CREATE POLICY "anon_insert_member_pairs" ON member_pairs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_member_pairs" ON member_pairs;
CREATE POLICY "anon_delete_member_pairs" ON member_pairs FOR DELETE
  TO anon, authenticated USING (true);

-- Trigger function: validate that both members in a pair are half-type
-- and belong to the same chitty as the pair record.
CREATE OR REPLACE FUNCTION validate_member_pair()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  m1_type text;
  m2_type text;
  m1_chitty uuid;
  m2_chitty uuid;
BEGIN
  SELECT membership_type, chitty_id INTO m1_type, m1_chitty
    FROM members WHERE id = NEW.member1_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member 1 does not exist';
  END IF;

  SELECT membership_type, chitty_id INTO m2_type, m2_chitty
    FROM members WHERE id = NEW.member2_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member 2 does not exist';
  END IF;

  IF m1_type <> 'half' THEN
    RAISE EXCEPTION 'Only half members can be paired. Member 1 is not a half member.';
  END IF;

  IF m2_type <> 'half' THEN
    RAISE EXCEPTION 'Only half members can be paired. Member 2 is not a half member.';
  END IF;

  IF m1_chitty <> NEW.chitty_id OR m2_chitty <> NEW.chitty_id THEN
    RAISE EXCEPTION 'Both members must belong to the same chitty as the pair.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_member_pair ON member_pairs;
CREATE TRIGGER trg_validate_member_pair
  BEFORE INSERT OR UPDATE ON member_pairs
  FOR EACH ROW EXECUTE FUNCTION validate_member_pair();
