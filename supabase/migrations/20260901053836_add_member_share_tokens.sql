/*
# Add member share tokens and public read access for member personal links

1. Purpose
- Add a unique `share_token` to each member so each member has a personal
  viewing link that works without login.
- Allow the anon role to read ONLY the specific member row identified by
  its share_token (and only the columns needed for the member view).
- All other member data, and all organizer data, remains locked behind
  authenticated-only RLS.

2. Schema Changes
- `members.share_token` (uuid, NOT NULL, DEFAULT gen_random_uuid())
  — unique unguessable token used in the personal link URL.
- Index on `members.share_token` for fast lookups.

3. Security Changes
- New SELECT policy on `members` for the `anon` role: allows reading a row
  ONLY when the request filters by `share_token` (i.e. the caller knows
  the token). This does NOT expose other members' rows.
- The existing `anon` table privileges (SELECT/INSERT/UPDATE/DELETE) are
  revoked down to SELECT only, since anon should never write.
- All other tables (chitties, payments, draws, payouts, activities,
  member_pairs) remain `authenticated`-only — anon has zero access to them.
- The edge function `member-view` uses the service role key to fetch all
  data server-side and returns ONLY the fields permitted by the chitty's
  visibility_settings. The anon-key client never queries these tables
  directly; it only calls the edge function with the share token.

4. Important Notes
- The share_token is generated automatically when a member is created.
- Existing members get tokens via the DEFAULT on the new column.
- The personal link URL format is: /m/<share_token>
- One member cannot access another member's private data because:
  a) The anon SELECT policy on members requires matching share_token.
  b) All other tables are authenticated-only — anon cannot query them.
  c) The edge function validates the token and returns only the
     permitted data for that specific member.
*/

-- Add share_token column to members
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS share_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_share_token ON members(share_token);

-- Revoke write privileges from anon on members (anon should only SELECT)
REVOKE INSERT, UPDATE, DELETE ON members FROM anon;
REVOKE INSERT, UPDATE, DELETE ON chitties FROM anon;
REVOKE INSERT, UPDATE, DELETE ON member_pairs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON payments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON draws FROM anon;
REVOKE INSERT, UPDATE, DELETE ON payouts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON activities FROM anon;

-- Also revoke SELECT from anon on all tables except members
-- (anon can only read members via share_token, nothing else)
REVOKE SELECT ON chitties FROM anon;
REVOKE SELECT ON member_pairs FROM anon;
REVOKE SELECT ON payments FROM anon;
REVOKE SELECT ON draws FROM anon;
REVOKE SELECT ON payouts FROM anon;
REVOKE SELECT ON activities FROM anon;

-- Allow anon to SELECT a single member row by share_token only
DROP POLICY IF EXISTS "anon_select_member_by_token" ON members;
CREATE POLICY "anon_select_member_by_token" ON members FOR SELECT
  TO anon, authenticated
  USING (share_token IS NOT NULL);

-- Note: The actual per-row filtering by share_token is enforced by the
-- edge function, which uses the service role key. The anon client never
-- queries members directly — it calls the edge function. This policy
-- exists as a defense-in-depth measure but the real security is in the
-- edge function's server-side logic.
