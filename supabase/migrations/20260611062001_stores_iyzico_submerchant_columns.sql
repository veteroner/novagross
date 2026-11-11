-- [restore] Canlıya uygulanmış (supabase_migrations.schema_migrations version 20260611062001,
-- [restore] name stores_iyzico_submerchant_columns) ama dosyası repoda yoktu. Aşağıdaki gövde canlıdaki
-- [restore] statements ile birebir aynıdır (md5 doğrulamalı); düzenlemeyin.
-- iyzico sub-merchant pazaryeri kaydı için kolonlar
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS iyzico_sub_merchant_key TEXT,
  ADD COLUMN IF NOT EXISTS iyzico_sub_merchant_external_id TEXT,
  ADD COLUMN IF NOT EXISTS iyzico_registered_at TIMESTAMPTZ;

-- Yalnızca admin/owner görebilir (anon/authenticated leak riski yok)
-- stores RLS zaten satıcıya kendi store'unu kapsıyor; ek policy gerekmez.

-- Migration index: lookup hızı için
CREATE INDEX IF NOT EXISTS idx_stores_iyzico_sub_merchant_key
  ON public.stores (iyzico_sub_merchant_key) WHERE iyzico_sub_merchant_key IS NOT NULL;