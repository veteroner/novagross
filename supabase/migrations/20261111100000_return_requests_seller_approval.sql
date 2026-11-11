-- İade talepleri: satıcı onayı + service_role yetkisi
--
-- Sorunlar:
--   1. approve/reject/mark_refunded yalnızca is_admin() (auth.uid() → profiles.role)
--      kabul ediyordu. Admin paneli bu RPC'leri service-role client ile çağırdığı için
--      auth.uid() NULL → "Yalnızca yöneticiler…" hatası; admin onayı da çalışmıyordu.
--   2. Satıcı iade talebini göremiyor / onaylayamıyordu (bildirim /talepler'e gidiyor,
--      o sayfa yalnızca customer_claims okuyordu).
--
-- Yeni kural:
--   - approve_return_request / reject_return_request: admin, service_role veya
--     mağazanın 'manager'+ üyesi (sahibi dahil) çağırabilir.
--   - mark_return_refunded (para iadesi kaydı): admin veya service_role.
--   - reviewed_by her zaman gerçek çağıran kullanıcıdır (auth.uid()); yoksa p_admin_id.
--   - Satıcı bildirimi /talepler?tab=iadeler sekmesine gider.

CREATE OR REPLACE FUNCTION public.can_review_return_request(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin()
      OR COALESCE(auth.role(), '') = 'service_role'
      OR public.is_store_member(p_store_id, 'manager');
$$;

REVOKE ALL ON FUNCTION public.can_review_return_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_review_return_request(uuid) TO authenticated, service_role;

-- ---------- approve ----------
CREATE OR REPLACE FUNCTION public.approve_return_request(p_request_id uuid, p_admin_id uuid, p_admin_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
  v_sale_tx RECORD;
  v_current_balance NUMERIC(12,2);
  v_new_balance NUMERIC(12,2);
BEGIN
  SELECT * INTO v_request FROM public.return_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'İade talebi bulunamadı';
  END IF;

  IF NOT public.can_review_return_request(v_request.store_id) THEN
    RAISE EXCEPTION 'Bu iade talebini onaylama yetkiniz yok';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Bu talep zaten % durumunda', v_request.status;
  END IF;

  -- İlgili sale transaction'ı bul (varsa)
  SELECT * INTO v_sale_tx
  FROM public.store_transactions
  WHERE order_id = v_request.order_id
    AND order_item_id = v_request.order_item_id
    AND type = 'sale'
  LIMIT 1;

  -- Store_balance güncelle (eğer satıcıya henüz ödenmemişse pending'den düş)
  IF v_sale_tx IS NOT NULL AND NOT v_sale_tx.is_paid THEN
    SELECT pending_balance INTO v_current_balance
      FROM public.store_balance WHERE store_id = v_request.store_id;

    v_new_balance := GREATEST(COALESCE(v_current_balance, 0) - v_sale_tx.amount, 0);

    UPDATE public.store_balance
    SET
      pending_balance = v_new_balance,
      updated_at = NOW()
    WHERE store_id = v_request.store_id;

    -- Sale transaction'ı iptal et (payout edilmesin diye)
    UPDATE public.store_transactions
    SET
      is_paid = true,  -- "completed" but as cancelled — kuyruğa girmez
      description = description || ' [İade onaylandı: ' || p_request_id::text || ']'
    WHERE id = v_sale_tx.id;
  ELSIF v_sale_tx IS NOT NULL AND v_sale_tx.is_paid THEN
    -- Satıcı zaten ödendi → manuel takip gerekli, sadece refund kaydı oluştur
    v_current_balance := COALESCE(
      (SELECT pending_balance FROM public.store_balance WHERE store_id = v_request.store_id),
      0
    );
    v_new_balance := v_current_balance;
  ELSE
    v_current_balance := 0;
    v_new_balance := 0;
  END IF;

  -- Refund transaction kaydı
  INSERT INTO public.store_transactions (
    store_id, order_id, order_item_id, type,
    amount, balance_before, balance_after,
    description, metadata
  ) VALUES (
    v_request.store_id, v_request.order_id, v_request.order_item_id, 'refund',
    -COALESCE(v_sale_tx.amount, v_request.refund_amount),
    v_current_balance,
    v_new_balance,
    'İade onaylandı (talep #' || p_request_id::text || ')',
    jsonb_build_object(
      'return_request_id', p_request_id,
      'reason', v_request.reason,
      'reason_category', v_request.reason_category,
      'seller_already_paid', COALESCE(v_sale_tx.is_paid, false),
      'approved_by', COALESCE(auth.uid(), p_admin_id)
    )
  );

  -- Talebi güncelle
  UPDATE public.return_requests
  SET
    status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = COALESCE(auth.uid(), p_admin_id),
    admin_note = p_admin_note
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'refund_amount', COALESCE(v_sale_tx.amount, v_request.refund_amount),
    'seller_was_paid', COALESCE(v_sale_tx.is_paid, false),
    'iyzico_refund_required', true
  );
END;
$function$;

-- ---------- reject ----------
CREATE OR REPLACE FUNCTION public.reject_return_request(p_request_id uuid, p_admin_id uuid, p_rejection_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request FROM public.return_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'İade talebi bulunamadı';
  END IF;

  IF NOT public.can_review_return_request(v_request.store_id) THEN
    RAISE EXCEPTION 'Bu iade talebini reddetme yetkiniz yok';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Bu talep zaten % durumunda', v_request.status;
  END IF;

  IF length(btrim(COALESCE(p_rejection_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'Red gerekçesi en az 5 karakter olmalı';
  END IF;

  UPDATE public.return_requests
  SET
    status = 'rejected',
    reviewed_at = NOW(),
    reviewed_by = COALESCE(auth.uid(), p_admin_id),
    rejection_reason = btrim(p_rejection_reason)
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id
  );
END;
$function$;

-- ---------- mark refunded (para iadesi: yalnız admin / service_role) ----------
CREATE OR REPLACE FUNCTION public.mark_return_refunded(p_request_id uuid, p_iyzico_refund_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_admin() OR COALESCE(auth.role(), '') = 'service_role') THEN
    RAISE EXCEPTION 'Yalnızca yöneticiler iadeyi tamamlayabilir';
  END IF;

  UPDATE public.return_requests
  SET
    status = 'refunded',
    refunded_at = NOW(),
    iyzico_refund_id = p_iyzico_refund_id
  WHERE id = p_request_id AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Onaylanmış iade talebi bulunamadı';
  END IF;

  RETURN jsonb_build_object('success', true, 'request_id', p_request_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_return_request(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_return_request(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_return_refunded(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_return_request(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_return_request(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_return_refunded(uuid, text) TO authenticated, service_role;

-- ---------- satıcı bildirim linki ----------
CREATE OR REPLACE FUNCTION public.trg_notify_return_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  o record;
  v_data jsonb;
BEGIN
  BEGIN
    SELECT id, order_number INTO o FROM public.orders WHERE id = NEW.order_id;
    v_data := jsonb_build_object('order_id', NEW.order_id, 'order_number', o.order_number, 'return_id', NEW.id);
    IF TG_OP = 'INSERT' THEN
      PERFORM public.notify_store(NEW.store_id, 'manager', 'return_requested', 'returns',
        'İade talebi geldi ↩️', '#' || o.order_number || ' için iade talebi oluşturuldu. Onaylamak için tıklayın.', v_data, '/talepler?tab=iadeler');
    ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved', 'rejected', 'refunded') THEN
      PERFORM public.notify(NEW.user_id, 'store', 'return_' || NEW.status, 'order',
        CASE NEW.status WHEN 'approved' THEN 'İade talebiniz onaylandı'
                        WHEN 'rejected' THEN 'İade talebiniz reddedildi'
                        ELSE 'İadeniz yapıldı 💸' END,
        CASE NEW.status WHEN 'refunded' THEN '#' || o.order_number || ' · ' || public.fmt_try(NEW.refund_amount) || ' kartınıza iade edildi.'
                        ELSE '#' || o.order_number || ' iade talebinizin durumu güncellendi.' END,
        v_data, '/hesabim/iadelerim');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notify_return_events: %', SQLERRM;
  END;
  RETURN NEW;
END $function$;

-- Eski bildirimlerin linkini de yeni sekmeye taşı (okunmamış olanlar)
UPDATE public.user_notifications
SET link = '/talepler?tab=iadeler'
WHERE type = 'return_requested' AND link = '/talepler';
