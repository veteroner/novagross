-- =====================================================
-- İç defter = iyzico pazaryeri bölüşümü
-- =====================================================
-- iyzico pazaryeri modelinde satıcının parası onaydan sonra doğrudan alt
-- üye işyeri IBAN'ına gider; platform komisyonu, ödeme anında iyzico'ya
-- bildirilen subMerchantPrice ile kalem fiyatı arasındaki farktır.
--
-- Eskiden defter bundan bağımsız hesaplıyordu (varsayılan %15, KDV'nin
-- satıcı tutarından düşülmesi, stopajın düşülmesi) ve satıcıya "para çek"
-- ile ikinci kez ödeme yapılabiliyordu.
--
--   1. order_items.commission_rate varsayılanı 15 → NULL
--   2. Ödeme anındaki alt üye işyeri anahtarı + kargo kırılımı kolonları
--      (onay öncesi MNG bedelinin iyzico'da satıcıdan düşülmesi için)
--   3. process_order_commissions: seller_amount = iyzico subMerchantPrice;
--      komisyon KDV hariç tutar üzerinden
--   4. Yeni para çekme talebi engellenir (çift ödeme koruması)
--   5. Sipariş 2666151605 defter kaydı iyzico'daki gerçek bölüşüme düzeltilir
-- =====================================================

-- 1
ALTER TABLE public.order_items ALTER COLUMN commission_rate DROP DEFAULT;

-- 2
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS iyzico_sub_merchant_key text;
COMMENT ON COLUMN public.order_items.iyzico_sub_merchant_key IS 'Ödeme anında iyzico''ya gönderilen alt üye işyeri anahtarı (PUT /payment/item için)';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS iyzico_shipping_transaction_id text,
  ADD COLUMN IF NOT EXISTS iyzico_shipping_sub_merchant_key text,
  ADD COLUMN IF NOT EXISTS iyzico_shipping_seller_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS iyzico_shipping_approval_status text,
  ADD COLUMN IF NOT EXISTS iyzico_cargo_deducted_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS iyzico_cargo_deducted_at timestamptz;
COMMENT ON COLUMN public.orders.iyzico_shipping_transaction_id IS 'iyzico sepetindeki SHIPPING kaleminin paymentTransactionId''si';
COMMENT ON COLUMN public.orders.iyzico_cargo_deducted_amount IS 'Onay öncesi PUT /payment/item ile satıcı tutarından düşülen MNG kargo bedeli';

-- 3
CREATE OR REPLACE FUNCTION public.process_order_commissions(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  item RECORD;
  store_balance_rec RECORD;
  commission NUMERIC(12,2);
  v_seller_amount NUMERIC(12,2);
  v_kdv_rate NUMERIC(5,2);
  v_kdv_amount NUMERIC(12,2);
  v_wh_base NUMERIC(12,2);
  v_wh_rate NUMERIC(5,4);
  v_wh_amount NUMERIC(12,2);
  v_gross NUMERIC(12,2);
  v_rate NUMERIC(5,2);
  v_order_paid_at TIMESTAMPTZ;
  v_period_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.store_transactions
    WHERE order_id = p_order_id AND type = 'sale'
  ) THEN
    RAISE NOTICE 'process_order_commissions: zaten işlenmiş %, atlanıyor', p_order_id;
    RETURN;
  END IF;

  SELECT updated_at INTO v_order_paid_at FROM orders WHERE id = p_order_id;

  FOR item IN
    SELECT
      oi.id AS item_id,
      oi.store_id,
      oi.price,
      oi.quantity,
      oi.seller_amount AS paid_seller_amount,
      COALESCE(oi.commission_rate, s.commission_rate, 0) AS commission_rate,
      COALESCE(s.kdv_rate, 20.00) AS kdv_rate,
      (COALESCE(s.is_withholding_exempt, false) AND COALESCE(s.withholding_exempt_verified, false)) AS is_wh_exempt,
      o.delivered_at
    FROM public.order_items oi
    JOIN public.stores s ON s.id = oi.store_id
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.order_id = p_order_id AND oi.store_id IS NOT NULL
  LOOP
    v_gross := item.price * item.quantity;
    v_rate := item.commission_rate;
    v_kdv_rate := item.kdv_rate;
    v_kdv_amount := ROUND((v_gross * v_kdv_rate / (100 + v_kdv_rate))::numeric, 2);
    v_wh_base := v_gross - v_kdv_amount;

    -- Satıcı tutarı = ödeme anında iyzico'ya gönderilen subMerchantPrice.
    -- Yoksa aynı formül: komisyon KDV hariç tutar × oran.
    IF COALESCE(item.paid_seller_amount, 0) > 0 THEN
      v_seller_amount := item.paid_seller_amount;
    ELSE
      v_seller_amount := v_gross - ROUND((v_wh_base * v_rate / 100)::numeric, 2);
    END IF;
    commission := v_gross - v_seller_amount;

    -- Stopaj yalnızca beyan takibi için kaydedilir; iyzico satıcıya
    -- subMerchantPrice'ı öder, defter stopajı satıcı tutarından DÜŞMEZ.
    IF item.is_wh_exempt OR v_order_paid_at < '2025-01-01'::timestamptz THEN
      v_wh_rate := 0;
    ELSE
      v_wh_rate := 0.0100;
    END IF;
    v_wh_amount := ROUND((v_wh_base * v_wh_rate)::numeric, 2);

    UPDATE public.order_items
    SET
      commission_amount = commission,
      commission_rate = v_rate,
      seller_amount = v_seller_amount,
      kdv_rate = v_kdv_rate,
      kdv_amount = v_kdv_amount,
      withholding_base = v_wh_base,
      withholding_rate = v_wh_rate,
      withholding_amount = v_wh_amount
    WHERE id = item.item_id;

    INSERT INTO public.store_balance (store_id, pending_balance, available_balance)
    VALUES (item.store_id, 0, 0)
    ON CONFLICT (store_id) DO NOTHING;

    SELECT * INTO store_balance_rec FROM public.store_balance WHERE store_id = item.store_id;

    UPDATE public.store_balance
    SET pending_balance = pending_balance + v_seller_amount, updated_at = NOW()
    WHERE store_id = item.store_id;

    INSERT INTO public.store_transactions (
      store_id, order_id, order_item_id, type,
      amount, balance_before, balance_after,
      description, payout_date, is_paid, metadata
    ) VALUES (
      item.store_id, p_order_id, item.item_id, 'sale',
      v_seller_amount,
      store_balance_rec.pending_balance,
      store_balance_rec.pending_balance + v_seller_amount,
      'Sipariş geliri (iyzico ile IBAN''a ödenir)',
      public.calculate_payout_date_from_delivered(item.delivered_at),
      false,
      jsonb_build_object(
        'gross_amount', v_gross,
        'kdv_rate', v_kdv_rate,
        'kdv_amount', v_kdv_amount,
        'withholding_base', v_wh_base,
        'withholding_rate', v_wh_rate,
        'withholding_amount', v_wh_amount,
        'commission_rate', v_rate,
        'commission_amount', commission,
        'settlement', 'iyzico_marketplace'
      )
    );

    IF commission <> 0 THEN
      INSERT INTO public.store_transactions (
        store_id, order_id, order_item_id, type,
        amount, balance_before, balance_after,
        description, metadata
      ) VALUES (
        item.store_id, p_order_id, item.item_id, 'commission',
        -commission,
        store_balance_rec.pending_balance + v_seller_amount,
        store_balance_rec.pending_balance + v_seller_amount,
        'Platform komisyonu (KDV hariç tutar üzerinden, iyzico ödemesinden kesildi)',
        jsonb_build_object('commission_rate', v_rate, 'base', v_wh_base)
      );
    END IF;

    -- TODO(muhasebe): iyzico'nun e-ticaret stopajını kendisi kesip kesmediği teyit edilmeli.
    IF v_wh_amount > 0 THEN
      INSERT INTO public.store_transactions (
        store_id, order_id, order_item_id, type,
        amount, balance_before, balance_after,
        description, metadata
      ) VALUES (
        item.store_id, p_order_id, item.item_id, 'withholding',
        -v_wh_amount,
        store_balance_rec.pending_balance + v_seller_amount,
        store_balance_rec.pending_balance + v_seller_amount,
        'Gelir vergisi stopajı (%1) — beyan takibi, satıcı tutarından düşülmedi',
        jsonb_build_object(
          'base', v_wh_base,
          'rate', v_wh_rate,
          'period_year', EXTRACT(YEAR FROM v_order_paid_at)::int,
          'period_month', EXTRACT(MONTH FROM v_order_paid_at)::int
        )
      );

      SELECT id INTO v_period_id FROM public.withholding_periods
        WHERE year = EXTRACT(YEAR FROM v_order_paid_at)::int
          AND month = EXTRACT(MONTH FROM v_order_paid_at)::int;
      IF v_period_id IS NULL THEN
        INSERT INTO public.withholding_periods (year, month, total_base_amount, total_withholding_amount, total_orders)
        VALUES (
          EXTRACT(YEAR FROM v_order_paid_at)::int,
          EXTRACT(MONTH FROM v_order_paid_at)::int,
          v_wh_base, v_wh_amount, 1
        ) RETURNING id INTO v_period_id;
      ELSE
        UPDATE public.withholding_periods
        SET
          total_base_amount = total_base_amount + v_wh_base,
          total_withholding_amount = total_withholding_amount + v_wh_amount,
          total_orders = total_orders + 1,
          updated_at = NOW()
        WHERE id = v_period_id;
      END IF;

      INSERT INTO public.withholding_receipts (period_id, store_id, total_base_amount, total_withholding_amount, total_orders)
      VALUES (v_period_id, item.store_id, v_wh_base, v_wh_amount, 1)
      ON CONFLICT (period_id, store_id) DO UPDATE
        SET total_base_amount = withholding_receipts.total_base_amount + EXCLUDED.total_base_amount,
            total_withholding_amount = withholding_receipts.total_withholding_amount + EXCLUDED.total_withholding_amount,
            total_orders = withholding_receipts.total_orders + 1,
            updated_at = NOW();
    END IF;
  END LOOP;
END;
$function$;

-- 4
CREATE OR REPLACE FUNCTION public.block_withdrawal_requests()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RAISE EXCEPTION 'Para çekme talebi kapalı: satıcı ödemeleri iyzico üzerinden otomatik olarak IBAN''a gönderilir.'
    USING ERRCODE = 'P0001';
END;
$function$;

DROP TRIGGER IF EXISTS trg_block_withdrawal_requests ON public.withdrawal_requests;
CREATE TRIGGER trg_block_withdrawal_requests
  BEFORE INSERT ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.block_withdrawal_requests();

-- 5. Sipariş 2666151605: iyzico'da %0 komisyonla 599,00 TL satıcıya bölüşüldü;
--    defter %15 + KDV/stopaj düşerek 419,30 yazmıştı.
DO $$
DECLARE
  v_order uuid;
  v_store uuid;
  v_old numeric;
BEGIN
  SELECT id INTO v_order FROM public.orders WHERE order_number = '2666151605';
  IF v_order IS NULL THEN RETURN; END IF;

  SELECT store_id, seller_amount INTO v_store, v_old
  FROM public.order_items WHERE order_id = v_order AND store_id IS NOT NULL LIMIT 1;
  IF v_store IS NULL OR v_old = 599 THEN RETURN; END IF;

  UPDATE public.order_items
  SET commission_rate = 0, commission_amount = 0, seller_amount = 599
  WHERE order_id = v_order AND store_id = v_store;

  UPDATE public.store_balance
  SET pending_balance = pending_balance - v_old + 599, updated_at = NOW()
  WHERE store_id = v_store;

  UPDATE public.store_transactions
  SET amount = 599,
      balance_after = balance_before + 599,
      description = 'Sipariş geliri (iyzico ile IBAN''a ödenir)',
      metadata = metadata || jsonb_build_object('commission_rate', 0, 'commission_amount', 0, 'settlement', 'iyzico_marketplace', 'corrected_at', NOW())
  WHERE order_id = v_order AND store_id = v_store AND type = 'sale';

  DELETE FROM public.store_transactions
  WHERE order_id = v_order AND store_id = v_store AND type = 'commission';
END $$;
