-- KRİTİK FIX: "Sellers can update own products" policy'sinin WITH CHECK'inde
-- bozuk subquery vardı: WHERE products_1.id = products_1.id (her zaman true)
-- → subquery tüm satırları döndürüyor → her seller UPDATE'i
-- "more than one row returned by a subquery used as an expression" ile patlıyordu.
-- Satıcılar stok/fiyat dahil hiçbir ürün alanını güncelleyemiyordu.
--
-- approval_status/approved_by/approved_at değişiklik koruması ZATEN
-- enforce_product_moderation trigger'ında var (OLD/NEW karşılaştırması orada
-- doğru çalışıyor). Policy yalnızca sahiplik kontrolü yapar.
DROP POLICY IF EXISTS "Sellers can update own products" ON public.products;
CREATE POLICY "Sellers can update own products" ON public.products
  FOR UPDATE
  USING (owns_store(store_id))
  WITH CHECK (owns_store(store_id));
