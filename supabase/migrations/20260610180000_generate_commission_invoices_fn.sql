-- Dönem için mağaza bazlı komisyon faturası taslakları üretir (idempotent:
-- mevcut (store,year,month) kaydı varsa atlar). Tutarlar order_items'tan,
-- ay ataması process_order_commissions ile aynı kaynaktan (orders.updated_at).
CREATE OR REPLACE FUNCTION public.generate_commission_invoices(p_year int, p_month int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_from timestamptz;
  v_to timestamptz;
  v_inserted int := 0;
  v_seq int;
  rec RECORD;
BEGIN
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Geçersiz ay: %', p_month;
  END IF;
  v_from := make_timestamptz(p_year, p_month, 1, 0, 0, 0);
  v_to := v_from + interval '1 month';

  SELECT COUNT(*) INTO v_seq FROM public.commission_invoices
  WHERE year = p_year AND month = p_month;

  FOR rec IN
    SELECT
      oi.store_id,
      SUM(oi.withholding_base) AS commission_base,
      SUM(oi.commission_amount) AS commission_amount,
      COUNT(DISTINCT oi.order_id) AS total_orders
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.store_id IS NOT NULL
      AND oi.commission_amount > 0
      AND o.updated_at >= v_from AND o.updated_at < v_to
      AND EXISTS (
        SELECT 1 FROM public.store_transactions st
        WHERE st.order_id = oi.order_id AND st.type = 'sale'
      )
    GROUP BY oi.store_id
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.commission_invoices
      WHERE store_id = rec.store_id AND year = p_year AND month = p_month
    ) THEN
      CONTINUE;
    END IF;

    v_seq := v_seq + 1;
    INSERT INTO public.commission_invoices (
      store_id, year, month, invoice_number,
      commission_base, commission_amount,
      kdv_rate, kdv_amount, total_amount, total_orders, status
    ) VALUES (
      rec.store_id, p_year, p_month,
      'KF-' || p_year || LPAD(p_month::text, 2, '0') || '-' || LPAD(v_seq::text, 4, '0'),
      rec.commission_base,
      rec.commission_amount,
      20.00,
      ROUND((rec.commission_amount * 0.20)::numeric, 2),
      ROUND((rec.commission_amount * 1.20)::numeric, 2),
      rec.total_orders,
      'draft'
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

-- Yalnızca server-side (service_role) çağırmalı; anon/authenticated'a yetki yok
REVOKE EXECUTE ON FUNCTION public.generate_commission_invoices(int, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_commission_invoices(int, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_commission_invoices(int, int) FROM authenticated;
