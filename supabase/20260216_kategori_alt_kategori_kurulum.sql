-- =============================================================================
-- Nova Store - Kategori / Alt Kategori Kurulumu (idempotent)
-- Tarih: 2026-02-16
--
-- Amaç:
-- - Mevcut 9 ana kategoriyi (parent) koruyup alt kategoriler eklemek
-- - Ürünleri basit anahtar-kelime kurallarıyla alt kategorilere dağıtmak
-- - Boş alt kategorileri otomatik pasif yapmak (iyzico: boş aktif kategori istemiyor)
-- - Geri dönüş için ürün->kategori yedeği almak
--
-- Çalıştırma:
-- - Supabase SQL Editor'da tek parça halinde çalıştırın.
-- - Script, slug çakışmalarında ON CONFLICT ile günceller.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) Ürün kategori yedeği (geri dönüş için)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_category_backup_20260216 (
  product_id UUID PRIMARY KEY,
  old_category_id UUID,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.product_category_backup_20260216 (product_id, old_category_id)
SELECT p.id, p.category_id
FROM public.products p
ON CONFLICT (product_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 1) Ana kategorileri parent olarak sabitle (parent_id = NULL)
-- -----------------------------------------------------------------------------
UPDATE public.categories
SET parent_id = NULL
WHERE slug IN (
  'telefon-kiliflari',
  'ev-duzenleme',
  'kedi-urunleri',
  'mutfak-organizasyon',
  'kus-urunleri',
  'akilli-saat',
  'dekoratif-urunler',
  'oyuncak-hobi',
  'tablet-aksesuarlari'
);

-- -----------------------------------------------------------------------------
-- 2) Alt kategorileri ekle (ON CONFLICT slug)
-- -----------------------------------------------------------------------------
-- Telefon Kılıfları & Aksesuarları
WITH parent AS (SELECT id FROM public.categories WHERE slug = 'telefon-kiliflari')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'iPhone Kılıfları', 'telefon-kiliflari-iphone-kilif', 'iPhone uyumlu kılıf ve kapaklar', parent.id, 10, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

WITH parent AS (SELECT id FROM public.categories WHERE slug = 'telefon-kiliflari')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Samsung Kılıfları', 'telefon-kiliflari-samsung-kilif', 'Samsung uyumlu kılıf ve kapaklar', parent.id, 20, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

WITH parent AS (SELECT id FROM public.categories WHERE slug = 'telefon-kiliflari')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Ekran Koruyucular', 'telefon-kiliflari-ekran-koruyucu', 'Ekran koruyucu ve cam ürünleri', parent.id, 30, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- Ev Düzenleme & Saklama
WITH parent AS (SELECT id FROM public.categories WHERE slug = 'ev-duzenleme')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Düzenleyiciler', 'ev-duzenleme-duzenleyiciler', 'Organizer, raf, kutu, sepet vb.', parent.id, 10, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

WITH parent AS (SELECT id FROM public.categories WHERE slug = 'ev-duzenleme')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Kalemlik & Masaüstü', 'ev-duzenleme-kalemlik-masaustu', 'Kalemlik, masaüstü düzen ürünleri', parent.id, 20, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

WITH parent AS (SELECT id FROM public.categories WHERE slug = 'ev-duzenleme')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Kablo Düzenleme', 'ev-duzenleme-kablo-duzenleme', 'Kablo sarıcı, kablo düzenleyici ürünler', parent.id, 30, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- Kedi Ürünleri
WITH parent AS (SELECT id FROM public.categories WHERE slug = 'kedi-urunleri')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Kedi Kumu', 'kedi-urunleri-kedi-kumu', 'Kedi kumu ürünleri', parent.id, 10, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

WITH parent AS (SELECT id FROM public.categories WHERE slug = 'kedi-urunleri')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Malt & Bakım', 'kedi-urunleri-malt-bakim', 'Malt, bakım ve destek ürünleri', parent.id, 20, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

WITH parent AS (SELECT id FROM public.categories WHERE slug = 'kedi-urunleri')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Taşıma & Aksesuar', 'kedi-urunleri-tasima-aksesuar', 'Taşıma çantası/kafesi ve aksesuarlar', parent.id, 30, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- Mutfak Organizasyonu
WITH parent AS (SELECT id FROM public.categories WHERE slug = 'mutfak-organizasyon')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Kahve Düzenleme', 'mutfak-organizasyon-kahve', 'Kapsül kahve ve kahve düzenleyiciler', parent.id, 10, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

