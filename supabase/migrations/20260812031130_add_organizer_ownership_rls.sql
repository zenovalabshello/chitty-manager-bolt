/*
# Add organizer ownership and secure all tables with authenticated-only RLS

1. Purpose
- Convert the app from single-tenant (anon-accessible) to multi-tenant
  (authenticated organizer, each seeing only their own data).
- Add `user_id` column to `chitties` so each Chitty has an owner.
- Replace all existing `anon`-permissive policies with `authenticated`-only,
  owner-scoped policies on every table.

2. Schema Changes
- `chitties.user_id` (uuid, NOT NULL, DEFAULT auth.uid(), FK to auth.users
  ON DELETE CASCADE) — the organizer who owns this Chitty.
- Existing rows are deleted since they have no owner (pre-production, no
  real data to preserve).

3. Security Changes (all tables)
- Drop ALL existing `anon_*` policies on every table.
- `chitties`: owner-scoped CRUD via `auth.uid() = user_id`.
- `members`: scoped through parent chitty ownership.
- `member_pairs`: scoped through parent chitty ownership.
- `payments`: scoped through parent chitty ownership.
- `draws`: scoped through parent chitty ownership.
- `payouts`: scoped through parent chitty ownership.
- `activities`: scoped through parent chitty ownership.
- All policies are `TO authenticated` only — anon gets zero access.
- `user_id` defaults to `auth.uid()` so inserts that omit it still pass
  the WITH CHECK ownership predicate.

4. Important Notes
- Child tables do NOT get their own `user_id` column; they are secured
  by checking ownership of their parent chitty via EXISTS subqueries.
- Pre-existing rows in all tables are deleted because they have no owner
  and would be invisible to all authenticated users anyway.
*/

-- ============================================================
-- Step 1: Add user_id to chitties (nullable first, then enforce)
-- ============================================================
ALTER TABLE chitties
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Delete existing ownerless rows (pre-production, no real data)
DELETE FROM chitties;

-- Now enforce NOT NULL and set default for future inserts
ALTER TABLE chitties ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE chitties ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_chitties_user_id ON chitties(user_id);

-- ============================================================
-- Step 2: Replace chitties policies (owner-scoped)
-- ============================================================
DROP POLICY IF EXISTS "anon_select_chitties" ON chitties;
DROP POLICY IF EXISTS "anon_insert_chitties" ON chitties;
DROP POLICY IF EXISTS "anon_update_chitties" ON chitties;
DROP POLICY IF EXISTS "anon_delete_chitties" ON chitties;

DROP POLICY IF EXISTS "select_own_chitties" ON chitties;
CREATE POLICY "select_own_chitties" ON chitties FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chitties" ON chitties;
CREATE POLICY "insert_own_chitties" ON chitties FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chitties" ON chitties;
CREATE POLICY "update_own_chitties" ON chitties FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chitties" ON chitties;
CREATE POLICY "delete_own_chitties" ON chitties FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Step 3: Replace members policies (scoped through chitties)
-- ============================================================
DROP POLICY IF EXISTS "anon_select_members" ON members;
DROP POLICY IF EXISTS "anon_insert_members" ON members;
DROP POLICY IF EXISTS "anon_update_members" ON members;
DROP POLICY IF EXISTS "anon_delete_members" ON members;

DROP POLICY IF EXISTS "select_own_members" ON members;
CREATE POLICY "select_own_members" ON members FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = members.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_members" ON members;
CREATE POLICY "insert_own_members" ON members FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = members.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_members" ON members;
CREATE POLICY "update_own_members" ON members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = members.chitty_id AND chitties.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = members.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_members" ON members;
CREATE POLICY "delete_own_members" ON members FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = members.chitty_id AND chitties.user_id = auth.uid())
  );

