-- ============================================================================
-- Weekly Payout Batch (Wednesday)
-- ============================================================================
-- Adds:
-- - weekly_payout_runs: audit log per store per payout run date
-- - get_weekly_payout_candidates(as_of): list payable amounts by store
-- - mark_weekly_payouts_paid(as_of, reference, processed_by): mark eligible sales as paid
--
-- Notes:
-- - This implements a minimal, idempotent payout run: it only touches
--   store_transactions rows with type='sale' and is_paid=false.
-- - run_date is constrained to Wednesday for actual marking.

CREATE TABLE IF NOT EXISTS public.weekly_payout_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  reference TEXT,
  processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email_sent_at TIMESTAMPTZ,
  email_sent_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (run_date, store_id)
);

-- Backward-compatible: if the table already exists from a prior run, ensure columns exist.
ALTER TABLE public.weekly_payout_runs
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

ALTER TABLE public.weekly_payout_runs
  ADD COLUMN IF NOT EXISTS email_sent_error TEXT;

COMMENT ON TABLE public.weekly_payout_runs IS 'Weekly payout audit log per store per run date (Wednesday).';

-- --------------------------------------------------------------------------
-- Candidate listing
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_weekly_payout_candidates(p_as_of DATE)
RETURNS TABLE (
  store_id UUID,
  store_name TEXT,
  bank_name TEXT,
  iban TEXT,
  account_holder TEXT,
  amount DECIMAL(12,2),
  sale_count INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    s.id AS store_id,
    s.store_name,
    s.bank_name,
    s.iban,
    s.account_holder,
    COALESCE(SUM(st.amount), 0)::DECIMAL(12,2) AS amount,
    COUNT(*)::INTEGER AS sale_count
  FROM public.store_transactions st
  JOIN public.stores s ON s.id = st.store_id
  LEFT JOIN public.orders o ON o.id = st.order_id
  WHERE st.type = 'sale'
    AND COALESCE(st.is_paid, false) = false
    AND st.payout_date IS NOT NULL
    AND (st.payout_date::date) <= p_as_of
    AND (o.id IS NULL OR (COALESCE(o.payment_status, '') = 'paid' AND COALESCE(o.status, '') <> 'cancelled'))
  GROUP BY s.id, s.store_name, s.bank_name, s.iban, s.account_holder
  HAVING COALESCE(SUM(st.amount), 0) > 0
  ORDER BY amount DESC;
$$;

-- --------------------------------------------------------------------------
-- Mark paid (Wednesday-only)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_weekly_payouts_paid(
  p_as_of DATE,
  p_reference TEXT DEFAULT NULL,
  p_processed_by UUID DEFAULT NULL
)
RETURNS TABLE (
  run_date DATE,
  stores_marked INTEGER,
  sales_marked INTEGER,
  total_amount DECIMAL(12,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_dow INTEGER;
  v_stores_marked INTEGER := 0;
  v_sales_marked INTEGER := 0;
  v_total_amount DECIMAL(12,2) := 0;
BEGIN
  -- Enforce Wednesday (0=Sun, 1=Mon, 2=Tue, 3=Wed)
  v_dow := EXTRACT(DOW FROM p_as_of::timestamptz);
  IF v_dow <> 3 THEN
    RAISE EXCEPTION 'Payout batch can only be marked as paid on Wednesday. Provided date: %', p_as_of;
  END IF;

  -- Insert audit rows for stores that have payable balance as of p_as_of.
  WITH candidates AS (
    SELECT
      st.store_id,
      SUM(st.amount)::DECIMAL(12,2) AS amount
    FROM public.store_transactions st
    LEFT JOIN public.orders o ON o.id = st.order_id
    WHERE st.type = 'sale'
      AND COALESCE(st.is_paid, false) = false
      AND st.payout_date IS NOT NULL
      AND (st.payout_date::date) <= p_as_of
      AND (o.id IS NULL OR (COALESCE(o.payment_status, '') = 'paid' AND COALESCE(o.status, '') <> 'cancelled'))
    GROUP BY st.store_id
    HAVING SUM(st.amount) > 0
  ), inserted AS (
    INSERT INTO public.weekly_payout_runs (run_date, store_id, amount, reference, processed_by)
    SELECT p_as_of, c.store_id, c.amount, p_reference, p_processed_by
    FROM candidates c
    ON CONFLICT (run_date, store_id) DO NOTHING
    RETURNING store_id, amount
  ), updated_sales AS (
    UPDATE public.store_transactions st
    SET is_paid = true
    FROM inserted i
    LEFT JOIN public.orders o ON o.id = st.order_id
    WHERE st.store_id = i.store_id
      AND st.type = 'sale'
      AND COALESCE(st.is_paid, false) = false
      AND st.payout_date IS NOT NULL
      AND (st.payout_date::date) <= p_as_of
      AND (o.id IS NULL OR (COALESCE(o.payment_status, '') = 'paid' AND COALESCE(o.status, '') <> 'cancelled'))
    RETURNING st.id
  )
  SELECT
    COALESCE((SELECT COUNT(*) FROM inserted), 0)::INTEGER,
    COALESCE((SELECT COUNT(*) FROM updated_sales), 0)::INTEGER,
    COALESCE((SELECT SUM(amount) FROM inserted), 0)::DECIMAL(12,2)
  INTO v_stores_marked, v_sales_marked, v_total_amount;

  -- Update store_balance to reflect cash-out from pending.
  -- (We treat matured sales as payable directly; a separate settlement step can be added later.)
  UPDATE public.store_balance sb
  SET
    pending_balance = GREATEST(sb.pending_balance - i.amount, 0),
    total_withdrawn = sb.total_withdrawn + i.amount,
    last_payout_date = NOW(),
    next_payout_date = (p_as_of::timestamptz + INTERVAL '7 days'),
    updated_at = NOW()
  FROM inserted i
  WHERE sb.store_id = i.store_id;

  -- Ensure store_balance rows exist (should already exist, but be defensive)
  INSERT INTO public.store_balance (store_id, pending_balance)
  SELECT i.store_id, 0
  FROM inserted i
  ON CONFLICT (store_id) DO NOTHING;

  RETURN QUERY
  SELECT p_as_of, v_stores_marked, v_sales_marked, v_total_amount;
END;
$$;
