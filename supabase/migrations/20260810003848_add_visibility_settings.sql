/*
# Add visibility_settings column to chitties

1. Changes
- Add `visibility_settings` (jsonb, not null, with default) to the `chitties` table.
- Stores per-chitty sharing/visibility preferences that control what members
  can see through their personal links (UI-only for now; the member-link system
  is not implemented yet).

2. Default values
- All visibility options default to true (visible) except `other_members`,
  which defaults to false for privacy.

3. Security
- No policy changes needed. The existing anon/authenticated CRUD policies on
  `chitties` already cover the new column.
*/

ALTER TABLE chitties
  ADD COLUMN IF NOT EXISTS visibility_settings jsonb NOT NULL DEFAULT '{
    "chitty_info": true,
    "own_details": true,
    "installment_info": true,
    "own_payment_history": true,
    "own_pending_amount": true,
    "draw_status": true,
    "draw_history": true,
    "winner_info": true,
    "payout_info": true,
    "other_members": false
  }'::jsonb;
