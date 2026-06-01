-- =============================================================================
-- Platform Avantajlı Teklifleri
-- Admin satıcıya teklif gönderir (komisyon desteği, ek indirim, ücretsiz kargo).
-- Satıcı kabul/red eder.
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  offer_type TEXT NOT NULL CHECK (
    offer_type IN ('commission_discount', 'co_funded_discount', 'free_shipping_support', 'fee_waiver')
  ),

  platform_share_percent DECIMAL(5,2),
  platform_share_amount DECIMAL(10,2),

  required_seller_discount_percent DECIMAL(5,2),
  required_min_stock INT DEFAULT 1,

  product_ids UUID[] DEFAULT '{}',
  category_ids UUID[] DEFAULT '{}',

  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  response_deadline TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected','expired','cancelled','completed')),
  seller_response_at TIMESTAMPTZ,
  rejection_reason TEXT,

  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_offers_store ON platform_offers(store_id);
CREATE INDEX IF NOT EXISTS idx_platform_offers_status ON platform_offers(status);
CREATE INDEX IF NOT EXISTS idx_platform_offers_dates ON platform_offers(starts_at, ends_at);

ALTER TABLE platform_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seller reads own/global offers" ON platform_offers;
CREATE POLICY "Seller reads own/global offers" ON platform_offers FOR SELECT
  USING (
    store_id IS NULL OR
    EXISTS (SELECT 1 FROM stores s WHERE s.id = platform_offers.store_id AND s.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Seller responds to own offers" ON platform_offers;
CREATE POLICY "Seller responds to own offers" ON platform_offers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM stores s WHERE s.id = platform_offers.store_id AND s.owner_id = auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM stores s WHERE s.id = platform_offers.store_id AND s.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin manages all platform offers" ON platform_offers;
CREATE POLICY "Admin manages all platform offers" ON platform_offers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

CREATE OR REPLACE FUNCTION public.touch_platform_offers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_platform_offers_touch ON platform_offers;
CREATE TRIGGER trg_platform_offers_touch BEFORE UPDATE ON platform_offers
  FOR EACH ROW EXECUTE FUNCTION public.touch_platform_offers_updated_at();
