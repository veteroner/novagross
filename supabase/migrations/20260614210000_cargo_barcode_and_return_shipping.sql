-- Kargo barkodu + iade kargo (return shipping) altyapısı
-- 1) order_shipments'a barkod verisi (base64) eklenir
-- 2) return_requests'e iade kargo etiketi/barkodu kolonları eklenir
-- 3) MNG Kargo api_enabled = true + takip URL düzeltmesi

-- 1) Gönderi barkodu (yazdırılabilir, base64 PDF/PNG)
ALTER TABLE public.order_shipments
  ADD COLUMN IF NOT EXISTS barcode_data TEXT,
  ADD COLUMN IF NOT EXISTS provider_code TEXT; -- 'mng' | 'aras' | 'yurtici' | 'mock'

COMMENT ON COLUMN public.order_shipments.barcode_data IS 'Kargo firmasından dönen yazdırılabilir barkod (base64)';
COMMENT ON COLUMN public.order_shipments.provider_code IS 'Gönderiyi oluşturan kargo sağlayıcısı kodu';

-- 2) İade kargosu — iade onaylandığında müşteriye ürünü geri göndermesi için üretilir
ALTER TABLE public.return_requests
  ADD COLUMN IF NOT EXISTS return_carrier_code TEXT,
  ADD COLUMN IF NOT EXISTS return_tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS return_tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS return_label_url TEXT,
  ADD COLUMN IF NOT EXISTS return_barcode_data TEXT,
  ADD COLUMN IF NOT EXISTS return_shipment_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_shipment_error TEXT;

COMMENT ON COLUMN public.return_requests.return_tracking_number IS 'İade kargosu takip numarası (müşteri ürünü bu kargoyla geri gönderir)';
COMMENT ON COLUMN public.return_requests.return_barcode_data IS 'İade kargosu yazdırılabilir barkodu (base64)';

-- 3) MNG Kargo artık API ile aktif; takip URL şablonunu düzelt
UPDATE public.shipping_carriers
SET api_enabled = true,
    tracking_url_template = 'https://www.mngkargo.com.tr/gonderi-takip?code={tracking_number}'
WHERE code = 'mng';
