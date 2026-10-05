-- =====================================================
-- Mağaza bilgileri → iyzico alt üye işyeri senkronizasyonu
-- =====================================================
-- iyzico kaydı bir kez açılıyor ve mağaza bilgisi (ünvan, IBAN, vergi...)
-- değişince güncellenmiyordu → Novagross kaydı "Oner Ozbey" adıyla kaldı,
-- şirket IBAN'ına gönderim reddedildi.
--
-- Bilgiler (admin veya seller panelinden) değişince trigger mağazayı
-- iyzico_sync_needed=true işaretler; pg_cron 10 dk'da bir admin
-- /api/iyzico/sync-sub-merchants'ı çağırır (aktif + eski kayıtlar güncellenir).
-- =====================================================

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS iyzico_sub_merchant_external_id text,
  ADD COLUMN IF NOT EXISTS iyzico_legacy_sub_merchant_external_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS iyzico_sync_needed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iyzico_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS iyzico_sync_error text;

COMMENT ON COLUMN public.stores.iyzico_sub_merchant_external_id IS 'Aktif iyzico alt üye işyeri kaydının dış no''su (retrieve/update için)';
COMMENT ON COLUMN public.stores.iyzico_legacy_sub_merchant_external_ids IS 'Eski iyzico kayıtları — başarısız gönderimleri olabilir, senkronizasyonda güncellenmeye devam eder';

-- Novagross: aktif şirket kaydı 106944586, eski bireysel kayıt 106746771
UPDATE public.stores
SET iyzico_sub_merchant_external_id = 'ff8ac80b-bf43-4779-91fe-ac4eb250965b-muuyf70r',
    iyzico_legacy_sub_merchant_external_ids = ARRAY['ff8ac80b-bf43-4779-91fe-ac4eb250965b']
WHERE id = 'ff8ac80b-bf43-4779-91fe-ac4eb250965b'
  AND iyzico_sub_merchant_external_id IS NULL;

CREATE OR REPLACE FUNCTION public.mark_store_iyzico_sync_needed()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.iyzico_sub_merchant_key IS NOT NULL AND (
       NEW.store_name     IS DISTINCT FROM OLD.store_name
    OR NEW.email          IS DISTINCT FROM OLD.email
    OR NEW.phone          IS DISTINCT FROM OLD.phone
    OR NEW.address        IS DISTINCT FROM OLD.address
    OR NEW.district       IS DISTINCT FROM OLD.district
    OR NEW.city           IS DISTINCT FROM OLD.city
    OR NEW.iban           IS DISTINCT FROM OLD.iban
    OR NEW.account_holder IS DISTINCT FROM OLD.account_holder
    OR NEW.company_name   IS DISTINCT FROM OLD.company_name
    OR NEW.tax_number     IS DISTINCT FROM OLD.tax_number
    OR NEW.tax_office     IS DISTINCT FROM OLD.tax_office
    OR NEW.taxpayer_type  IS DISTINCT FROM OLD.taxpayer_type
  ) THEN
    NEW.iyzico_sync_needed := true;
    NEW.iyzico_sync_error := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_mark_store_iyzico_sync_needed ON public.stores;
CREATE TRIGGER trg_mark_store_iyzico_sync_needed
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.mark_store_iyzico_sync_needed();

-- Cron: iyzico-auto-approve job'ının Authorization header'ını (IYZICO_CRON_SECRET)
-- yeniden kullanır; secret repoya yazılmaz.
DO $$
DECLARE
  v_cmd text;
BEGIN
  SELECT command INTO v_cmd FROM cron.job WHERE jobname = 'iyzico-auto-approve';
  IF v_cmd IS NULL THEN
    RAISE NOTICE 'iyzico-auto-approve cron job yok; iyzico-sub-merchant-sync elle oluşturulmalı';
    RETURN;
  END IF;
  PERFORM cron.unschedule('iyzico-sub-merchant-sync')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'iyzico-sub-merchant-sync');
  PERFORM cron.schedule(
    'iyzico-sub-merchant-sync',
    '*/10 * * * *',
    replace(v_cmd, '/api/iyzico/auto-approve', '/api/iyzico/sync-sub-merchants')
  );
END $$;
