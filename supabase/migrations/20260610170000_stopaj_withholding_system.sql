-- ============================================================================
-- STOPAJ (GELİR VERGİSİ TEVKİFATI) SİSTEMİ — 7524 sayılı Kanun + GİB Tebliği
-- 23.12.2024/157 uyarınca e-ticaret aracı hizmet sağlayıcı %1 tevkifat.
-- 1 Ocak 2025'ten itibaren paid siparişlerde uygulanır.
-- Matrah = KDV hariç brüt satış bedeli (komisyon matrahtan DÜŞÜLMEZ).
-- ============================================================================

-- 1) stores: mükellef türü + KDV oranı + esnaf muafiyeti alanları
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS taxpayer_type TEXT DEFAULT 'real_person',
  ADD COLUMN IF NOT EXISTS is_withholding_exempt BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS withholding_exempt_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS withholding_exempt_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS withholding_exempt_verified_by UUID,
  ADD COLUMN IF NOT EXISTS tradesman_certificate_url TEXT,
  ADD COLUMN IF NOT EXISTS kdv_rate NUMERIC(5,2) DEFAULT 20.00;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stores_taxpayer_type_check' AND conrelid = 'public.stores'::regclass
  ) THEN
    ALTER TABLE public.stores ADD CONSTRAINT stores_taxpayer_type_check
      CHECK (taxpayer_type = ANY (ARRAY[
        'real_person', 'sole_proprietor', 'limited_company',
        'joint_stock_company', 'tradesman_exempt', 'simple_method', 'second_hand'
      ]));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stores_kdv_rate_check' AND conrelid = 'public.stores'::regclass
  ) THEN
    ALTER TABLE public.stores ADD CONSTRAINT stores_kdv_rate_check
      CHECK (kdv_rate = ANY (ARRAY[0::numeric, 1::numeric, 8::numeric, 10::numeric, 18::numeric, 20::numeric]));
  END IF;
END $$;

-- 2) order_items: kalem bazlı KDV + stopaj alanları
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS kdv_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS kdv_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS withholding_base NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS withholding_rate NUMERIC(5,4) DEFAULT 0.0100,
  ADD COLUMN IF NOT EXISTS withholding_amount NUMERIC(12,2) DEFAULT 0;

-- 3) Aylık beyan dönemleri
CREATE TABLE IF NOT EXISTS public.withholding_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  total_base_amount NUMERIC(14,2) DEFAULT 0,
  total_withholding_amount NUMERIC(14,2) DEFAULT 0,
  total_orders INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'submitted', 'paid', 'closed')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  submission_reference TEXT,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (year, month)
);

-- 4) Mağaza × dönem tevkifat makbuzları
CREATE TABLE IF NOT EXISTS public.withholding_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.withholding_periods(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  total_base_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_withholding_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_orders INT NOT NULL DEFAULT 0,
  receipt_pdf_url TEXT,
  receipt_number TEXT UNIQUE,
  generated_at TIMESTAMPTZ,
  generated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (period_id, store_id)
);

-- 5) RLS
ALTER TABLE public.withholding_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withholding_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages withholding periods" ON public.withholding_periods;
CREATE POLICY "Admin manages withholding periods" ON public.withholding_periods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admin manages receipts" ON public.withholding_receipts;
CREATE POLICY "Admin manages receipts" ON public.withholding_receipts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Seller views own receipts" ON public.withholding_receipts;
CREATE POLICY "Seller views own receipts" ON public.withholding_receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = withholding_receipts.store_id
        AND s.owner_id = auth.uid()
    )
  );

-- 6) store_transactions type check: 'withholding' tipi eklendi
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'store_transactions_type_check'
      AND conrelid = 'public.store_transactions'::regclass
  ) THEN
    ALTER TABLE public.store_transactions DROP CONSTRAINT store_transactions_type_check;
  END IF;
  ALTER TABLE public.store_transactions ADD CONSTRAINT store_transactions_type_check
    CHECK (type = ANY (ARRAY[
      'sale', 'commission', 'withholding', 'refund',
      'adjustment', 'payout', 'deposit', 'withdrawal'
    ]));
END $$;

-- 7) process_order_commissions: KDV + stopaj + komisyon hesabı
--    Muafiyet YALNIZCA admin onaylıysa stopajı atlar (withholding_exempt_verified).
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
  seller_amount NUMERIC(12,2);
  v_kdv_rate NUMERIC(5,2);
  v_kdv_amount NUMERIC(12,2);
  v_wh_base NUMERIC(12,2);
  v_wh_rate NUMERIC(5,4);
  v_wh_amount NUMERIC(12,2);
  v_gross NUMERIC(12,2);
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
      COALESCE(oi.commission_rate, s.commission_rate, 15.00) AS commission_rate,
      COALESCE(s.kdv_rate, 20.00) AS kdv_rate,
      (COALESCE(s.is_withholding_exempt, false) AND COALESCE(s.withholding_exempt_verified, false)) AS is_wh_exempt,
      o.delivered_at
    FROM public.order_items oi
    JOIN public.stores s ON s.id = oi.store_id
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.order_id = p_order_id AND oi.store_id IS NOT NULL
  LOOP
    v_gross := item.price * item.quantity;

    v_kdv_rate := item.kdv_rate;
    v_kdv_amount := ROUND((v_gross * v_kdv_rate / (100 + v_kdv_rate))::numeric, 2);

    v_wh_base := v_gross - v_kdv_amount;

    IF item.is_wh_exempt OR v_order_paid_at < '2025-01-01'::timestamptz THEN
      v_wh_rate := 0;
    ELSE
      v_wh_rate := 0.0100;
    END IF;
    v_wh_amount := ROUND((v_wh_base * v_wh_rate)::numeric, 2);

    commission := ROUND((v_wh_base * (item.commission_rate / 100))::numeric, 2);
    seller_amount := v_wh_base - commission - v_wh_amount;

    UPDATE public.order_items
    SET
      commission_amount = commission,
      commission_rate = item.commission_rate,
      seller_amount = seller_amount,
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
    SET pending_balance = pending_balance + seller_amount, updated_at = NOW()
    WHERE store_id = item.store_id;

    INSERT INTO public.store_transactions (
      store_id, order_id, order_item_id, type,
      amount, balance_before, balance_after,
      description, payout_date, is_paid, metadata
    ) VALUES (
      item.store_id, p_order_id, item.item_id, 'sale',
      seller_amount,
      store_balance_rec.pending_balance,
      store_balance_rec.pending_balance + seller_amount,
      'Sipariş geliri (KDV/komisyon/stopaj sonrası)',
      public.calculate_payout_date_from_delivered(item.delivered_at),
      false,
      jsonb_build_object(
        'gross_amount', v_gross,
        'kdv_rate', v_kdv_rate,
        'kdv_amount', v_kdv_amount,
        'withholding_base', v_wh_base,
        'withholding_rate', v_wh_rate,
        'withholding_amount', v_wh_amount,
        'commission_rate', item.commission_rate,
        'commission_amount', commission
      )
    );

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
      jsonb_build_object('commission_rate', item.commission_rate, 'base', v_wh_base)
    );

    IF v_wh_amount > 0 THEN
      INSERT INTO public.store_transactions (
        store_id, order_id, order_item_id, type,
        amount, balance_before, balance_after,
        description, metadata
      ) VALUES (
        item.store_id, p_order_id, item.item_id, 'withholding',
        -v_wh_amount,
        store_balance_rec.pending_balance + seller_amount,
        store_balance_rec.pending_balance + seller_amount,
        'Gelir vergisi stopajı (%1)',
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
