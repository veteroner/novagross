-- =============================================================================
-- Influencer / Affiliate sistemi
-- =============================================================================

CREATE TABLE IF NOT EXISTS influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  social_handle TEXT,
  social_platform TEXT,
  follower_count INT,
  bio TEXT,

  ref_code TEXT NOT NULL UNIQUE,
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00 CHECK (commission_percent >= 0 AND commission_percent <= 100),

  total_clicks INT DEFAULT 0,
  total_sales INT DEFAULT 0,
  total_earnings DECIMAL(12,2) DEFAULT 0,
  paid_earnings DECIMAL(12,2) DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','suspended')),
  rejection_reason TEXT,

  payout_iban TEXT,
  payout_name TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_influencers_status ON influencers(status);
CREATE INDEX IF NOT EXISTS idx_influencers_ref_code ON influencers(ref_code);

ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads approved ref codes" ON influencers;
CREATE POLICY "Public reads approved ref codes" ON influencers FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "User reads own influencer" ON influencers;
CREATE POLICY "User reads own influencer" ON influencers FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "User updates own influencer payout" ON influencers;
CREATE POLICY "User updates own influencer payout" ON influencers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin manages all influencers" ON influencers;
CREATE POLICY "Admin manages all influencers" ON influencers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

CREATE OR REPLACE FUNCTION public.touch_influencers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_influencers_touch ON influencers;
CREATE TRIGGER trg_influencers_touch BEFORE UPDATE ON influencers
  FOR EACH ROW EXECUTE FUNCTION public.touch_influencers_updated_at();

-- =============================================================================
-- affiliate_clicks
-- =============================================================================
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  ref_code TEXT NOT NULL,
  visitor_id TEXT,
  user_id UUID,
  landing_url TEXT,
  user_agent TEXT,
  referer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_inf ON affiliate_clicks(influencer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created ON affiliate_clicks(created_at DESC);

ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can log clicks" ON affiliate_clicks;
CREATE POLICY "Public can log clicks" ON affiliate_clicks FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Influencer reads own clicks" ON affiliate_clicks;
CREATE POLICY "Influencer reads own clicks" ON affiliate_clicks FOR SELECT
  USING (EXISTS (SELECT 1 FROM influencers i WHERE i.id = affiliate_clicks.influencer_id AND i.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin reads all clicks" ON affiliate_clicks;
CREATE POLICY "Admin reads all clicks" ON affiliate_clicks FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- =============================================================================
-- affiliate_sales
-- =============================================================================
CREATE TABLE IF NOT EXISTS affiliate_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_total DECIMAL(12,2) NOT NULL,
  commission_percent DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','paid','cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_sales_inf ON affiliate_sales(influencer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_order ON affiliate_sales(order_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_status ON affiliate_sales(status);

ALTER TABLE affiliate_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Influencer reads own sales" ON affiliate_sales;
CREATE POLICY "Influencer reads own sales" ON affiliate_sales FOR SELECT
  USING (EXISTS (SELECT 1 FROM influencers i WHERE i.id = affiliate_sales.influencer_id AND i.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin manages all sales" ON affiliate_sales;
CREATE POLICY "Admin manages all sales" ON affiliate_sales FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- =============================================================================
-- influencer_stats view
-- =============================================================================
CREATE OR REPLACE VIEW influencer_stats AS
SELECT
  i.id AS influencer_id,
  i.name,
  i.ref_code,
  i.commission_percent,
  i.status,
  i.total_earnings,
  i.paid_earnings,
  COUNT(DISTINCT c.id) AS clicks_count,
  COUNT(DISTINCT s.id) AS sales_count,
  COALESCE(SUM(s.commission_amount) FILTER (WHERE s.status IN ('confirmed','paid')), 0) AS confirmed_earnings,
  COALESCE(SUM(s.commission_amount) FILTER (WHERE s.status = 'pending'), 0) AS pending_earnings
FROM influencers i
LEFT JOIN affiliate_clicks c ON c.influencer_id = i.id
LEFT JOIN affiliate_sales s ON s.influencer_id = i.id
GROUP BY i.id;

GRANT SELECT ON influencer_stats TO authenticated, anon;
