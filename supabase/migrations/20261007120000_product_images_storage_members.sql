-- product-images bucket: mağaza ÜYELERİ (yönetici/personel) de kendi mağazalarının
-- ürün görsellerini yükleyip yönetebilsin. products / product_images tabloları zaten
-- is_store_member(store_id, 'staff') kullanıyordu; storage politikaları yalnızca
-- stores.owner_id'ye bakıyordu → personel ürün ekleyip görsel yükleyemiyordu.

DROP POLICY IF EXISTS "Sellers upload to own product folder" ON storage.objects;
CREATE POLICY "Sellers upload to own product folder" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND (
    public.is_admin() OR (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.products p WHERE public.is_store_member(p.store_id, 'staff')
    )
  )
);

DROP POLICY IF EXISTS "Admins or owners can update product images" ON storage.objects;
CREATE POLICY "Admins or owners can update product images" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images' AND (
    public.is_admin() OR (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.products p WHERE public.is_store_member(p.store_id, 'staff')
    )
  )
);

DROP POLICY IF EXISTS "Admins or owners can delete product images" ON storage.objects;
CREATE POLICY "Admins or owners can delete product images" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images' AND (
    public.is_admin() OR (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.products p WHERE public.is_store_member(p.store_id, 'staff')
    )
  )
);
