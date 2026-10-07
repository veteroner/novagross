-- =====================================================
-- Cron kaynaklı satıcı bildirimleri (mobil push + uygulama içi)
-- =====================================================
-- Mevcut cron'ların yazdığı kayıtlara trigger: uygulama koduna dokunmadan
-- notify_store() çağrılır. Hata asıl işlemi durdurmaz.
--   - delivery_problems INSERT        → MNG teslimat sorunu (yönetici+)
--   - invoice_reminder_log INSERT     → fatura yükleme hatırlatması (tüm üyeler)
--   - order_shipments.mng_not_scanned_alerted_at set → paket şubede okutulmamış
-- =====================================================

CREATE OR REPLACE FUNCTION public.trg_notify_delivery_problem() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE o record; s record;
BEGIN
  BEGIN
    SELECT id, order_number INTO o FROM public.orders WHERE id = NEW.order_id;
    FOR s IN SELECT DISTINCT store_id FROM public.order_items WHERE order_id = NEW.order_id AND store_id IS NOT NULL LOOP
      PERFORM public.notify_store(s.store_id, 'manager', 'delivery_problem', 'shipping',
        'Kurye teslimat sorunu bildirdi ⚠️',
        '#' || o.order_number || COALESCE(': ' || left(NEW.problem_description, 90), '') || ' — yanıt gerekli',
        jsonb_build_object('order_id', o.id, 'order_number', o.order_number, 'delivery_problem_id', NEW.id),
        '/siparisler', 'high');
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notify_delivery_problem: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_delivery_problem ON public.delivery_problems;
CREATE TRIGGER trg_notify_delivery_problem AFTER INSERT ON public.delivery_problems
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_delivery_problem();

CREATE OR REPLACE FUNCTION public.trg_notify_invoice_reminder() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE o record;
BEGIN
  BEGIN
    SELECT id, order_number INTO o FROM public.orders WHERE id = NEW.order_id;
    PERFORM public.notify_store(NEW.store_id, 'staff', 'invoice_reminder', 'order',
      'Fatura yüklemeyi unutmayın 🧾',
      '#' || o.order_number || ' siparişinin e-Arşiv faturasını yükleyin.',
      jsonb_build_object('order_id', o.id, 'order_number', o.order_number, 'kind', NEW.kind),
      '/siparisler');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notify_invoice_reminder: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_invoice_reminder ON public.invoice_reminder_log;
CREATE TRIGGER trg_notify_invoice_reminder AFTER INSERT ON public.invoice_reminder_log
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_invoice_reminder();

CREATE OR REPLACE FUNCTION public.trg_notify_not_scanned() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE o record; s record;
BEGIN
  BEGIN
    IF NEW.mng_not_scanned_alerted_at IS NOT NULL AND OLD.mng_not_scanned_alerted_at IS NULL THEN
      SELECT id, order_number INTO o FROM public.orders WHERE id = NEW.order_id;
      FOR s IN SELECT DISTINCT store_id FROM public.order_items WHERE order_id = NEW.order_id AND store_id IS NOT NULL LOOP
        PERFORM public.notify_store(s.store_id, 'staff', 'cargo_not_scanned', 'shipping',
          'Paket MNG şubesinde okutulmadı 📦',
          '#' || o.order_number || ' etiketi 48 saattir var ama MNG kayıtlarında görünmüyor.',
          jsonb_build_object('order_id', o.id, 'order_number', o.order_number, 'tracking_number', NEW.tracking_number),
          '/siparisler', 'high');
      END LOOP;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_notify_not_scanned: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_not_scanned ON public.order_shipments;
CREATE TRIGGER trg_notify_not_scanned AFTER UPDATE OF mng_not_scanned_alerted_at ON public.order_shipments
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_not_scanned();