WITH parent AS (SELECT id FROM public.categories WHERE slug = 'mutfak-organizasyon')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Süngerlik & Tezgah', 'mutfak-organizasyon-sungerlik-tezgah', 'Süngerlik, bez askı, tezgah üstü düzen', parent.id, 20, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

WITH parent AS (SELECT id FROM public.categories WHERE slug = 'mutfak-organizasyon')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Kaşık Altlığı & Küçük Aksesuar', 'mutfak-organizasyon-kasik-altligi', 'Kaşık altlığı ve küçük mutfak aksesuarları', parent.id, 30, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- Kuş Ürünleri
WITH parent AS (SELECT id FROM public.categories WHERE slug = 'kus-urunleri')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Muhabbet Kuşu Yemleri', 'kus-urunleri-muhabbet', 'Muhabbet kuşu yemleri', parent.id, 10, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

WITH parent AS (SELECT id FROM public.categories WHERE slug = 'kus-urunleri')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Papağan Yemleri', 'kus-urunleri-papagan', 'Papağan yemleri', parent.id, 20, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

WITH parent AS (SELECT id FROM public.categories WHERE slug = 'kus-urunleri')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Kanarya Yemleri', 'kus-urunleri-kanarya', 'Kanarya yemleri', parent.id, 30, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- Akıllı Saat Aksesuarları
WITH parent AS (SELECT id FROM public.categories WHERE slug = 'akilli-saat')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Kordonlar', 'akilli-saat-kordonlar', 'Apple Watch ve uyumlu saat kordonları', parent.id, 10, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- Dekoratif Ürünler
WITH parent AS (SELECT id FROM public.categories WHERE slug = 'dekoratif-urunler')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Hediyelik Objeler', 'dekoratif-urunler-hediyelik-obje', 'Hediyelik obje ve aksesuarlar', parent.id, 10, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

WITH parent AS (SELECT id FROM public.categories WHERE slug = 'dekoratif-urunler')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Çiçek & Figür', 'dekoratif-urunler-cicek-figur', 'Dekoratif çiçek/figür ürünleri', parent.id, 20, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- Oyuncak & Hobi
WITH parent AS (SELECT id FROM public.categories WHERE slug = 'oyuncak-hobi')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Oyuncaklar', 'oyuncak-hobi-oyuncaklar', 'Kurmalı oyuncaklar vb.', parent.id, 10, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

WITH parent AS (SELECT id FROM public.categories WHERE slug = 'oyuncak-hobi')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Kart & Kutu', 'oyuncak-hobi-kart-kutu', 'UNO vb. kart/kutu/düzenleme ürünleri', parent.id, 20, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- Tablet Aksesuarları
WITH parent AS (SELECT id FROM public.categories WHERE slug = 'tablet-aksesuarlari')
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active)
SELECT 'Ekran Koruyucular', 'tablet-aksesuarlari-ekran-koruyucu', 'Tablet ekran koruyucu ürünleri', parent.id, 10, true FROM parent
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- -----------------------------------------------------------------------------
-- 3) Ürünleri alt kategorilere dağıt
--    Not: Kurallar en basit haliyle name üzerinden çalışır.
-- -----------------------------------------------------------------------------

-- Telefon: iPhone
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'telefon-kiliflari-iphone-kilif')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'telefon-kiliflari')
  AND (
    LOWER(p.name) LIKE '%iphone%'
    OR LOWER(p.name) LIKE '%ios%'
  );

-- Telefon: Samsung
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'telefon-kiliflari-samsung-kilif')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'telefon-kiliflari')
  AND (
    LOWER(p.name) LIKE '%samsung%'
    OR LOWER(p.name) LIKE '%galaxy%'
  );

-- Telefon: ekran koruyucu/cam
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'telefon-kiliflari-ekran-koruyucu')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'telefon-kiliflari')
  AND (
    LOWER(p.name) LIKE '%ekran%koruyucu%'
    OR LOWER(p.name) LIKE '%cam%'
    OR LOWER(p.name) LIKE '%glass%'
    OR LOWER(p.name) LIKE '%koruyucu%'
  );

