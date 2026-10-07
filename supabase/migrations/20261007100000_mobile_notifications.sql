-- =====================================================
-- Mobil bildirim omurgası (Novagross + Novagross Satıcı)
-- =====================================================
-- Olay → notify() → user_notifications (uygulama içi liste / web zili)
--                 → notification_outbox (push, tercihlere göre)
-- pg_cron → admin /api/push/dispatch → Expo Push API → APNs/FCM
--
-- Trigger'lar bildirim hatasında ASLA asıl işlemi (sipariş, ödeme, kargo)
-- durdurmaz: hata yakalanır, WARNING yazılır.
-- Bkz docs/MOBIL_UYGULAMA_PLANI.md §3.3 ve §4.
-- =====================================================

-- ---------- Cihazlar ----------
CREATE TABLE IF NOT EXISTS public.push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app text NOT NULL CHECK (app IN ('store', 'seller')),
  expo_push_token text NOT NULL UNIQUE,
  platform text CHECK (platform IN ('ios', 'android')),
  device_name text,
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_push_devices_user_app ON public.push_devices (user_id, app) WHERE disabled_at IS NULL;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS push_devices_own_select ON public.push_devices;
CREATE POLICY push_devices_own_select ON public.push_devices FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS push_devices_own_delete ON public.push_devices;
CREATE POLICY push_devices_own_delete ON public.push_devices FOR DELETE TO authenticated USING (user_id = auth.uid());
GRANT SELECT, DELETE ON public.push_devices TO authenticated;

