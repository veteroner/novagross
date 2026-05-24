-- Add bank info columns to store_applications so we don't store them as text in admin_notes
ALTER TABLE store_applications
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS account_holder text,
  ADD COLUMN IF NOT EXISTS company_name text;

COMMENT ON COLUMN store_applications.bank_name IS 'Bank name for payout';
COMMENT ON COLUMN store_applications.iban IS 'IBAN for payout';
COMMENT ON COLUMN store_applications.account_holder IS 'Bank account holder name';
COMMENT ON COLUMN store_applications.company_name IS 'Company/business name';
