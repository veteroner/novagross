-- Storage bucket for seller documents
-- This migration creates a bucket and policies for seller application documents

-- Create storage bucket (if not exists via Supabase Dashboard)
-- Bucket name: seller-documents
-- Public: false
-- File size limit: 5MB
-- Allowed MIME types: image/*, application/pdf

-- RLS Policies for seller-documents bucket

-- 1. Users can upload their own documents
CREATE POLICY "Users can upload own seller documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'seller-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Users can view their own documents
CREATE POLICY "Users can view own seller documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'seller-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Users can delete their own documents
CREATE POLICY "Users can delete own seller documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'seller-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Admins can view all seller documents
CREATE POLICY "Admins can view all seller documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'seller-documents' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- 5. Admins can delete seller documents (for moderation)
CREATE POLICY "Admins can delete seller documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'seller-documents' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Note: Bucket must be created via Supabase Dashboard or API:
-- 1. Go to Storage section
-- 2. Create new bucket: "seller-documents"
-- 3. Set as Private (not public)
-- 4. Configure: Max file size: 5MB, Allowed types: image/*, application/pdf