-- ============================================================
-- Step 4: Replace member_pairs policies (scoped through chitties)
-- ============================================================
DROP POLICY IF EXISTS "anon_select_member_pairs" ON member_pairs;
DROP POLICY IF EXISTS "anon_insert_member_pairs" ON member_pairs;
DROP POLICY IF EXISTS "anon_delete_member_pairs" ON member_pairs;

DROP POLICY IF EXISTS "select_own_member_pairs" ON member_pairs;
CREATE POLICY "select_own_member_pairs" ON member_pairs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = member_pairs.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_member_pairs" ON member_pairs;
CREATE POLICY "insert_own_member_pairs" ON member_pairs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = member_pairs.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_member_pairs" ON member_pairs;
CREATE POLICY "delete_own_member_pairs" ON member_pairs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = member_pairs.chitty_id AND chitties.user_id = auth.uid())
  );

-- ============================================================
-- Step 5: Replace payments policies (scoped through chitties)
-- ============================================================
DROP POLICY IF EXISTS "anon_select_payments" ON payments;
DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
DROP POLICY IF EXISTS "anon_delete_payments" ON payments;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = payments.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = payments.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_payments" ON payments;
CREATE POLICY "delete_own_payments" ON payments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = payments.chitty_id AND chitties.user_id = auth.uid())
  );

-- ============================================================
-- Step 6: Replace draws policies (scoped through chitties)
-- ============================================================
DROP POLICY IF EXISTS "anon_select_draws" ON draws;
DROP POLICY IF EXISTS "anon_insert_draws" ON draws;
DROP POLICY IF EXISTS "anon_delete_draws" ON draws;

DROP POLICY IF EXISTS "select_own_draws" ON draws;
CREATE POLICY "select_own_draws" ON draws FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = draws.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_draws" ON draws;
CREATE POLICY "insert_own_draws" ON draws FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = draws.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_draws" ON draws;
CREATE POLICY "delete_own_draws" ON draws FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = draws.chitty_id AND chitties.user_id = auth.uid())
  );

-- ============================================================
-- Step 7: Replace payouts policies (scoped through chitties)
-- ============================================================
DROP POLICY IF EXISTS "anon_select_payouts" ON payouts;
DROP POLICY IF EXISTS "anon_insert_payouts" ON payouts;
DROP POLICY IF EXISTS "anon_update_payouts" ON payouts;
DROP POLICY IF EXISTS "anon_delete_payouts" ON payouts;

DROP POLICY IF EXISTS "select_own_payouts" ON payouts;
CREATE POLICY "select_own_payouts" ON payouts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = payouts.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_payouts" ON payouts;
CREATE POLICY "insert_own_payouts" ON payouts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = payouts.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_payouts" ON payouts;
CREATE POLICY "update_own_payouts" ON payouts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = payouts.chitty_id AND chitties.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = payouts.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_payouts" ON payouts;
CREATE POLICY "delete_own_payouts" ON payouts FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = payouts.chitty_id AND chitties.user_id = auth.uid())
  );

-- ============================================================
-- Step 8: Replace activities policies (scoped through chitties)
-- ============================================================
DROP POLICY IF EXISTS "anon_select_activities" ON activities;
DROP POLICY IF EXISTS "anon_insert_activities" ON activities;
DROP POLICY IF EXISTS "anon_update_activities" ON activities;
DROP POLICY IF EXISTS "anon_delete_activities" ON activities;

DROP POLICY IF EXISTS "select_own_activities" ON activities;
CREATE POLICY "select_own_activities" ON activities FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = activities.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_activities" ON activities;
CREATE POLICY "insert_own_activities" ON activities FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = activities.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_activities" ON activities;
CREATE POLICY "update_own_activities" ON activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = activities.chitty_id AND chitties.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = activities.chitty_id AND chitties.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_activities" ON activities;
CREATE POLICY "delete_own_activities" ON activities FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM chitties WHERE chitties.id = activities.chitty_id AND chitties.user_id = auth.uid())
  );
