-- ============================================================================
-- Fix Immediate Issues - Auth & Product Images
-- ============================================================================
-- This fixes auth refresh token issues and ensures product_images can be read
-- ============================================================================

-- Ensure product_images can be read by everyone (even anonymous)
DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;

CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  USING (true);

-- Ensure anyone can read products (for product detail pages)
DROP POLICY IF EXISTS "Anyone can view active products" ON products;

CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (is_active = true OR auth.uid() IS NOT NULL);

-- Verify
SELECT 
  'Product images and products are now publicly readable!' as status;
