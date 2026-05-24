-- ============================================================================
-- Fix Product Images Bucket Configuration Only
-- ============================================================================
-- Bu sadece bucket'ı düzeltir, policy'ler zaten var
-- ============================================================================

-- Bucket'ı güncelle veya oluştur
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Kontrol et
SELECT 
  'Product images bucket configured!' as status,
  b.id,
  b.name,
  b.public,
  b.file_size_limit,
  b.allowed_mime_types
FROM storage.buckets b
WHERE b.id = 'product-images';

-- Mevcut policy'leri göster
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%product-images%'
ORDER BY policyname;