-- Uygulama açılışında / giriş sonrası çağrılır. Token başka kullanıcıya aitse
-- (cihazda hesap değişti) bu kullanıcıya devredilir.
CREATE OR REPLACE FUNCTION public.register_push_device(
  p_app text, p_token text, p_platform text DEFAULT NULL, p_device_name text DEFAULT NULL, p_app_version text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Giriş gerekli'; END IF;
  IF p_app NOT IN ('store', 'seller') THEN RAISE EXCEPTION 'Geçersiz uygulama'; END IF;
  IF p_token IS NULL OR p_token !~ '^(Exponent|Expo)PushToken\[.+\]$' THEN RAISE EXCEPTION 'Geçersiz push token'; END IF;

  INSERT INTO public.push_devices (user_id, app, expo_push_token, platform, device_name, app_version)
  VALUES (auth.uid(), p_app, p_token, p_platform, p_device_name, p_app_version)
  ON CONFLICT (expo_push_token) DO UPDATE
    SET user_id = auth.uid(), app = EXCLUDED.app, platform = EXCLUDED.platform,
        device_name = EXCLUDED.device_name, app_version = EXCLUDED.app_version,
        last_seen_at = now(), disabled_at = NULL;
END $$;
REVOKE ALL ON FUNCTION public.register_push_device(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_device(text, text, text, text, text) TO authenticated;

-- Çıkışta çağrılır
CREATE OR REPLACE FUNCTION public.unregister_push_device(p_token text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$ DELETE FROM public.push_devices WHERE expo_push_token = p_token AND user_id = auth.uid(); $$;
REVOKE ALL ON FUNCTION public.unregister_push_device(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unregister_push_device(text) TO authenticated;

-- ---------- Tercihler ----------
-- Satır yoksa varsayılan: 'marketing' KAPALI (ticari ileti — açık rıza gerekir,
-- 6563 s. Kanun / İYS), diğer her kategori AÇIK. 'order' kapatılamaz (işlemsel).
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app text NOT NULL CHECK (app IN ('store', 'seller')),
  category text NOT NULL,
  enabled boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, app, category)
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_preferences_own ON public.notification_preferences;
CREATE POLICY notification_preferences_own ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND NOT (category = 'order' AND enabled = false));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;

-- Ticari ileti rızası denetim kaydı (İYS'ye bildirim için kanıt)
CREATE TABLE IF NOT EXISTS public.marketing_consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app text NOT NULL,
  channel text NOT NULL DEFAULT 'push',
  granted boolean NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketing_consent_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketing_consent_log_own_select ON public.marketing_consent_log;
CREATE POLICY marketing_consent_log_own_select ON public.marketing_consent_log FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.marketing_consent_log TO authenticated;

CREATE OR REPLACE FUNCTION public.log_marketing_consent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.category = 'marketing' AND (TG_OP = 'INSERT' OR OLD.enabled IS DISTINCT FROM NEW.enabled) THEN
    INSERT INTO public.marketing_consent_log (user_id, app, granted, source)
    VALUES (NEW.user_id, NEW.app, NEW.enabled, 'notification_preferences');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_marketing_consent ON public.notification_preferences;
CREATE TRIGGER trg_log_marketing_consent AFTER INSERT OR UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.log_marketing_consent();

-- ---------- Uygulama içi bildirimler (mevcut tablo) ----------
ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS app text NOT NULL DEFAULT 'store',
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_app ON public.user_notifications (user_id, app, created_at DESC);

-- ---------- Push kuyruğu ----------
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app text NOT NULL CHECK (app IN ('store', 'seller')),
  type text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority text NOT NULL DEFAULT 'default' CHECK (priority IN ('default', 'high')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'no_device')),
  attempts int NOT NULL DEFAULT 0,
  error text,
  tickets jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  receipts_checked_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending ON public.notification_outbox (created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_outbox_receipts ON public.notification_outbox (sent_at) WHERE status = 'sent' AND receipts_checked_at IS NULL;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY; -- yalnızca service role

-- ---------- Merkezi fonksiyonlar ----------
CREATE OR REPLACE FUNCTION public.notify(
  p_user_id uuid, p_app text, p_type text, p_category text,
  p_title text, p_body text, p_data jsonb DEFAULT '{}'::jsonb,
  p_link text DEFAULT NULL, p_store_id uuid DEFAULT NULL, p_priority text DEFAULT 'default'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_enabled boolean;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.user_notifications (user_id, type, title, body, link, app, store_id, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_link, p_app, p_store_id, COALESCE(p_data, '{}'::jsonb));

  SELECT enabled INTO v_enabled FROM public.notification_preferences
   WHERE user_id = p_user_id AND app = p_app AND category = p_category;
  IF v_enabled IS NULL THEN v_enabled := (p_category <> 'marketing'); END IF;
  IF p_category = 'order' THEN v_enabled := true; END IF;
  IF NOT v_enabled THEN RETURN; END IF;

  INSERT INTO public.notification_outbox (user_id, app, type, category, title, body, data, priority)
  VALUES (p_user_id, p_app, p_type, p_category, p_title, p_body,
          COALESCE(p_data, '{}'::jsonb) || jsonb_build_object('type', p_type, 'link', p_link),
          COALESCE(p_priority, 'default'));
END $$;

-- Mağazanın sahibine + üyelerine (en az p_min_role yetkisindekilere)
CREATE OR REPLACE FUNCTION public.notify_store(
  p_store_id uuid, p_min_role text, p_type text, p_category text,
  p_title text, p_body text, p_data jsonb DEFAULT '{}'::jsonb,
  p_link text DEFAULT NULL, p_priority text DEFAULT 'default'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_min int := CASE p_min_role WHEN 'owner' THEN 3 WHEN 'manager' THEN 2 ELSE 1 END;
  r record;
BEGIN
  IF p_store_id IS NULL THEN RETURN; END IF;
  FOR r IN
    SELECT DISTINCT u.user_id FROM (
      SELECT owner_id AS user_id FROM public.stores WHERE id = p_store_id
      UNION
      SELECT user_id FROM public.store_members
       WHERE store_id = p_store_id
         AND (CASE role WHEN 'owner' THEN 3 WHEN 'manager' THEN 2 ELSE 1 END) >= v_min
    ) u WHERE u.user_id IS NOT NULL
  LOOP
    PERFORM public.notify(r.user_id, 'seller', p_type, p_category, p_title, p_body,
                          p_data || jsonb_build_object('store_id', p_store_id), p_link, p_store_id, p_priority);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.notify(uuid, text, text, text, text, text, jsonb, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_store(uuid, text, text, text, text, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fmt_try(n numeric) RETURNS text
-- Türkçe biçim: binlik '.', ondalık ',' (₺1.234,50)
LANGUAGE sql IMMUTABLE AS $$ SELECT '₺' || translate(to_char(COALESCE(n, 0), 'FM999G999G990D00'), ',.', '.,') $$;

-- ---------- Olay trigger'ları ----------

-- Sipariş ödendi / iptal edildi
CREATE OR REPLACE FUNCTION public.trg_notify_order_events() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notify_order_events: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_order_events ON public.orders;
CREATE TRIGGER trg_notify_order_events AFTER UPDATE OF payment_status, status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_order_events();

-- Kargo: etiket oluştu (kargoya verildi) + MNG durum değişimleri
CREATE OR REPLACE FUNCTION public.trg_notify_shipment_events() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  o record;
  v_title text;
  v_body text;
  v_type text;
BEGIN
  BEGIN
    SELECT id, order_number, user_id INTO o FROM public.orders WHERE id = NEW.order_id;
    IF o.id IS NULL THEN RETURN NEW; END IF;

    IF TG_OP = 'INSERT' THEN
      v_type := 'shipment_created';
      v_title := 'Siparişiniz kargoya verildi 📦';
      v_body := '#' || o.order_number || COALESCE(' · Takip no: ' || NEW.tracking_number, '');
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      CASE NEW.status
        WHEN 'out_for_delivery' THEN v_type := 'shipment_out_for_delivery'; v_title := 'Kargonuz bugün teslim edilecek 🚚'; v_body := '#' || o.order_number || ' dağıtıma çıktı.';
        WHEN 'delivered' THEN v_type := 'shipment_delivered'; v_title := 'Siparişiniz teslim edildi ✅'; v_body := '#' || o.order_number || ' teslim edildi. Değerlendirmek ister misiniz?';
        WHEN 'failed' THEN v_type := 'shipment_failed'; v_title := 'Kargonuz teslim edilemedi'; v_body := '#' || o.order_number || ' teslim edilemedi — detaylar için kargo takibine bakın.';
        WHEN 'returned' THEN v_type := 'shipment_returned'; v_title := 'Kargonuz geri dönüyor'; v_body := '#' || o.order_number || ' satıcıya geri gönderiliyor.';
        ELSE RETURN NEW;
      END CASE;
    ELSE
      RETURN NEW;
    END IF;

    PERFORM public.notify(o.user_id, 'store', v_type, 'shipping', v_title, v_body,
      jsonb_build_object('order_id', o.id, 'order_number', o.order_number, 'tracking_number', NEW.tracking_number),
      '/hesabim/siparislerim/' || o.id);

    IF NEW.status = 'failed' AND TG_OP = 'UPDATE' THEN
      PERFORM public.notify_store(s.store_id, 'staff', 'shipment_failed', 'shipping',
        'Kargo teslim edilemedi', '#' || o.order_number || ' alıcıya teslim edilemedi.',
        jsonb_build_object('order_id', o.id, 'order_number', o.order_number), '/siparisler')
      FROM (SELECT DISTINCT store_id FROM public.order_items WHERE order_id = o.id AND store_id IS NOT NULL) s;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notify_shipment_events: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_shipment_events ON public.order_shipments;
CREATE TRIGGER trg_notify_shipment_events AFTER INSERT OR UPDATE OF status ON public.order_shipments
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_shipment_events();

-- Fatura yüklendi → müşteri
CREATE OR REPLACE FUNCTION public.trg_notify_invoice_uploaded() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE o record;
BEGIN
  BEGIN
    SELECT id, order_number, user_id INTO o FROM public.orders WHERE id = NEW.order_id;
    PERFORM public.notify(o.user_id, 'store', 'invoice_uploaded', 'order',
      'Faturanız hazır 🧾', '#' || o.order_number || ' siparişinizin faturası yüklendi.',
      jsonb_build_object('order_id', o.id, 'order_number', o.order_number), '/hesabim/siparislerim/' || o.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notify_invoice_uploaded: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_invoice_uploaded ON public.order_invoices;
CREATE TRIGGER trg_notify_invoice_uploaded AFTER INSERT ON public.order_invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_invoice_uploaded();

-- İade talebi: yeni → satıcı (yönetici+), durum değişti → müşteri
CREATE OR REPLACE FUNCTION public.trg_notify_return_events() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  o record;
  v_data jsonb;
BEGIN
  BEGIN
    SELECT id, order_number INTO o FROM public.orders WHERE id = NEW.order_id;
    v_data := jsonb_build_object('order_id', NEW.order_id, 'order_number', o.order_number, 'return_id', NEW.id);
    IF TG_OP = 'INSERT' THEN
      PERFORM public.notify_store(NEW.store_id, 'manager', 'return_requested', 'returns',
        'İade talebi geldi ↩️', '#' || o.order_number || ' için iade talebi oluşturuldu.', v_data, '/talepler');
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
END $$;
DROP TRIGGER IF EXISTS trg_notify_return_events ON public.return_requests;
CREATE TRIGGER trg_notify_return_events AFTER INSERT OR UPDATE OF status ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_return_events();

-- Ürün sorusu: yeni → satıcı, yanıtlandı → müşteri
CREATE OR REPLACE FUNCTION public.trg_notify_question_events() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE p record;
BEGIN
  BEGIN
    SELECT id, name, slug, store_id INTO p FROM public.products WHERE id = NEW.product_id;
    IF TG_OP = 'INSERT' THEN
      PERFORM public.notify_store(p.store_id, 'staff', 'question_new', 'qa',
        'Ürününüze soru soruldu ❓', left(p.name, 60) || ': ' || left(NEW.question, 90),
        jsonb_build_object('question_id', NEW.id, 'product_id', p.id), '/sorular');
    ELSIF NEW.answer IS NOT NULL AND OLD.answer IS NULL THEN
      PERFORM public.notify(NEW.customer_id, 'store', 'question_answered', 'qa',
        'Sorunuz yanıtlandı 💬', left(p.name, 60) || ': ' || left(NEW.answer, 90),
        jsonb_build_object('question_id', NEW.id, 'product_id', p.id, 'product_slug', p.slug), '/urun/' || p.slug);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notify_question_events: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_question_events ON public.product_questions;
CREATE TRIGGER trg_notify_question_events AFTER INSERT OR UPDATE OF answer ON public.product_questions
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_question_events();

-- Yeni ürün yorumu → satıcı (yönetici+)
CREATE OR REPLACE FUNCTION public.trg_notify_review_new() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE p record;
BEGIN
  BEGIN
    SELECT id, name, store_id INTO p FROM public.products WHERE id = NEW.product_id;
    PERFORM public.notify_store(p.store_id, 'manager', 'review_new', 'reviews',
      repeat('⭐', GREATEST(1, LEAST(5, NEW.rating))) || ' yeni değerlendirme', left(p.name, 60) || COALESCE(': ' || left(NEW.comment, 80), ''),
      jsonb_build_object('review_id', NEW.id, 'product_id', p.id), '/yorumlar');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notify_review_new: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_review_new ON public.reviews;
CREATE TRIGGER trg_notify_review_new AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_review_new();

-- Ürün onay / red → satıcı
CREATE OR REPLACE FUNCTION public.trg_notify_product_moderation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  BEGIN
    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status AND NEW.approval_status IN ('approved', 'rejected') THEN
      PERFORM public.notify_store(NEW.store_id, 'staff', 'product_' || NEW.approval_status, 'product',
        CASE NEW.approval_status WHEN 'approved' THEN 'Ürününüz yayında ✅' ELSE 'Ürününüz onaylanmadı' END,
        left(NEW.name, 70) || CASE WHEN NEW.approval_status = 'rejected' THEN COALESCE(' — ' || left(NEW.rejection_reason, 80), '') ELSE '' END,
        jsonb_build_object('product_id', NEW.id), '/urunler');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notify_product_moderation: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_product_moderation ON public.products;
CREATE TRIGGER trg_notify_product_moderation AFTER UPDATE OF approval_status ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_product_moderation();

-- Hak ediş gönderildi (iyzico onayı) → satıcı (yönetici+)
CREATE OR REPLACE FUNCTION public.trg_notify_payout_approved() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE o record;
BEGIN
  BEGIN
    IF NEW.iyzico_approval_status = 'approved' AND OLD.iyzico_approval_status IS DISTINCT FROM 'approved' THEN
      SELECT id, order_number INTO o FROM public.orders WHERE id = NEW.order_id;
      PERFORM public.notify_store(NEW.store_id, 'manager', 'payout_approved', 'payout',
        'Hak edişiniz gönderiliyor 💰',
        public.fmt_try(COALESCE(NEW.seller_amount, 0) - COALESCE(NEW.withholding_amount, 0)) || ' · #' || o.order_number || ' — iyzico ilk iş günü IBAN''ınıza aktarır.',
        jsonb_build_object('order_id', o.id, 'order_number', o.order_number), '/kazanclarim');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notify_payout_approved: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_payout_approved ON public.order_items;
CREATE TRIGGER trg_notify_payout_approved AFTER UPDATE OF iyzico_approval_status ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_payout_approved();

-- Destek yanıtı → talep sahibi (müşteri) ya da mağaza
CREATE OR REPLACE FUNCTION public.trg_notify_support_reply() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE t record;
BEGIN
  BEGIN
    -- Yalnızca insan yanıtı (admin/satıcı 'agent'). 'assistant' = canlı AI sohbet yanıtı,
    -- kullanıcı zaten ekranda — bildirim spam olur.
    IF NEW.role <> 'agent' THEN RETURN NEW; END IF;
    SELECT id, ticket_no, user_id, store_id, source INTO t FROM public.support_tickets WHERE id = NEW.ticket_id;
    IF t.source = 'seller' AND t.store_id IS NOT NULL THEN
      PERFORM public.notify_store(t.store_id, 'manager', 'support_reply', 'support',
        'Destek talebinize yanıt geldi', 'Talep #' || t.ticket_no, jsonb_build_object('ticket_id', t.id), '/destek');
    ELSIF t.user_id IS NOT NULL THEN
      PERFORM public.notify(t.user_id, 'store', 'support_reply', 'support',
        'Destek talebinize yanıt geldi', 'Talep #' || t.ticket_no, jsonb_build_object('ticket_id', t.id), '/iletisim');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notify_support_reply: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_support_reply ON public.support_messages;
CREATE TRIGGER trg_notify_support_reply AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_support_reply();

-- ---------- Gönderim cron'u (dakikada bir) ----------
-- iyzico-auto-approve job'ının Authorization header'ını yeniden kullanır; secret repoya yazılmaz.
DO $$
DECLARE v_cmd text;
BEGIN
  SELECT command INTO v_cmd FROM cron.job WHERE jobname = 'iyzico-auto-approve';
  IF v_cmd IS NULL THEN
    RAISE NOTICE 'iyzico-auto-approve cron job yok; push-dispatch elle oluşturulmalı';
    RETURN;
  END IF;
  PERFORM cron.unschedule('push-dispatch') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'push-dispatch');
  PERFORM cron.schedule('push-dispatch', '* * * * *', replace(v_cmd, '/api/iyzico/auto-approve', '/api/push/dispatch'));
END $$;
