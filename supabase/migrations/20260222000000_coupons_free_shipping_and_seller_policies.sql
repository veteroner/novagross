-- ==========================================================================
-- Coupons: add ownership + free shipping support
-- ==========================================================================

-- Add owner reference so sellers can manage their own coupons
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coupons_created_by ON coupons(created_by);

-- Add free-shipping flag ("kargo bedava")
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS free_shipping BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_coupons_free_shipping ON coupons(free_shipping);

-- Seller-scoped policies (idempotent via DROP POLICY)
DROP POLICY IF EXISTS "Sellers can view own coupons" ON coupons;
DROP POLICY IF EXISTS "Sellers can insert own coupons" ON coupons;
DROP POLICY IF EXISTS "Sellers can update own coupons" ON coupons;
DROP POLICY IF EXISTS "Sellers can delete own coupons" ON coupons;

CREATE POLICY "Sellers can view own coupons"
  ON coupons FOR SELECT
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_seller = true
    )
  );

CREATE POLICY "Sellers can insert own coupons"
  ON coupons FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_seller = true
    )
  );

CREATE POLICY "Sellers can update own coupons"
  ON coupons FOR UPDATE
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_seller = true
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_seller = true
    )
  );

CREATE POLICY "Sellers can delete own coupons"
  ON coupons FOR DELETE
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_seller = true
    )
  );