-- Ev düzenleme: kalemlik/çekmece
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'ev-duzenleme-kalemlik-masaustu')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'ev-duzenleme')
  AND (
    LOWER(p.name) LIKE '%kalemlik%'
    OR LOWER(p.name) LIKE '%masaüstü%'
    OR LOWER(p.name) LIKE '%cekmece%'
    OR LOWER(p.name) LIKE '%çekmece%'
  );

-- Ev düzenleme: kablo
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'ev-duzenleme-kablo-duzenleme')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'ev-duzenleme')
  AND (
    LOWER(p.name) LIKE '%kablo%'
    OR LOWER(p.name) LIKE '%şarj%kablosu%'
    OR LOWER(p.name) LIKE '%sarici%'
    OR LOWER(p.name) LIKE '%sarıcı%'
  );

-- Ev düzenleme: organizer/düzenleyici
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'ev-duzenleme-duzenleyiciler')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'ev-duzenleme')
  AND (
    LOWER(p.name) LIKE '%organizer%'
    OR LOWER(p.name) LIKE '%düzenleyici%'
    OR LOWER(p.name) LIKE '%duzenleyici%'
    OR LOWER(p.name) LIKE '%saklama%'
    OR LOWER(p.name) LIKE '%kutu%'
  );

-- Kedi: kum
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'kedi-urunleri-kedi-kumu')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'kedi-urunleri')
  AND LOWER(p.name) LIKE '%kedi%kumu%';

-- Kedi: malt/bakım
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'kedi-urunleri-malt-bakim')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'kedi-urunleri')
  AND (
    LOWER(p.name) LIKE '%malt%'
    OR LOWER(p.name) LIKE '%vitamin%'
    OR LOWER(p.name) LIKE '%bakım%'
    OR LOWER(p.name) LIKE '%bakim%'
  );

-- Kedi: taşıma
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'kedi-urunleri-tasima-aksesuar')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'kedi-urunleri')
  AND (
    LOWER(p.name) LIKE '%taşıma%'
    OR LOWER(p.name) LIKE '%tasima%'
    OR LOWER(p.name) LIKE '%gulliver%'
    OR LOWER(p.name) LIKE '%çanta%'
    OR LOWER(p.name) LIKE '%kafes%'
  );

-- Mutfak: kahve
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'mutfak-organizasyon-kahve')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'mutfak-organizasyon')
  AND (
    LOWER(p.name) LIKE '%kahve%'
    OR LOWER(p.name) LIKE '%kapsül%'
    OR LOWER(p.name) LIKE '%kapsul%'
  );

-- Mutfak: süngerlik/bez
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'mutfak-organizasyon-sungerlik-tezgah')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'mutfak-organizasyon')
  AND (
    LOWER(p.name) LIKE '%sünger%'
    OR LOWER(p.name) LIKE '%sunger%'
    OR LOWER(p.name) LIKE '%bez%'
    OR LOWER(p.name) LIKE '%tezgah%'
  );

-- Mutfak: kaşık altlığı
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'mutfak-organizasyon-kasik-altligi')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'mutfak-organizasyon')
  AND (
    LOWER(p.name) LIKE '%kaşık%'
    OR LOWER(p.name) LIKE '%kasik%'
    OR LOWER(p.name) LIKE '%altlık%'
    OR LOWER(p.name) LIKE '%altlik%'
  );

-- Kuş: muhabbet
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'kus-urunleri-muhabbet')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'kus-urunleri')
  AND LOWER(p.name) LIKE '%muhabbet%';

-- Kuş: papağan
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'kus-urunleri-papagan')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'kus-urunleri')
  AND (
    LOWER(p.name) LIKE '%papağan%'
    OR LOWER(p.name) LIKE '%papagan%'
  );

-- Kuş: kanarya
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'kus-urunleri-kanarya')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'kus-urunleri')
  AND LOWER(p.name) LIKE '%kanarya%';

-- Akıllı saat: kordon
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'akilli-saat-kordonlar')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'akilli-saat')
  AND (
    LOWER(p.name) LIKE '%kordon%'
    OR LOWER(p.name) LIKE '%watch%'
  );

