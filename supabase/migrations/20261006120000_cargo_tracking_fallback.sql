-- =====================================================
-- MNG kargo takibi: tekil yedek kontrol + okutulmamış paket uyarısı + çalışma kaydı
-- =====================================================
-- Toplu sorgu (getStatusChangedShipments) yalnızca son ~26 saati görüyor ve MNG
-- eski tarihleri reddediyor (26154) → kaçırılan değişiklik geri alınamıyordu.
-- Hatalar da sessizce "değişiklik yok" sayılıyordu.
-- =====================================================

ALTER TABLE public.order_shipments
  ADD COLUMN IF NOT EXISTS mng_shipment_id text,
  ADD COLUMN IF NOT EXISTS mng_last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS mng_not_scanned_alerted_at timestamptz;

COMMENT ON COLUMN public.order_shipments.mng_shipment_id IS 'MNG getorder.shipmentId — paket şubede okutulup gönderiye dönüşünce dolar';
COMMENT ON COLUMN public.order_shipments.mng_not_scanned_alerted_at IS 'Etiket oluşturulduğu halde MNG''de gönderiye dönüşmeme uyarısının gönderildiği zaman';

CREATE TABLE IF NOT EXISTS public.cargo_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors text[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_cargo_sync_runs_ran_at ON public.cargo_sync_runs (ran_at DESC);

-- Yazma yalnızca service role (cron route); okuma aşağıdaki admin politikasıyla
ALTER TABLE public.cargo_sync_runs ENABLE ROW LEVEL SECURITY;

-- Admin "Teslimat Sorunları" sayfası tarayıcı istemcisiyle okur
DROP POLICY IF EXISTS cargo_sync_runs_admin_read ON public.cargo_sync_runs;
CREATE POLICY cargo_sync_runs_admin_read ON public.cargo_sync_runs FOR SELECT TO authenticated USING (public.is_admin());
GRANT SELECT ON public.cargo_sync_runs TO authenticated;
