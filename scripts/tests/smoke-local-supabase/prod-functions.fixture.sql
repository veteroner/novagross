-- YALNIZ SMOKE TESTİ İÇİN FIXTURE — canlıya uygulanmaz, supabase/migrations altında değildir.
-- Bu üç fonksiyon canlıda var ama gövdeleri repo geçişlerinde yok (ilgili geçiş dosyaları
-- yalnız yorum içeriyor). Tanımlar 23 Kasım 2026'da canlı katalogdan salt okunur
-- (pg_get_functiondef + proacl) alındı. İzinler canlıyla aynı: yalnız service_role.

CREATE OR REPLACE FUNCTION public.claim_order_for_payment(p_order_id uuid, p_payment_id text, p_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated INT;
BEGIN
  UPDATE orders
  SET payment_status = 'paid',
      status = 'pending',
      notes = COALESCE(p_notes, notes)
  WHERE id = p_order_id
    AND payment_status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_stock_atomic(p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    UPDATE products
    SET stock = stock + (item->>'quantity')::INT
    WHERE id = (item->>'product_id')::UUID
      AND stock IS NOT NULL;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reserve_stock_atomic(p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE item JSONB; v_updated INT; v_qty INT; v_failed_id UUID; v_failed_name TEXT;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (item->>'quantity')::INT;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Geçersiz quantity: % (pozitif olmalı)', COALESCE(v_qty::text, 'null')
        USING ERRCODE = '22023';
    END IF;
    UPDATE products
    SET stock = stock - v_qty
    WHERE id = (item->>'product_id')::UUID
      AND stock IS NOT NULL
      AND stock >= v_qty;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      SELECT name INTO v_failed_name FROM products WHERE id = (item->>'product_id')::UUID;
      v_failed_id := (item->>'product_id')::UUID;
      RAISE EXCEPTION 'Yetersiz stok: % (id=%)', COALESCE(v_failed_name, '?'), v_failed_id
        USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_order_for_payment(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_stock_atomic(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_stock_atomic(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_order_for_payment(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_stock_atomic(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_stock_atomic(jsonb) TO service_role;
