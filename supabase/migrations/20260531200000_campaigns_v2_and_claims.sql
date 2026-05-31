-- ============================================================================
-- Campaigns v2: BOGO + sipariş limiti + public URL
-- Customer claims: iade / değişim / şikayet sistemi
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) store_campaigns: ensure exists with BOGO + new columns
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  auto_title TEXT,
  public_slug TEXT UNIQUE,
  discount_type TEXT NOT NULL
    CHECK (discount_type IN ('percentage','fixed','bogo')),
  discount_value DECIMAL(10,2),
  buy_quantity INTEGER,
  get_quantity INTEGER,
  min_order_amount DECIMAL(10,2),
  max_discount DECIMAL(10,2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  target_type TEXT NOT NULL DEFAULT 'all_products'
    CHECK (target_type IN ('all_products','specific_products','category')),
  product_ids UUID[] DEFAULT '{}',
  category_ids UUID[] DEFAULT '{}',
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE store_campaigns
  ADD COLUMN IF NOT EXISTS auto_title TEXT,
  ADD COLUMN IF NOT EXISTS public_slug TEXT,
  ADD COLUMN IF NOT EXISTS buy_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS get_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS usage_limit INTEGER,
  ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_store_campaigns_slug
  ON store_campaigns(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_campaigns_store ON store_campaigns(store_id);
CREATE INDEX IF NOT EXISTS idx_store_campaigns_active
  ON store_campaigns(is_active, starts_at, ends_at);

-- BOGO type relaxes the previous CHECK
ALTER TABLE store_campaigns
  DROP CONSTRAINT IF EXISTS store_campaigns_discount_type_check;
ALTER TABLE store_campaigns
  ADD CONSTRAINT store_campaigns_discount_type_check
    CHECK (discount_type IN ('percentage','fixed','bogo'));

ALTER TABLE store_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public views active campaigns" ON store_campaigns;
CREATE POLICY "Public views active campaigns" ON store_campaigns FOR SELECT
  USING (is_active = true
         AND (starts_at IS NULL OR starts_at <= NOW())
         AND (ends_at IS NULL OR ends_at > NOW()));

DROP POLICY IF EXISTS "Seller manages own campaigns" ON store_campaigns;
CREATE POLICY "Seller manages own campaigns" ON store_campaigns FOR ALL
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_campaigns.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_campaigns.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admin manages all campaigns" ON store_campaigns;
CREATE POLICY "Admin manages all campaigns" ON store_campaigns FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

CREATE OR REPLACE FUNCTION public.touch_store_campaigns_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_store_campaigns_touch ON store_campaigns;
CREATE TRIGGER trg_store_campaigns_touch BEFORE UPDATE ON store_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_store_campaigns_updated_at();

-- ----------------------------------------------------------------------------
-- 2) customer_claims: müşteri talepleri (iade/değişim/şikayet)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL
    CHECK (claim_type IN ('return','exchange','complaint','damage','missing')),
  reason TEXT NOT NULL,
  description TEXT,
  attachments JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','rejected','escalated')),
  resolution TEXT,
  refund_amount DECIMAL(10,2),
  seller_responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  escalated_to_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_claims_order ON customer_claims(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_claims_customer ON customer_claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_claims_store ON customer_claims(store_id);
CREATE INDEX IF NOT EXISTS idx_customer_claims_status ON customer_claims(status);

ALTER TABLE customer_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer views own claims" ON customer_claims;
CREATE POLICY "Customer views own claims" ON customer_claims FOR SELECT
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customer creates own claims" ON customer_claims;
CREATE POLICY "Customer creates own claims" ON customer_claims FOR INSERT
  WITH CHECK (customer_id = auth.uid()
              AND EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Customer updates own open claims" ON customer_claims;
CREATE POLICY "Customer updates own open claims" ON customer_claims FOR UPDATE
  USING (customer_id = auth.uid() AND status = 'open')
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Seller views own store claims" ON customer_claims;
CREATE POLICY "Seller views own store claims" ON customer_claims FOR SELECT
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = customer_claims.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Seller manages own store claims" ON customer_claims;
CREATE POLICY "Seller manages own store claims" ON customer_claims FOR UPDATE
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = customer_claims.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = customer_claims.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admin manages all claims" ON customer_claims;
CREATE POLICY "Admin manages all claims" ON customer_claims FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

CREATE OR REPLACE FUNCTION public.touch_customer_claims_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_customer_claims_touch ON customer_claims;
CREATE TRIGGER trg_customer_claims_touch BEFORE UPDATE ON customer_claims
  FOR EACH ROW EXECUTE FUNCTION public.touch_customer_claims_updated_at();
