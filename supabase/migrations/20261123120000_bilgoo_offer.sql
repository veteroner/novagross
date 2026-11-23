-- The offer remains unpublished until both a start date and products are set.
CREATE TABLE public.bilgoo_offer (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  starts_at timestamptz,
  product_ids uuid[] NOT NULL DEFAULT '{}'
);
INSERT INTO public.bilgoo_offer DEFAULT VALUES;

CREATE TABLE public.bilgoo_coupon_attempts (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  state text NOT NULL CHECK (state IN ('reserved', 'paid', 'released'))
);
CREATE UNIQUE INDEX bilgoo_coupon_once_per_account ON public.bilgoo_coupon_attempts(user_id)
WHERE state IN ('reserved', 'paid');
ALTER TABLE public.bilgoo_offer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bilgoo_coupon_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bilgoo_offer, public.bilgoo_coupon_attempts FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_bilgoo_offer()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'status', CASE
      WHEN starts_at IS NULL OR cardinality(product_ids) = 0 OR now() < starts_at THEN 'pending'
      WHEN (SELECT count(*) FROM bilgoo_coupon_attempts WHERE state = 'paid') >= 20 THEN 'sold_out'
      WHEN now() >= starts_at + interval '672 hours' THEN 'ended'
      WHEN (SELECT count(*) FROM bilgoo_coupon_attempts WHERE state IN ('paid', 'reserved')) >= 20 THEN 'reserved'
      ELSE 'active' END,
    'starts_at', starts_at, 'ends_at', starts_at + interval '672 hours', 'product_ids', product_ids
  ) FROM bilgoo_offer WHERE singleton;
$$;
REVOKE ALL ON FUNCTION public.get_bilgoo_offer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bilgoo_offer() TO anon, authenticated, service_role;

-- Serialize other checkout creation for this same account while its first
-- discounted payment is open. Unrelated accounts continue independently.
CREATE FUNCTION public.guard_bilgoo_first_checkout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.payment_status = 'pending' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('bilgoo-order:' || NEW.user_id, 0));
    IF EXISTS (SELECT 1 FROM bilgoo_coupon_attempts WHERE user_id = NEW.user_id AND state = 'reserved') THEN
      RAISE EXCEPTION USING MESSAGE = 'BILGOO_PAYMENT_PENDING', ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_bilgoo_first_checkout() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER bilgoo_first_checkout
BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_bilgoo_first_checkout();

CREATE FUNCTION public.reserve_bilgoo_offer(p_order_id uuid, p_user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  checkout orders%ROWTYPE;
  offer bilgoo_offer%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('bilgoo-order:' || p_user_id, 0));
  SELECT * INTO checkout FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR checkout.user_id IS DISTINCT FROM p_user_id OR checkout.payment_status IS DISTINCT FROM 'pending'
    OR checkout.notes IS DISTINCT FROM 'coupon:BILGOO' OR checkout.discount_amount IS DISTINCT FROM 100 THEN
    RETURN 'invalid_order';
  END IF;
  SELECT * INTO offer FROM bilgoo_offer WHERE singleton FOR UPDATE;
  IF offer.starts_at IS NULL OR now() < offer.starts_at OR now() >= offer.starts_at + interval '672 hours' THEN
    RETURN 'inactive';
  END IF;
  IF EXISTS (SELECT 1 FROM bilgoo_coupon_attempts WHERE order_id = p_order_id AND state = 'reserved') THEN
    RETURN 'reserved';
  END IF;
  IF EXISTS (SELECT 1 FROM orders WHERE user_id = p_user_id AND id <> p_order_id AND payment_status IN ('paid','refunded'))
     OR EXISTS (SELECT 1 FROM bilgoo_coupon_attempts WHERE user_id = p_user_id AND state IN ('reserved','paid')) THEN
    RETURN 'first_order_only';
  END IF;
  IF EXISTS (SELECT 1 FROM orders WHERE user_id = p_user_id AND id <> p_order_id
      AND payment_status = 'pending' AND notes IS DISTINCT FROM 'coupon:BILGOO') THEN
    RETURN 'first_order_only';
  END IF;
  IF (SELECT COALESCE(sum(oi.total), 0) FROM order_items oi
      JOIN products p ON p.id = oi.product_id AND p.is_active
      WHERE oi.order_id = p_order_id AND oi.product_id = ANY(offer.product_ids)) < 500 THEN
    RETURN 'minimum';
  END IF;
  IF (SELECT count(*) FROM bilgoo_coupon_attempts WHERE state IN ('reserved','paid')) >= 20 THEN
    RETURN 'quota';
  END IF;
  INSERT INTO bilgoo_coupon_attempts(order_id, user_id, state) VALUES (p_order_id, p_user_id, 'reserved');
  RETURN 'reserved';
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_bilgoo_offer(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_bilgoo_offer(uuid, uuid) TO service_role;

CREATE FUNCTION public.settle_bilgoo_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  current_state text;
BEGIN
  SELECT state INTO current_state FROM bilgoo_coupon_attempts WHERE order_id = NEW.id;
  IF NEW.payment_status = 'paid' AND (current_state IS NOT NULL OR OLD.notes = 'coupon:BILGOO') THEN
    IF current_state IS DISTINCT FROM 'reserved' THEN
      RAISE EXCEPTION 'BILGOO order requires an active reservation';
    END IF;
    UPDATE bilgoo_coupon_attempts SET state = 'paid' WHERE order_id = NEW.id;
  ELSIF NEW.payment_status = 'failed' AND current_state = 'reserved' THEN
    UPDATE bilgoo_coupon_attempts SET state = 'released' WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.settle_bilgoo_offer() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER bilgoo_payment_status
AFTER UPDATE OF payment_status ON public.orders
FOR EACH ROW WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
EXECUTE FUNCTION public.settle_bilgoo_offer();

-- A timed-out browser alone does not establish that iyzico rejected payment.
-- Keep campaign reservations until a definitive provider outcome is known.
CREATE OR REPLACE FUNCTION public.release_stale_pending_orders()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_count int := 0;
  r RECORD;
BEGIN
  FOR r IN
    UPDATE orders
    SET payment_status = 'failed',
        notes = COALESCE(notes, '') || ' [auto-release: 30dk içinde ödeme tamamlanmadı]'
    WHERE payment_status = 'pending' AND created_at < now() - interval '30 minutes'
      AND NOT EXISTS (SELECT 1 FROM bilgoo_coupon_attempts a WHERE a.order_id = orders.id AND a.state = 'reserved')
    RETURNING id
  LOOP
    UPDATE products p SET stock = p.stock + oi.quantity
    FROM order_items oi WHERE oi.order_id = r.id AND oi.product_id = p.id AND p.stock IS NOT NULL;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE VIEW public.bilgoo_offer_metrics AS
SELECT count(*) FILTER (WHERE a.state = 'reserved') AS pending_payments,
       count(*) FILTER (WHERE a.state = 'paid') AS used_slots,
       count(*) FILTER (WHERE a.state = 'paid' AND o.payment_status = 'paid') AS paid_orders_net_of_refunds
FROM public.bilgoo_coupon_attempts a
JOIN public.orders o ON o.id = a.order_id;
REVOKE ALL ON public.bilgoo_offer_metrics FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.bilgoo_offer_metrics TO service_role;
