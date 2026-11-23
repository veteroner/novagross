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
  -- reserved: ödeme açık · paid: tahsil edildi (iade kotayı açmaz) · released: kesin
  -- başarısız · disputed: tutar uyuşmazlığı/itiraz açık (kotayı tutar) · void: ihtilaf
  -- tahsilatsız kapandı (iade/başarısız), hak kullanılmamış sayılır.
  state text NOT NULL CHECK (state IN ('reserved', 'paid', 'released', 'disputed', 'void')),
  -- iyzico sonucunu sonradan doğrulamak için (admin /api/iyzico/bilgoo-reconcile)
  conversation_id text,
  checkout_token text,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  checked_at timestamptz,
  check_count int NOT NULL DEFAULT 0,
  last_check text,
  needs_review boolean NOT NULL DEFAULT false,
  -- İhtilafta iyzico referansı (callback yazar) ve iptal/iade ilerlemesi (admin yazar)
  iyzico_payment_id text,
  iyzico_paid_price numeric(12,2),
  dispute_progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- İptal/iade işlemi kilidi: iyzico'ya çağrıdan önce atomik alınır. Yalnız
  -- iyzico'nun sonucu kesin olduğunda bırakılır; belirsizlikte manuel incelemeye kadar tutulur.
  dispute_claimed_at timestamptz,
  dispute_claimed_by text
);
CREATE UNIQUE INDEX bilgoo_coupon_once_per_account ON public.bilgoo_coupon_attempts(user_id)
WHERE state IN ('reserved', 'paid', 'disputed');
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
      WHEN (SELECT count(*) FROM bilgoo_coupon_attempts WHERE state IN ('paid', 'reserved', 'disputed')) >= 20 THEN 'reserved'
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

