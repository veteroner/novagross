-- =============================================================================
-- Reklam sistemi: ad_campaigns + ad_events (impression/click tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('sponsored_product', 'sponsored_brand', 'sponsored_category')),
  product_ids UUID[] DEFAULT '{}',
  brand_keyword TEXT,

  daily_budget DECIMAL(10,2) NOT NULL CHECK (daily_budget > 0),
  bid_per_click DECIMAL(10,2) NOT NULL CHECK (bid_per_click > 0),
  total_spent DECIMAL(12,2) DEFAULT 0,

  keywords TEXT[] DEFAULT '{}',
  category_ids UUID[] DEFAULT '{}',

  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','paused','expired')),
  rejection_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_store ON ad_campaigns(store_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_active
  ON ad_campaigns(is_active, status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_keywords ON ad_campaigns USING GIN(keywords);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads approved active ads" ON ad_campaigns;
CREATE POLICY "Public reads approved active ads" ON ad_campaigns FOR SELECT
  USING (
    is_active = true AND status = 'approved'
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at > NOW())
  );

DROP POLICY IF EXISTS "Seller manages own ad campaigns" ON ad_campaigns;
CREATE POLICY "Seller manages own ad campaigns" ON ad_campaigns FOR ALL
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = ad_campaigns.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = ad_campaigns.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Admin manages all ad campaigns" ON ad_campaigns;
CREATE POLICY "Admin manages all ad campaigns" ON ad_campaigns FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

CREATE OR REPLACE FUNCTION public.touch_ad_campaigns_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_ad_campaigns_touch ON ad_campaigns;
CREATE TRIGGER trg_ad_campaigns_touch BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_ad_campaigns_updated_at();

-- =============================================================================
-- ad_events: impression/click metriği
-- =============================================================================
CREATE TABLE IF NOT EXISTS ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click', 'conversion')),
  cost DECIMAL(10,2) DEFAULT 0,
  user_id UUID,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_events_campaign ON ad_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_created ON ad_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_events_type ON ad_events(event_type, created_at DESC);

ALTER TABLE ad_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can log impressions" ON ad_events;
CREATE POLICY "Public can log impressions" ON ad_events FOR INSERT
  WITH CHECK (event_type = 'impression');

DROP POLICY IF EXISTS "Authenticated can log clicks" ON ad_events;
CREATE POLICY "Authenticated can log clicks" ON ad_events FOR INSERT
  TO authenticated
  WITH CHECK (event_type IN ('click', 'conversion'));

DROP POLICY IF EXISTS "Seller reads own ad events" ON ad_events;
CREATE POLICY "Seller reads own ad events" ON ad_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ad_campaigns c
      JOIN stores s ON s.id = c.store_id
      WHERE c.id = ad_events.campaign_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin reads all ad events" ON ad_events;
CREATE POLICY "Admin reads all ad events" ON ad_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- =============================================================================
-- ad_campaign_stats: günlük rapor için view
-- =============================================================================
CREATE OR REPLACE VIEW ad_campaign_stats AS
SELECT
  c.id AS campaign_id,
  c.store_id,
  c.name,
  c.ad_type,
  c.status,
  c.daily_budget,
  c.bid_per_click,
  c.total_spent,
  COUNT(e.id) FILTER (WHERE e.event_type = 'impression') AS impressions,
  COUNT(e.id) FILTER (WHERE e.event_type = 'click') AS clicks,
  COUNT(e.id) FILTER (WHERE e.event_type = 'conversion') AS conversions,
  COALESCE(SUM(e.cost) FILTER (WHERE e.event_type = 'click'), 0) AS spent_total,
  CASE
    WHEN COUNT(e.id) FILTER (WHERE e.event_type = 'impression') > 0
      THEN ROUND((COUNT(e.id) FILTER (WHERE e.event_type = 'click')::DECIMAL
                   / COUNT(e.id) FILTER (WHERE e.event_type = 'impression')) * 100, 2)
    ELSE 0
  END AS ctr_percent
FROM ad_campaigns c
LEFT JOIN ad_events e ON e.campaign_id = c.id
GROUP BY c.id;

GRANT SELECT ON ad_campaign_stats TO authenticated, anon;
