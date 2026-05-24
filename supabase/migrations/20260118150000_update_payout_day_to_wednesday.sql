-- ============================================================================
-- Update payout schedule: 20 business days + next Wednesday
-- ============================================================================
-- Reason:
-- - Business decision: payouts are processed weekly on Wednesdays.
-- - Existing schema uses store_transactions.payout_date which is computed via
--   calculate_payout_date(order_date) inside process_order_commissions().
-- - Updating this function affects future calculations; existing rows keep their
--   previously computed payout_date unless you explicitly update them.

CREATE OR REPLACE FUNCTION public.calculate_payout_date(order_date TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  business_days INTEGER := 0;
  calc_date TIMESTAMPTZ := order_date;
BEGIN
  -- Add 20 business days (Mon-Fri)
  WHILE business_days < 20 LOOP
    calc_date := calc_date + INTERVAL '1 day';
    IF EXTRACT(DOW FROM calc_date) NOT IN (0, 6) THEN
      business_days := business_days + 1;
    END IF;
  END LOOP;

  -- Move forward to the next Wednesday (DOW: 0=Sun, 1=Mon, 2=Tue, 3=Wed)
  WHILE EXTRACT(DOW FROM calc_date) != 3 LOOP
    calc_date := calc_date + INTERVAL '1 day';
  END LOOP;

  RETURN calc_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