CREATE FUNCTION public.reserve_bilgoo_offer(p_order_id uuid, p_user_id uuid, p_conversation_id text)
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
     OR EXISTS (SELECT 1 FROM bilgoo_coupon_attempts WHERE user_id = p_user_id AND state IN ('reserved','paid','disputed')) THEN
    RETURN 'first_order_only';
  END IF;
  IF EXISTS (SELECT 1 FROM orders WHERE user_id = p_user_id AND id <> p_order_id
      AND payment_status = 'pending' AND notes IS DISTINCT FROM 'coupon:BILGOO') THEN
    RETURN 'first_order_only';
  END IF;
  IF (SELECT COALESCE(sum(oi.total), 0) FROM order_items oi
      JOIN products p ON p.id = oi.product_id AND p.is_active
      JOIN stores s ON s.id = p.store_id AND s.is_platform_store
      WHERE oi.order_id = p_order_id AND oi.product_id = ANY(offer.product_ids)) < 500 THEN
    RETURN 'minimum';
  END IF;
  IF (SELECT count(*) FROM bilgoo_coupon_attempts WHERE state IN ('reserved','paid','disputed')) >= 20 THEN
    RETURN 'quota';
  END IF;
  INSERT INTO bilgoo_coupon_attempts(order_id, user_id, state, conversation_id)
  VALUES (p_order_id, p_user_id, 'reserved', p_conversation_id);
  RETURN 'reserved';
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_bilgoo_offer(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_bilgoo_offer(uuid, uuid, text) TO service_role;

-- YALNIZ MANUEL İNCELEME: yönetici iyzico panelinde ödemenin alınmadığını
-- doğruladıktan sonra admin /api/iyzico/bilgoo-review çağırır. Otomatik mutabakat
-- bu fonksiyonu kullanmaz. Sipariş pending→failed (settle trigger hakkı serbest
-- bırakır) ve stok iadesi tek işlemde; sipariş artık pending değilse işlem yapmaz.
CREATE FUNCTION public.close_unpaid_bilgoo_order(p_order_id uuid, p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_id uuid;
BEGIN
  IF COALESCE(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'close_unpaid_bilgoo_order: inceleme notu zorunlu';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM bilgoo_coupon_attempts WHERE order_id = p_order_id AND state = 'reserved') THEN
    RETURN false;
  END IF;
  UPDATE orders
  SET payment_status = 'failed',
      notes = COALESCE(notes, '') || ' [bilgoo-reconcile: ' || left(COALESCE(p_reason, ''), 200) || ']'
  WHERE id = p_order_id AND payment_status = 'pending'
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RETURN false;
  END IF;
  UPDATE products p SET stock = p.stock + oi.quantity
  FROM order_items oi WHERE oi.order_id = p_order_id AND oi.product_id = p.id AND p.stock IS NOT NULL;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.close_unpaid_bilgoo_order(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_unpaid_bilgoo_order(uuid, text) TO service_role;

-- İhtilaf iptal/iadesi için atomik kilit. Aynı anda gelen ikinci istek kilidi
-- alamaz ve iyzico'ya hiç çağrı yapmaz.
CREATE FUNCTION public.claim_bilgoo_dispute(p_order_id uuid, p_claimer text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  a bilgoo_coupon_attempts%ROWTYPE;
BEGIN
  IF COALESCE(btrim(p_claimer), '') = '' THEN
    RAISE EXCEPTION 'claim_bilgoo_dispute: claimer zorunlu';
  END IF;
  UPDATE bilgoo_coupon_attempts
  SET dispute_claimed_at = now(), dispute_claimed_by = p_claimer
  WHERE order_id = p_order_id AND state = 'disputed' AND dispute_claimed_at IS NULL
    AND iyzico_payment_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM orders o WHERE o.id = p_order_id AND o.payment_status = 'disputed')
  RETURNING * INTO a;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'payment_id', a.iyzico_payment_id, 'progress', a.dispute_progress,
      'order_number', (SELECT order_number FROM orders WHERE id = p_order_id));
  END IF;
  SELECT * INTO a FROM bilgoo_coupon_attempts WHERE order_id = p_order_id;
  RETURN jsonb_build_object('ok', false, 'reason', CASE
    WHEN NOT FOUND OR a.state <> 'disputed' THEN 'not_disputed'
    WHEN a.iyzico_payment_id IS NULL THEN 'no_reference'
    WHEN a.dispute_claimed_at IS NOT NULL THEN 'locked'
    ELSE 'not_disputed' END,
    'claimed_at', a.dispute_claimed_at, 'claimed_by', a.dispute_claimed_by);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_bilgoo_dispute(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_bilgoo_dispute(uuid, text) TO service_role;

-- İhtilaflı BILGOO siparişinin iyzico'da doğrulanmış iptal/iadesi tamamlandığında
-- admin /api/iyzico/bilgoo-dispute çağırır. Sipariş disputed→refunded olur; settle
-- trigger hakkı void yapar. Stok, ihtilaf anında callback tarafından iade edilmişti.
CREATE FUNCTION public.complete_bilgoo_dispute_refund(p_order_id uuid, p_amount numeric, p_method text, p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_id uuid;
BEGIN
  IF COALESCE(btrim(p_reason), '') = '' OR p_method NOT IN ('cancel', 'refund') OR NOT (p_amount > 0) THEN
    RAISE EXCEPTION 'complete_bilgoo_dispute_refund: geçersiz parametre';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM bilgoo_coupon_attempts WHERE order_id = p_order_id AND state = 'disputed') THEN
    RETURN false;
  END IF;
  UPDATE orders
  SET payment_status = 'refunded', status = 'cancelled', refund_status = 'refunded',
      refund_amount = p_amount, refunded_at = now(),
      notes = COALESCE(notes, '') || ' [bilgoo-dispute ' || p_method || ': ' || left(p_reason, 200) || ']'
  WHERE id = p_order_id AND payment_status = 'disputed'
  RETURNING id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_bilgoo_dispute_refund(uuid, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_bilgoo_dispute_refund(uuid, numeric, text, text) TO service_role;

CREATE FUNCTION public.settle_bilgoo_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  current_state text;
  next_state text;
BEGIN
  SELECT state INTO current_state FROM bilgoo_coupon_attempts WHERE order_id = NEW.id FOR UPDATE;
  IF current_state IS NULL THEN
    IF NEW.payment_status = 'paid' AND OLD.notes = 'coupon:BILGOO' THEN
      RAISE EXCEPTION 'BILGOO order requires an active reservation';
    END IF;
    RETURN NEW;
  END IF;
  -- Açık geçişler. Listede olmayan geçiş hakkın durumunu değiştirmez.
  next_state := CASE
    WHEN current_state = 'reserved' AND NEW.payment_status = 'paid' THEN 'paid'
    WHEN current_state = 'reserved' AND NEW.payment_status = 'failed' THEN 'released'
    WHEN current_state = 'reserved' AND NEW.payment_status = 'disputed' THEN 'disputed'
    WHEN current_state = 'disputed' AND NEW.payment_status = 'paid' THEN 'paid'
    WHEN current_state = 'disputed' AND NEW.payment_status IN ('refunded', 'failed') THEN 'void'
    ELSE current_state END;
  IF NEW.payment_status = 'paid' AND next_state <> 'paid' THEN
    RAISE EXCEPTION 'BILGOO order requires an active reservation (state=%)', current_state;
  END IF;
  IF current_state = 'disputed' AND NEW.payment_status = 'pending' THEN
    RAISE EXCEPTION 'BILGOO disputed order cannot return to pending';
  END IF;
  IF next_state IS DISTINCT FROM current_state THEN
    UPDATE bilgoo_coupon_attempts SET state = next_state, needs_review = (next_state = 'disputed')
    WHERE order_id = NEW.id;
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
       count(*) FILTER (WHERE a.state = 'disputed') AS disputed,
       count(*) FILTER (WHERE a.needs_review) AS needs_review,
       count(*) FILTER (WHERE a.state = 'paid') AS used_slots,
       count(*) FILTER (WHERE a.state = 'paid' AND o.payment_status = 'paid') AS paid_orders_net_of_refunds
FROM public.bilgoo_coupon_attempts a
JOIN public.orders o ON o.id = a.order_id;
REVOKE ALL ON public.bilgoo_offer_metrics FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.bilgoo_offer_metrics TO service_role;

-- Yarım kalan BILGOO ödemelerinin iyzico mutabakatı (admin uygulaması, 10 dk'da bir).
-- Yetki başlığı push-dispatch işinden alınır; pg_cron yoksa (DR replay) atlanır.
DO $$
DECLARE v_cmd text;
BEGIN
  SELECT replace(command, '/api/push/dispatch', '/api/iyzico/bilgoo-reconcile') INTO v_cmd
  FROM cron.job WHERE jobname = 'push-dispatch';
  IF v_cmd IS NULL THEN
    RAISE NOTICE 'push-dispatch job yok — bilgoo-reconcile cron elle eklenmeli';
    RETURN;
  END IF;
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'bilgoo-reconcile';
  PERFORM cron.schedule('bilgoo-reconcile', '*/10 * * * *', v_cmd);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'bilgoo-reconcile cron kurulamadı: %', SQLERRM;
END $$;