-- Dekoratif: gül/kalp/LOVE -> çiçek & figür
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'dekoratif-urunler-cicek-figur')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'dekoratif-urunler')
  AND (
    LOWER(p.name) LIKE '%gül%'
    OR LOWER(p.name) LIKE '%gul%'
    OR LOWER(p.name) LIKE '%kalp%'
    OR LOWER(p.name) LIKE '%love%'
  );

-- Dekoratif: obje/stant/silüet -> hediyelik obje
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'dekoratif-urunler-hediyelik-obje')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'dekoratif-urunler')
  AND (
    LOWER(p.name) LIKE '%obje%'
    OR LOWER(p.name) LIKE '%stant%'
    OR LOWER(p.name) LIKE '%silüet%'
    OR LOWER(p.name) LIKE '%siluet%'
  );

-- Oyuncak & hobi: UNO -> kart & kutu
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'oyuncak-hobi-kart-kutu')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'oyuncak-hobi')
  AND LOWER(p.name) LIKE '%uno%';

-- Oyuncak & hobi: kurmalı/oyuncak -> oyuncaklar
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'oyuncak-hobi-oyuncaklar')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'oyuncak-hobi')
  AND (
    LOWER(p.name) LIKE '%oyuncak%'
    OR LOWER(p.name) LIKE '%kurmalı%'
    OR LOWER(p.name) LIKE '%kurmali%'
  );

-- Tablet: ekran koruyucu
UPDATE public.products p
SET category_id = (SELECT id FROM public.categories WHERE slug = 'tablet-aksesuarlari-ekran-koruyucu')
WHERE p.category_id = (SELECT id FROM public.categories WHERE slug = 'tablet-aksesuarlari')
  AND (
    LOWER(p.name) LIKE '%ekran%koruyucu%'
    OR LOWER(p.name) LIKE '%sm-x%'
    OR LOWER(p.name) LIKE '%tab%'
  );

-- -----------------------------------------------------------------------------
-- 4) Boş alt kategorileri pasif yap (parent'ları pasif yapma)
-- -----------------------------------------------------------------------------
UPDATE public.categories c
SET is_active = false
WHERE c.parent_id IS NOT NULL
  AND c.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.category_id = c.id
      AND p.is_active = true
      AND p.approval_status = 'approved'
  );

-- -----------------------------------------------------------------------------
-- 5) Raporlama: parent/child ve ürün sayıları
-- -----------------------------------------------------------------------------
-- Parent kategoriler (child ürünleri dahil toplam)
SELECT
  parent.slug AS parent_slug,
  parent.name AS parent_name,
  (
    SELECT COUNT(*)
    FROM public.products p
    WHERE p.is_active = true
      AND p.approval_status = 'approved'
      AND p.category_id IN (
        SELECT id FROM public.categories c2
        WHERE c2.id = parent.id OR c2.parent_id = parent.id
      )
  ) AS total_products_including_children
FROM public.categories parent
WHERE parent.parent_id IS NULL
  AND parent.slug IN (
    'telefon-kiliflari','ev-duzenleme','kedi-urunleri','mutfak-organizasyon','kus-urunleri','akilli-saat','dekoratif-urunler','oyuncak-hobi','tablet-aksesuarlari'
  )
ORDER BY parent.slug;

-- Alt kategoriler (direkt ürün sayısı)
SELECT
  p.slug AS parent_slug,
  p.name AS parent_name,
  c.slug AS child_slug,
  c.name AS child_name,
  c.is_active,
  (
    SELECT COUNT(*)
    FROM public.products pr
    WHERE pr.is_active = true
      AND pr.approval_status = 'approved'
      AND pr.category_id = c.id
  ) AS direct_products
FROM public.categories c
JOIN public.categories p ON p.id = c.parent_id
WHERE p.slug IN (
  'telefon-kiliflari','ev-duzenleme','kedi-urunleri','mutfak-organizasyon','kus-urunleri','akilli-saat','dekoratif-urunler','oyuncak-hobi','tablet-aksesuarlari'
)
ORDER BY p.slug, c.sort_order, c.name;

COMMIT;

-- =============================================================================
-- Geri dönüş (isteğe bağlı):
--   UPDATE public.products p
--   SET category_id = b.old_category_id
--   FROM public.product_category_backup_20260216 b
--   WHERE b.product_id = p.id;
-- =============================================================================
