-- =====================================================
-- Payout V2: 14-day return period from delivered_at
-- =====================================================
-- Türk Tüketici Kanunu (6502) gereği müşterinin 14 günlük yasal
-- iade hakkı vardır. Bu süre teslim tarihinden başlar. Bu süre
-- dolmadan satıcıya ödeme yapılamaz.
--
-- Bu migration:
--   1. orders tablosuna delivered_at, return_deadline ekler
--   2. status='delivered' olunca delivered_at + return_deadline'ı
--      otomatik dolduran trigger ekler
--   3. payment_status='paid' olunca process_order_commissions'ı
--      otomatik çağıran trigger ekler
--   4. calculate_payout_date'i delivered_at temelli yeniden tanımlar
--   5. delivered_at güncellendiğinde mevcut store_transactions'ın
--      payout_date'ini güncelleyen trigger ekler
--   6. Mevcut "stuck" verileri (geçmişte teslim olmuş ama
--      transaction'sız siparişler) backfill eder
-- =====================================================

-- ============================================================
-- 1. orders tablosuna delivered_at, return_deadline ekle
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_deadline TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.delivered_at IS 'Sipariş müşteriye teslim edildiği zaman damgası';
COMMENT ON COLUMN public.orders.return_deadline IS 'Yasal 14 günlük iade hakkının sona erdiği tarih';

CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_orders_return_deadline ON public.orders(return_deadline);

-- ============================================================
-- 2. Trigger: status='delivered' olunca delivered_at + return_deadline doldur
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_delivered_at_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only when status changes to 'delivered' for the first time
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered' OR OLD.delivered_at IS NULL) THEN
    NEW.delivered_at := COALESCE(NEW.delivered_at, NOW());
    NEW.return_deadline := COALESCE(NEW.return_deadline, NEW.delivered_at + INTERVAL '14 days');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_delivered_at_on_status_change ON public.orders;
CREATE TRIGGER trg_set_delivered_at_on_status_change
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_delivered_at_on_status_change();

-- ============================================================
-- 3. calculate_payout_date_from_delivered: yeni formül
--    delivered_at + 14 gün iade süresi + sonraki Çarşamba
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_payout_date_from_delivered(p_delivered TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_after_return TIMESTAMPTZ;
BEGIN
  IF p_delivered IS NULL THEN
    RETURN NULL;
  END IF;

  -- 14 gün iade süresi sonu
  v_after_return := p_delivered + INTERVAL '14 days';

  -- Sonraki Çarşamba'ya ilerle (DOW: 0=Sun, 3=Wed)
  WHILE EXTRACT(DOW FROM v_after_return) <> 3 LOOP
    v_after_return := v_after_return + INTERVAL '1 day';
  END LOOP;

  RETURN v_after_return;
END;
$$;

COMMENT ON FUNCTION public.calculate_payout_date_from_delivered IS
  'Teslim tarihi + 14 gün iade süresi + sonraki Çarşamba. NULL teslim → NULL payout.';

-- ============================================================
-- 4. process_order_commissions: yeniden tanımla
--    Artık payout_date NULL ile başlar (teslim sonrası set edilir)
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_order_commissions(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
  store_balance_rec RECORD;
  commission DECIMAL(12,2);
  seller_amount DECIMAL(12,2);
BEGIN
  -- Idempotent: skip if any sale transaction already exists for this order
  IF EXISTS (
    SELECT 1 FROM public.store_transactions
    WHERE order_id = p_order_id AND type = 'sale'
  ) THEN
    RAISE NOTICE 'process_order_commissions: transactions already exist for order %, skipping', p_order_id;
    RETURN;
  END IF;

  FOR item IN
    SELECT
      oi.id AS item_id,
      oi.store_id,
      oi.price,
      oi.quantity,
      COALESCE(oi.commission_rate, s.commission_rate, 15.00) AS commission_rate,
      o.delivered_at
    FROM public.order_items oi
    JOIN public.stores s ON s.id = oi.store_id
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.order_id = p_order_id AND oi.store_id IS NOT NULL
  LOOP
    commission := (item.price * item.quantity) * (item.commission_rate / 100);
    seller_amount := (item.price * item.quantity) - commission;

    UPDATE public.order_items
    SET
      commission_amount = commission,
      commission_rate = item.commission_rate,
      seller_amount = seller_amount
    WHERE id = item.item_id;

    INSERT INTO public.store_balance (store_id, pending_balance, available_balance)
    VALUES (item.store_id, 0, 0)
    ON CONFLICT (store_id) DO NOTHING;

    SELECT * INTO store_balance_rec FROM public.store_balance WHERE store_id = item.store_id;

    UPDATE public.store_balance
    SET
      pending_balance = pending_balance + seller_amount,
      updated_at = NOW()
    WHERE store_id = item.store_id;

    -- Sale transaction (payout_date NULL until delivered)
    INSERT INTO public.store_transactions (
      store_id, order_id, order_item_id, type,
      amount, balance_before, balance_after,
      description, payout_date, is_paid, metadata
    ) VALUES (
      item.store_id, p_order_id, item.item_id, 'sale',
      seller_amount,
      store_balance_rec.pending_balance,
      store_balance_rec.pending_balance + seller_amount,
      'Sipariş geliri (teslim bekleniyor)',
      public.calculate_payout_date_from_delivered(item.delivered_at), -- NULL if not delivered yet
      false,
      jsonb_build_object(
        'commission_amount', commission,
        'commission_rate', item.commission_rate,
        'original_amount', item.price * item.quantity
      )
    );

    -- Commission record (info only, no effect on balance)
    INSERT INTO public.store_transactions (
      store_id, order_id, order_item_id, type,
      amount, balance_before, balance_after,
      description, metadata
    ) VALUES (
      item.store_id, p_order_id, item.item_id, 'commission',
      -commission,
      store_balance_rec.pending_balance + seller_amount,
      store_balance_rec.pending_balance + seller_amount,
      'Platform komisyonu',
      jsonb_build_object(
        'commission_rate', item.commission_rate,
        'sale_amount', item.price * item.quantity
      )
    );
  END LOOP;
END;
$$;

-- ============================================================
-- 5. Trigger: payment_status='paid' olunca process_order_commissions çağır
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_process_commissions_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.payment_status IS DISTINCT FROM 'paid') AND NEW.payment_status = 'paid' THEN
    PERFORM public.process_order_commissions(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_process_commissions_on_payment ON public.orders;
CREATE TRIGGER trg_auto_process_commissions_on_payment
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_process_commissions_on_payment();

-- ============================================================
-- 6. Trigger: delivered_at değişince store_transactions.payout_date güncelle
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_payout_date_on_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.delivered_at IS DISTINCT FROM NEW.delivered_at) AND NEW.delivered_at IS NOT NULL THEN
    UPDATE public.store_transactions
    SET
      payout_date = public.calculate_payout_date_from_delivered(NEW.delivered_at),
      description = 'Sipariş geliri (iade süresi sonunda ödenecek)'
    WHERE order_id = NEW.id
      AND type = 'sale'
      AND is_paid = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_payout_date_on_delivered ON public.orders;
CREATE TRIGGER trg_update_payout_date_on_delivered
  AFTER UPDATE OF delivered_at ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payout_date_on_delivered();

-- ============================================================
-- 7. RPC for admins: backfill commission for already-paid orders
--    (so old paid-but-untracked orders get into the system)
-- ============================================================
CREATE OR REPLACE FUNCTION public.backfill_commissions_for_paid_orders()
RETURNS TABLE (
  orders_processed INTEGER,
  transactions_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_orders_processed INTEGER := 0;
  v_transactions_count_before BIGINT;
  v_transactions_count_after BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_transactions_count_before FROM public.store_transactions WHERE type = 'sale';

  FOR v_order IN
    SELECT id FROM public.orders
    WHERE payment_status = 'paid'
      AND COALESCE(status, '') <> 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM public.store_transactions
        WHERE order_id = orders.id AND type = 'sale'
      )
    ORDER BY created_at
  LOOP
    PERFORM public.process_order_commissions(v_order.id);
    v_orders_processed := v_orders_processed + 1;
  END LOOP;

  SELECT COUNT(*) INTO v_transactions_count_after FROM public.store_transactions WHERE type = 'sale';

  RETURN QUERY SELECT
    v_orders_processed,
    (v_transactions_count_after - v_transactions_count_before)::INTEGER;
END;
$$;

COMMENT ON FUNCTION public.backfill_commissions_for_paid_orders IS
  'Geçmişte ödenmiş ama store_transactions oluşmamış siparişler için manuel tetik. Admin tek seferlik çalıştırır.';

-- ============================================================
-- 8. Helper view for admin: pending payouts summary
-- ============================================================
CREATE OR REPLACE VIEW public.v_payout_status AS
SELECT
  st.store_id,
  s.store_name,
  s.iban,
  s.bank_name,
  s.account_holder,
  st.order_id,
  o.order_number,
  o.delivered_at,
  o.return_deadline,
  st.amount AS seller_amount,
  st.payout_date AS scheduled_payout_date,
  st.is_paid,
  CASE
    WHEN st.is_paid THEN 'paid'
    WHEN st.payout_date IS NULL THEN 'awaiting_delivery'
    WHEN st.payout_date > NOW() THEN 'in_return_period'
    WHEN st.payout_date <= NOW() THEN 'ready_for_payout'
  END AS payout_status,
  st.created_at AS transaction_created_at
FROM public.store_transactions st
JOIN public.stores s ON s.id = st.store_id
JOIN public.orders o ON o.id = st.order_id
WHERE st.type = 'sale'
ORDER BY
  CASE WHEN st.is_paid THEN 4
       WHEN st.payout_date IS NULL THEN 1
       WHEN st.payout_date > NOW() THEN 2
       ELSE 3 END,
  st.payout_date NULLS FIRST;

COMMENT ON VIEW public.v_payout_status IS
  'Admin payout dashboard için store_transactions özet view. payout_status: awaiting_delivery | in_return_period | ready_for_payout | paid';

GRANT SELECT ON public.v_payout_status TO authenticated;
