-- KRİTİK FIX: stores tablosundaki yeni kolonlara authenticated için SELECT
-- yetkisi yoktu — PostgREST select('*') hata atıp null dönüyordu → seller
-- dashboard '"Mağaza Bulunamadı'" gösteriyordu.
--
-- RLS zaten "Sellers can view own store" (auth.uid()=owner_id) ile satır
-- bazlı filtreleme yapıyor, sızıntı yok. anon'a yetki verilmiyor.

-- Bu iyzico alt-üye kolonları hiçbir migration'da eklenmemişti (prod'a elle
-- eklenmiş — şema drift'i). Aşağıdaki GRANT onlara referans verdiği için
-- sıfırdan replay (Schema Reproducibility DR) "column does not exist" ile
-- patlıyordu. IF NOT EXISTS ile idempotent: prod'da no-op, replay'de yaratır.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS iyzico_sub_merchant_key TEXT,
  ADD COLUMN IF NOT EXISTS iyzico_sub_merchant_external_id TEXT,
  ADD COLUMN IF NOT EXISTS iyzico_registered_at TIMESTAMPTZ;

GRANT SELECT (
  taxpayer_type,
  is_withholding_exempt,
  withholding_exempt_verified,
  withholding_exempt_verified_at,
  withholding_exempt_verified_by,
  tradesman_certificate_url,
  kdv_rate,
  iyzico_sub_merchant_key,
  iyzico_sub_merchant_external_id,
  iyzico_registered_at
) ON public.stores TO authenticated;
