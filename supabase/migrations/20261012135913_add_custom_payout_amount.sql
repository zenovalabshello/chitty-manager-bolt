/*
# Add custom_payout_amount to payouts table

1. Purpose
- Allow the organizer to optionally enter a custom payout amount for a
  specific cycle, overriding the default calculated payout.

2. Changes
- Add `custom_payout_amount` numeric(12,2) column to `payouts` (nullable).
- When NULL, the existing `total_payout` (default calculation) is used.
- When set, the custom amount is the actual payout for that cycle.

3. Security
- No RLS policy changes. The existing payouts CRUD policies already
  cover the new column since it is on the same table.

4. Notes
- Only affects the cycle where the custom amount is saved.
- Default payout calculation for other cycles is unchanged.
- Existing rows will have NULL for this column, meaning the default
  payout is used — no behavior change for existing data.
*/

ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS custom_payout_amount numeric(12,2);
