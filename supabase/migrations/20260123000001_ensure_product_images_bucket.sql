-- ============================================================================
-- Ensure Product Images Storage Bucket Exists
-- ============================================================================
-- This migration ensures the product-images bucket exists with correct policies
-- ============================================================================

-- Create bucket if not exists
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

-- Drop existing policies to recreate them (handle both naming variants)
DROP POLICY IF EXISTS "Public Access for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can update their product images" ON storage.objects;
DROP POLICY IF EXISTS "Sellers can delete their product images" ON storage.objects;

-- Anyone can view product images
CREATE POLICY "Public Access for product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Admins can do everything
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_seller = true
    )
  )
);

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' AND
  (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_seller = true
    )
  )
);

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' AND
  (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_seller = true
    )
  )
);

-- Verify
SELECT 
  'Product images bucket configured successfully!' as status,
  b.id,
  b.name,
  b.public,
  b.file_size_limit,
  b.allowed_mime_types
FROM storage.buckets b
WHERE b.id = 'product-images';
