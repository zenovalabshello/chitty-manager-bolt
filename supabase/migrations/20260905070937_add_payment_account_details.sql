/*
# Add payment account details to chitties

1. Purpose
- Allow the organizer to optionally save bank/UPI payment details for a Chitty
  so members know where to send installment payments.
- All fields are optional; a Chitty can be created and used without any
  payment account details.

2. Changes
- Add `payment_account_details` JSONB column to `chitties` table (nullable).
- Stores an object with optional keys: account_holder_name, account_number,
  ifsc_code, upi_number, bank_name.
- Defaults to NULL when no details are provided.

3. Security
- No RLS policy changes needed. The existing chitties CRUD policies already
  cover the new column since it is on the same table.

4. Notes
- JSONB is used so all fields are optional and the structure can be read
  directly by the frontend without a separate table.
- Existing rows will have NULL for this column, which the frontend treats
  as "no payment details saved."
*/

ALTER TABLE chitties
  ADD COLUMN IF NOT EXISTS payment_account_details jsonb;
