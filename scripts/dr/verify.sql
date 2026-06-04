-- =============================================================================
-- Novagross — DR sonrası güvenlik bütünlüğü doğrulaması
-- Restore'dan sonra çalıştır: psql "$SUPABASE_DB_URL" -f scripts/dr/verify.sql
-- Tüm satırlar ✅ olmalı.
-- =============================================================================

-- 1. RLS tüm public tablolarda açık mı? (0 = sorun)
SELECT 'RLS kapali tablo' AS kontrol,
  count(*) FILTER (WHERE NOT c.relrowsecurity) AS deger,
  CASE WHEN count(*) FILTER (WHERE NOT c.relrowsecurity) = 0 THEN '✅' ELSE '❌' END AS durum
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r';

-- 2. Güvenlik trigger'ları yerinde mi? (>=15 beklenir)
SELECT 'Guvenlik trigger sayisi' AS kontrol, count(*) AS deger,
  CASE WHEN count(*) >= 15 THEN '✅' ELSE '❌' END AS durum
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND NOT t.tgisinternal
  AND t.tgname LIKE ANY (ARRAY['enforce_%','trg_%integrity%','trg_%safety%','trg_prevent_%','trg_validate_%','trg_%lock%','trg_%cap%','trg_%moderation%']);

-- 3. stores finansal kolonlar anon'dan gizli mi?
SELECT 'stores.iban anon erisimi' AS kontrol,
  has_column_privilege('anon','public.stores','iban','SELECT')::text AS deger,
  CASE WHEN NOT has_column_privilege('anon','public.stores','iban','SELECT') THEN '✅' ELSE '❌' END AS durum;

-- 4. Tehlikeli RPC anon'a kapalı mı?
SELECT 'approve_return_request anon EXECUTE' AS kontrol,
  has_function_privilege('anon','public.approve_return_request(uuid,uuid,text)','EXECUTE')::text AS deger,
  CASE WHEN NOT has_function_privilege('anon','public.approve_return_request(uuid,uuid,text)','EXECUTE') THEN '✅' ELSE '❌' END AS durum;

-- 5. SECURITY DEFINER view leak'leri kapalı mı (security_invoker)?
SELECT 'popular_products security_invoker' AS kontrol,
  COALESCE((SELECT (reloptions::text LIKE '%security_invoker=on%') FROM pg_class WHERE relname='popular_products'), false)::text AS deger,
  CASE WHEN COALESCE((SELECT (reloptions::text LIKE '%security_invoker=on%') FROM pg_class WHERE relname='popular_products'), false) THEN '✅' ELSE '❌' END AS durum;

-- 6. active_sessions anon'a kapalı mı?
SELECT 'active_sessions anon erisimi' AS kontrol,
  has_table_privilege('anon','public.active_sessions','SELECT')::text AS deger,
  CASE WHEN NOT has_table_privilege('anon','public.active_sessions','SELECT') THEN '✅' ELSE '❌' END AS durum;
