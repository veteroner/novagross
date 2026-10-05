-- =====================================================
-- E-ticaret stopajı (%1) iyzico withholdingTax ile fiilen kesilir
-- =====================================================
-- 9284 sayılı CBK (1.1.2025): aracı hizmet sağlayıcı, satıcılara aracılık
-- ettiği ödemelerden KDV hariç tutar üzerinden %1 stopaj keser ve beyan eder.
-- iyzico pazaryerinde bu, sepet kalemine withholdingTax (TUTAR) olarak
-- gönderilir; iyzico bunu alt üye işyeri ödemesinden düşer, hesaplama yapmaz.
--
-- Muaf: platformun kendi mağazası (aracılık yok), doğrulanmış esnaf muaflığı,
-- basit usul mükellef. Bu kural web/payment/initialize ile AYNI olmalı.
--
--   1. stores.is_platform_store (Novagross = true)
--   2. process_order_commissions: ödeme anında yazılan withholding_amount'u
--      kullanır; satıcıya giden net = seller_amount (subMerchantPrice) - stopaj
-- =====================================================

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS is_platform_store boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.stores.is_platform_store IS 'Platformun kendi mağazası — aracılık olmadığı için e-ticaret stopajı uygulanmaz';

UPDATE public.stores SET is_platform_store = true WHERE id = 'ff8ac80b-bf43-4779-91fe-ac4eb250965b';

COMMENT ON COLUMN public.order_items.seller_amount IS 'iyzico subMerchantPrice (komisyon sonrası, stopaj öncesi). Satıcıya giden net = seller_amount - withholding_amount';

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
  v_net NUMERIC(12,2);
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
      oi.withholding_amount AS paid_withholding_amount,
      COALESCE(oi.commission_rate, s.commission_rate, 0) AS commission_rate,
      COALESCE(s.kdv_rate, 20.00) AS kdv_rate,
      (
        COALESCE(s.is_platform_store, false)
        OR (COALESCE(s.is_withholding_exempt, false) AND COALESCE(s.withholding_exempt_verified, false))
        OR s.taxpayer_type = 'simple_method'
      ) AS is_wh_exempt,
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

    IF COALESCE(item.paid_seller_amount, 0) > 0 THEN
      -- Ödeme anında iyzico'ya gönderilen değerler (subMerchantPrice + withholdingTax)
      v_seller_amount := item.paid_seller_amount;
      v_wh_amount := COALESCE(item.paid_withholding_amount, 0);
    ELSE
      v_seller_amount := v_gross - ROUND((v_wh_base * v_rate / 100)::numeric, 2);
      IF item.is_wh_exempt OR v_order_paid_at < '2025-01-01'::timestamptz THEN
        v_wh_amount := 0;
      ELSE
        v_wh_amount := ROUND((v_wh_base * 0.01)::numeric, 2);
      END IF;
    END IF;
    v_wh_rate := CASE WHEN v_wh_amount > 0 THEN 0.0100 ELSE 0 END;
    commission := v_gross - v_seller_amount;
    v_net := v_seller_amount - v_wh_amount;

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
    SET pending_balance = pending_balance + v_net, updated_at = NOW()
    WHERE store_id = item.store_id;

    INSERT INTO public.store_transactions (
      store_id, order_id, order_item_id, type,
      amount, balance_before, balance_after,
      description, payout_date, is_paid, metadata
    ) VALUES (
      item.store_id, p_order_id, item.item_id, 'sale',
      v_net,
      store_balance_rec.pending_balance,
      store_balance_rec.pending_balance + v_net,
      'Sipariş geliri (komisyon ve stopaj sonrası, iyzico ile IBAN''a ödenir)',
      public.calculate_payout_date_from_delivered(item.delivered_at),
      false,
      jsonb_build_object(
        'gross_amount', v_gross,
        'kdv_rate', v_kdv_rate,
        'kdv_amount', v_kdv_amount,
        'sub_merchant_price', v_seller_amount,
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
        store_balance_rec.pending_balance + v_net,
        store_balance_rec.pending_balance + v_net,
        'Platform komisyonu (KDV hariç tutar üzerinden, iyzico ödemesinden kesildi)',
        jsonb_build_object('commission_rate', v_rate, 'base', v_wh_base)
      );
    END IF;

    IF v_wh_amount > 0 THEN
      INSERT INTO public.store_transactions (
        store_id, order_id, order_item_id, type,
        amount, balance_before, balance_after,
        description, metadata
      ) VALUES (
        item.store_id, p_order_id, item.item_id, 'withholding',
        -v_wh_amount,
        store_balance_rec.pending_balance + v_net,
        store_balance_rec.pending_balance + v_net,
        'E-ticaret stopajı %1 (KDV hariç tutar, iyzico ödemesinden kesildi)',
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
