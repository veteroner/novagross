-- =============================================================================
-- Nova Store - Alt kategori dağıtımı doğrulama sorguları
-- Tarih: 2026-02-16
--
-- Kullanım:
-- 1) Önce supabase/20260216_kategori_alt_kategori_kurulum.sql çalıştırın
-- 2) Bu dosyadaki sorguları Supabase SQL Editor'da çalıştırın
-- =============================================================================

-- 0) Hızlı görünüm: parent/child ağaç
SELECT
  p.slug AS parent_slug,
  p.name AS parent_name,
  c.slug AS child_slug,
  c.name AS child_name,
  c.is_active AS child_active,
  c.sort_order
FROM public.categories c
JOIN public.categories p ON p.id = c.parent_id
WHERE p.slug IN (
  'telefon-kiliflari','ev-duzenleme','kedi-urunleri','mutfak-organizasyon','kus-urunleri','akilli-saat','dekoratif-urunler','oyuncak-hobi','tablet-aksesuarlari'
)
ORDER BY p.slug, c.sort_order, c.name;

-- 1) Parent kategorilerde kalan ürün var mı? (idealde 0'a yakın olmalı)
SELECT
  c.slug AS parent_slug,
  c.name AS parent_name,
  COUNT(*) AS products_still_on_parent
FROM public.products p
JOIN public.categories c ON c.id = p.category_id
WHERE c.parent_id IS NULL
  AND c.slug IN (
    'telefon-kiliflari','ev-duzenleme','kedi-urunleri','mutfak-organizasyon','kus-urunleri','akilli-saat','dekoratif-urunler','oyuncak-hobi','tablet-aksesuarlari'
  )
  AND p.is_active = true
  AND p.approval_status = 'approved'
GROUP BY c.slug, c.name
ORDER BY products_still_on_parent DESC, c.slug;

-- 2) Parent kategoride kalan ürünleri tek tek listele (kural eklemek için)
SELECT
  c.slug AS parent_slug,
  p.slug AS product_slug,
  p.name AS product_name
FROM public.products p
JOIN public.categories c ON c.id = p.category_id
WHERE c.parent_id IS NULL
  AND c.slug IN (
    'telefon-kiliflari','ev-duzenleme','kedi-urunleri','mutfak-organizasyon','kus-urunleri','akilli-saat','dekoratif-urunler','oyuncak-hobi','tablet-aksesuarlari'
  )
  AND p.is_active = true
  AND p.approval_status = 'approved'
ORDER BY c.slug, p.name;

-- 3) İnaktif kategoriye ürün atanmış mı? (olmaması iyi)
SELECT
  c.slug AS category_slug,
  c.name AS category_name,
  c.is_active,
  COUNT(*) AS products_on_inactive_category
FROM public.products p
JOIN public.categories c ON c.id = p.category_id
WHERE c.is_active = false
  AND p.is_active = true
  AND p.approval_status = 'approved'
GROUP BY c.slug, c.name, c.is_active
HAVING COUNT(*) > 0
ORDER BY products_on_inactive_category DESC, c.slug;

-- 4) Alt kategorilerde ürün sayıları
SELECT
  p.slug AS parent_slug,
  c.slug AS child_slug,
  c.name AS child_name,
  c.is_active,
  COUNT(pr.id) AS direct_products
FROM public.categories c
JOIN public.categories p ON p.id = c.parent_id
LEFT JOIN public.products pr
  ON pr.category_id = c.id
  AND pr.is_active = true
  AND pr.approval_status = 'approved'
WHERE p.slug IN (
  'telefon-kiliflari','ev-duzenleme','kedi-urunleri','mutfak-organizasyon','kus-urunleri','akilli-saat','dekoratif-urunler','oyuncak-hobi','tablet-aksesuarlari'
)
GROUP BY p.slug, c.slug, c.name, c.is_active
ORDER BY p.slug, direct_products DESC, c.slug;

-- 5) Dağıtım sonrası: ürün sayıları parent+child toplam
SELECT
  parent.slug AS parent_slug,
  parent.name AS parent_name,
  (
    SELECT COUNT(*)
    FROM public.products p
    WHERE p.is_active = true
      AND p.approval_status = 'approved'
      AND p.category_id IN (
        SELECT id
        FROM public.categories c2
        WHERE c2.id = parent.id OR c2.parent_id = parent.id
      )
  ) AS total_products_including_children
FROM public.categories parent
WHERE parent.parent_id IS NULL
  AND parent.slug IN (
    'telefon-kiliflari','ev-duzenleme','kedi-urunleri','mutfak-organizasyon','kus-urunleri','akilli-saat','dekoratif-urunler','oyuncak-hobi','tablet-aksesuarlari'
  )
ORDER BY total_products_including_children DESC, parent.slug;

-- 6) Geri dönüş (isteğe bağlı) - sadece referans
-- UPDATE public.products p
-- SET category_id = b.old_category_id
-- FROM public.product_category_backup_20260216 b
-- WHERE b.product_id = p.id;
