-- Sipariş iptalinde otomatik iyzico iadesi
--
-- Sorun: satıcı (web/mobil) veya admin ödenmiş bir siparişi iptal edince yalnızca
-- orders.status='cancelled' oluyordu; müşterinin parası iade edilmiyor, satıcının
-- hakediş defteri (store_transactions 'sale') ve stopaj toplamları geri alınmıyordu.
--
-- Akış:
--   1. orders.status → 'cancelled' ve payment_status='paid' ise (kim iptal ederse etsin)
--      BEFORE trigger refund_status='pending' işaretler.
--   2. pg_cron her 2 dakikada admin /api/iyzico/process-refunds çağırır: siparişi
--      'processing' olarak kilitler, iyzico'da ödemeyi iptal eder (gün kapanmadıysa)
--      ya da kalem kalem iade eder; kalem ilerlemesini anında kaydeder (çift iade yok).
--   3. Başarıda complete_order_refund(): payment_status='refunded', payments.status=
--      'refunded', defter ters kaydı + stopaj düzeltmesi; müşteriye "İadeniz yapıldı".
--   4. Hata: refund_status='failed' + refund_error; birkaç kez yeniden denenir, sonra
--      admin elle çözer (iyzico panelinden iade → mark_order_refunded_manually).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refund_status text,
  ADD COLUMN IF NOT EXISTS refund_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_error text,
  ADD COLUMN IF NOT EXISTS refund_method text,
  ADD COLUMN IF NOT EXISTS refund_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS iyzico_refund_response jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_refund_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_refund_status_check
  CHECK (refund_status IS NULL OR refund_status IN ('pending', 'processing', 'refunded', 'failed'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_refund_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_refund_method_check
  CHECK (refund_method IS NULL OR refund_method IN ('cancel', 'refund', 'manual'));

CREATE INDEX IF NOT EXISTS idx_orders_refund_queue
  ON public.orders (refund_requested_at)
  WHERE refund_status IN ('pending', 'failed', 'processing');

-- ---------- 1. İptalde iadeyi kuyruğa al ----------
CREATE OR REPLACE FUNCTION public.queue_refund_on_cancel() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled'
     AND NEW.payment_status = 'paid' AND NEW.refund_status IS NULL THEN
    NEW.refund_status := 'pending';
    NEW.refund_requested_at := now();
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_queue_refund_on_cancel ON public.orders;
CREATE TRIGGER trg_queue_refund_on_cancel BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.queue_refund_on_cancel();

-- ---------- 2. Satıcı defteri + stopaj ters kaydı (idempotent) ----------
CREATE OR REPLACE FUNCTION public.reverse_order_ledger(p_order_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  t record;
  b record;
  v_period uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.store_transactions WHERE order_id = p_order_id AND type = 'refund') THEN
    RETURN;
  END IF;

  FOR t IN
    SELECT * FROM public.store_transactions
    WHERE order_id = p_order_id AND type = 'sale'
    ORDER BY created_at
  LOOP
    INSERT INTO public.store_balance (store_id, pending_balance, available_balance)
    VALUES (t.store_id, 0, 0) ON CONFLICT (store_id) DO NOTHING;
    SELECT * INTO b FROM public.store_balance WHERE store_id = t.store_id FOR UPDATE;

    UPDATE public.store_balance
    SET pending_balance = pending_balance - t.amount, updated_at = now()
    WHERE store_id = t.store_id;

    INSERT INTO public.store_transactions (
      store_id, order_id, order_item_id, type, amount, balance_before, balance_after,
      description, is_paid, metadata
    ) VALUES (
      t.store_id, p_order_id, t.order_item_id, 'refund', -t.amount,
      b.pending_balance, b.pending_balance - t.amount,
      'Sipariş iptali — müşteriye iade edildi (satış geliri geri alındı)',
      false, jsonb_build_object('reverses', t.id)
    );
  END LOOP;

  -- Stopaj dönem/makbuz toplamlarından düş (beyan verilmemiş dönemler için doğru;
  -- beyan edilmişse admin düzeltme beyanı verir — tutar defterde görünür kalır)
  FOR t IN
    SELECT * FROM public.store_transactions
    WHERE order_id = p_order_id AND type = 'withholding'
  LOOP
    SELECT id INTO v_period FROM public.withholding_periods
    WHERE year = (t.metadata->>'period_year')::int AND month = (t.metadata->>'period_month')::int;
    IF v_period IS NULL THEN CONTINUE; END IF;

    UPDATE public.withholding_periods
    SET total_base_amount = total_base_amount - COALESCE((t.metadata->>'base')::numeric, 0),
        total_withholding_amount = total_withholding_amount + t.amount,  -- t.amount negatif
        total_orders = GREATEST(total_orders - 1, 0),
        updated_at = now()
    WHERE id = v_period;

    UPDATE public.withholding_receipts
    SET total_base_amount = total_base_amount - COALESCE((t.metadata->>'base')::numeric, 0),
        total_withholding_amount = total_withholding_amount + t.amount,
        total_orders = GREATEST(total_orders - 1, 0),
        updated_at = now()
    WHERE period_id = v_period AND store_id = t.store_id;

    SELECT * INTO b FROM public.store_balance WHERE store_id = t.store_id;
    INSERT INTO public.store_transactions (
      store_id, order_id, order_item_id, type, amount, balance_before, balance_after, description, metadata
    ) VALUES (
      t.store_id, p_order_id, t.order_item_id, 'adjustment', -t.amount,
      COALESCE(b.pending_balance, 0), COALESCE(b.pending_balance, 0),
      'Sipariş iptali — stopaj kesintisi geri alındı',
      jsonb_build_object('reverses', t.id, 'kind', 'withholding_reversal')
    );
  END LOOP;
END $$;

-- ---------- 3. İadeyi tamamla (yalnızca sunucu: service_role) ----------
CREATE OR REPLACE FUNCTION public.complete_order_refund(
  p_order_id uuid, p_amount numeric, p_method text, p_response jsonb DEFAULT '{}'::jsonb
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  UPDATE public.orders
  SET payment_status = 'refunded',
      refund_status = 'refunded',
      refund_method = p_method,
      refund_amount = p_amount,
      refunded_at = now(),
      refund_error = NULL,
      iyzico_refund_response = COALESCE(iyzico_refund_response, '{}'::jsonb) || COALESCE(p_response, '{}'::jsonb)
  WHERE id = p_order_id AND payment_status = 'paid';
  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE public.payments SET status = 'refunded' WHERE order_id = p_order_id AND status = 'completed';
  PERFORM public.reverse_order_ledger(p_order_id);
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.complete_order_refund(uuid, numeric, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_order_ledger(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_order_refund(uuid, numeric, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_order_ledger(uuid) TO service_role;

-- Admin: iyzico panelinden elle yapılmış iadeyi sisteme işler
CREATE OR REPLACE FUNCTION public.mark_order_refunded_manually(p_order_id uuid, p_note text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE v_total numeric;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Yalnızca yöneticiler' USING ERRCODE = '42501';
  END IF;
  SELECT total INTO v_total FROM public.orders WHERE id = p_order_id;
  RETURN public.complete_order_refund(p_order_id, v_total, 'manual',
    jsonb_build_object('manual_note', p_note, 'manual_at', now()));
END $$;
REVOKE ALL ON FUNCTION public.mark_order_refunded_manually(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_order_refunded_manually(uuid, text) TO authenticated, service_role;

-- ---------- 4. Bildirim: "İadeniz yapıldı" ----------
CREATE OR REPLACE FUNCTION public.trg_notify_order_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  s record;
  v_data jsonb := jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number);
BEGIN
  BEGIN
    IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
      PERFORM public.notify(NEW.user_id, 'store', 'order_paid', 'order',
        'Siparişiniz alındı 🎉', '#' || NEW.order_number || ' numaralı siparişiniz satıcıya iletildi.',
        v_data, '/hesabim/siparislerim/' || NEW.id);

      FOR s IN
        SELECT oi.store_id, count(*) AS n, sum(oi.total) AS amount
        FROM public.order_items oi WHERE oi.order_id = NEW.id AND oi.store_id IS NOT NULL
        GROUP BY oi.store_id
      LOOP
        PERFORM public.notify_store(s.store_id, 'staff', 'new_order', 'order',
          '🛒 Yeni sipariş!', public.fmt_try(s.amount) || ' · ' || s.n || ' ürün · #' || NEW.order_number,
          v_data, '/siparisler', 'high');
      END LOOP;
    END IF;

    IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' AND NEW.payment_status IN ('paid', 'refunded') THEN
      PERFORM public.notify(NEW.user_id, 'store', 'order_cancelled', 'order',
        'Siparişiniz iptal edildi', '#' || NEW.order_number || ' iptal edildi. Ödemeniz iade edilecek.',
        v_data, '/hesabim/siparislerim/' || NEW.id);
      FOR s IN SELECT DISTINCT store_id FROM public.order_items WHERE order_id = NEW.id AND store_id IS NOT NULL LOOP
        PERFORM public.notify_store(s.store_id, 'staff', 'order_cancelled', 'order',
          'Sipariş iptal edildi', '#' || NEW.order_number || ' iptal edildi — kargolamayın.',
          v_data, '/siparisler', 'high');
      END LOOP;
    END IF;

    IF NEW.payment_status = 'refunded' AND OLD.payment_status IS DISTINCT FROM 'refunded' THEN
      PERFORM public.notify(NEW.user_id, 'store', 'order_refunded', 'order',
        'İadeniz yapıldı 💳',
        '#' || NEW.order_number || ' için ' || public.fmt_try(COALESCE(NEW.refund_amount, NEW.total))
          || ' kartınıza iade edildi. Bankanıza bağlı olarak hesabınıza yansıması birkaç gün sürebilir.',
        v_data, '/hesabim/siparislerim/' || NEW.id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notify_order_events: %', SQLERRM;
  END;
  RETURN NEW;
END $function$;

-- ---------- 5. pg_cron: iade işleyicisi (push-dispatch'in yetki başlığını kullanır) ----------
DO $$
DECLARE v_cmd text;
BEGIN
  SELECT replace(command, '/api/push/dispatch', '/api/iyzico/process-refunds') INTO v_cmd
  FROM cron.job WHERE jobname = 'push-dispatch';
  IF v_cmd IS NULL THEN
    RAISE NOTICE 'push-dispatch job yok — process-refunds cron elle eklenmeli';
    RETURN;
  END IF;
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'iyzico-process-refunds';
  PERFORM cron.schedule('iyzico-process-refunds', '*/2 * * * *', v_cmd);
END $$;
