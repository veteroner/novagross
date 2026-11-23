-- These functions are test doubles for checkout RPCs missing from the migration history.
-- Load them only in the disposable Supabase stack created by the smoke workflow.

CREATE FUNCTION public.reserve_stock_atomic(p_items jsonb)
RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  item record;
BEGIN
  FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS rows(product_id uuid, quantity integer)
    ORDER BY product_id
  LOOP
    IF item.quantity IS NULL OR item.quantity < 1 THEN
      RAISE EXCEPTION 'Geçersiz ürün adedi';
    END IF;

    UPDATE public.products
    SET stock = stock - item.quantity
    WHERE id = item.product_id AND (stock IS NULL OR stock >= item.quantity);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Yetersiz stok: test ürünü (id=%)', item.product_id;
    END IF;
  END LOOP;
END;
$$;

CREATE FUNCTION public.release_stock_atomic(p_items jsonb)
RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  item record;
BEGIN
  FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS rows(product_id uuid, quantity integer)
    ORDER BY product_id
  LOOP
    IF item.quantity IS NULL OR item.quantity < 1 THEN
      RAISE EXCEPTION 'Geçersiz ürün adedi';
    END IF;

    UPDATE public.products SET stock = stock + item.quantity
    WHERE id = item.product_id AND stock IS NOT NULL;
  END LOOP;
END;
$$;

CREATE FUNCTION public.claim_order_for_payment(p_order_id uuid, p_payment_id text, p_notes text)
RETURNS boolean LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.orders SET payment_status = 'paid', status = 'pending', notes = p_notes
  WHERE id = p_order_id AND payment_status = 'pending';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_stock_atomic(jsonb), public.release_stock_atomic(jsonb),
  public.claim_order_for_payment(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_stock_atomic(jsonb), public.release_stock_atomic(jsonb),
  public.claim_order_for_payment(uuid, text, text) TO service_role;

NOTIFY pgrst, 'reload schema';
