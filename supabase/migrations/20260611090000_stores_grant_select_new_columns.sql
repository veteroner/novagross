-- KRİTİK FIX: stores tablosundaki yeni kolonlara authenticated için SELECT
-- yetkisi yoktu — PostgREST select('*') hata atıp null dönüyordu → seller
-- dashboard '"Mağaza Bulunamadı'" gösteriyordu.
--
-- RLS zaten "Sellers can view own store" (auth.uid()=owner_id) ile satır
-- bazlı filtreleme yapıyor, sızıntı yok. anon'a yetki verilmiyor.

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
