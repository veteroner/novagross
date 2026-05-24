-- Add product-images bucket for admin uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view product images
CREATE POLICY "Public Access for product-images" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');

-- Allow authenticated users (admins) to upload
CREATE POLICY "Admin can upload product images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'product-images' AND
        auth.role() = 'authenticated'
    );

-- Allow authenticated users (admins) to update
CREATE POLICY "Admin can update product images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'product-images' AND
        auth.role() = 'authenticated'
    );

-- Allow authenticated users (admins) to delete
CREATE POLICY "Admin can delete product images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'product-images' AND
        auth.role() = 'authenticated'
    );
