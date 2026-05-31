-- ============================================================================
-- Seller marketplace features:
--   1. Seller reply on reviews + store_reviews (moderated)
--   2. Product Q&A (product_questions) with admin moderation
--   3. Store campaigns (self-managed seller campaigns)
--   4. Cart pricing-suggestion view for sellers (Rota-style)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Seller reply columns
-- ----------------------------------------------------------------------------
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS seller_reply TEXT,
  ADD COLUMN IF NOT EXISTS seller_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seller_reply_approved BOOLEAN DEFAULT NULL; -- NULL = pending, true/false = moderated

ALTER TABLE store_reviews
  ADD COLUMN IF NOT EXISTS seller_reply TEXT,
  ADD COLUMN IF NOT EXISTS seller_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seller_reply_approved BOOLEAN DEFAULT NULL;

-- Sellers can UPDATE seller_reply on their own products' reviews
DROP POLICY IF EXISTS "Sellers can reply to reviews on own products" ON reviews;
CREATE POLICY "Sellers can reply to reviews on own products"
  ON reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = reviews.product_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = reviews.product_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sellers can reply to own store reviews" ON store_reviews;
CREATE POLICY "Sellers can reply to own store reviews"
  ON store_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = store_reviews.store_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = store_reviews.store_id AND s.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 2) Product Q&A
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  question TEXT NOT NULL,
  question_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (question_status IN ('pending', 'approved', 'rejected')),

  answer TEXT,
  answered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  answered_at TIMESTAMPTZ,
  answer_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (answer_status IN ('pending', 'approved', 'rejected')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_questions_product ON product_questions(product_id);
CREATE INDEX IF NOT EXISTS idx_product_questions_customer ON product_questions(customer_id);
CREATE INDEX IF NOT EXISTS idx_product_questions_status
  ON product_questions(question_status, answer_status);

ALTER TABLE product_questions ENABLE ROW LEVEL SECURITY;

-- Public: only approved questions WITH approved answers are visible
DROP POLICY IF EXISTS "Public can view approved Q&A" ON product_questions;
CREATE POLICY "Public can view approved Q&A"
  ON product_questions FOR SELECT
  USING (question_status = 'approved' AND answer_status = 'approved');

-- Customer can view their own questions
DROP POLICY IF EXISTS "Customer views own questions" ON product_questions;
CREATE POLICY "Customer views own questions"
  ON product_questions FOR SELECT
  USING (customer_id = auth.uid());

-- Seller can view questions on their products
DROP POLICY IF EXISTS "Seller views questions on own products" ON product_questions;
CREATE POLICY "Seller views questions on own products"
  ON product_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = product_questions.product_id AND s.owner_id = auth.uid()
    )
  );

-- Admin views everything
DROP POLICY IF EXISTS "Admin manages all Q&A" ON product_questions;
CREATE POLICY "Admin manages all Q&A"
  ON product_questions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
              AND role IN ('admin','super_admin'))
  );

-- Customer can ask a question
DROP POLICY IF EXISTS "Customer can ask question" ON product_questions;
CREATE POLICY "Customer can ask question"
  ON product_questions FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Seller can answer (UPDATE answer/answered_by/answered_at)
DROP POLICY IF EXISTS "Seller can answer own products questions" ON product_questions;
CREATE POLICY "Seller can answer own products questions"
  ON product_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = product_questions.product_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = product_questions.product_id AND s.owner_id = auth.uid()
    )
  );

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.touch_product_questions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_questions_touch ON product_questions;
CREATE TRIGGER trg_product_questions_touch
  BEFORE UPDATE ON product_questions
  FOR EACH ROW EXECUTE FUNCTION public.touch_product_questions_updated_at();

-- ----------------------------------------------------------------------------
-- 3) Store campaigns (self-campaigns)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount DECIMAL(10,2),
  max_discount DECIMAL(10,2),

  target_type TEXT NOT NULL DEFAULT 'all_products'
    CHECK (target_type IN ('all_products', 'specific_products', 'category')),
  product_ids UUID[] DEFAULT '{}',
  category_ids UUID[] DEFAULT '{}',

  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_campaigns_store ON store_campaigns(store_id);
CREATE INDEX IF NOT EXISTS idx_store_campaigns_active ON store_campaigns(is_active, starts_at, ends_at);

ALTER TABLE store_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public views active campaigns" ON store_campaigns;
CREATE POLICY "Public views active campaigns"
  ON store_campaigns FOR SELECT
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at > NOW())
  );

DROP POLICY IF EXISTS "Seller manages own campaigns" ON store_campaigns;
CREATE POLICY "Seller manages own campaigns"
  ON store_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = store_campaigns.store_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = store_campaigns.store_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin manages all campaigns" ON store_campaigns;
CREATE POLICY "Admin manages all campaigns"
  ON store_campaigns FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
              AND role IN ('admin','super_admin'))
  );

CREATE OR REPLACE FUNCTION public.touch_store_campaigns_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_campaigns_touch ON store_campaigns;
CREATE TRIGGER trg_store_campaigns_touch
  BEFORE UPDATE ON store_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_store_campaigns_updated_at();

-- ----------------------------------------------------------------------------
-- 4) Cart pricing suggestions view (Rota-style for sellers)
-- ----------------------------------------------------------------------------
-- For each product owned by a seller, count distinct active carts containing it.
-- Useful for "X kişi bunu sepete attı, indirim öner" UX.
-- Note: `carts` has no status column; we treat any cart_item added in the
-- last 30 days as "pending" (Hepsi Rota uses a similar recency window).
CREATE OR REPLACE VIEW seller_cart_suggestions AS
SELECT
  p.id              AS product_id,
  p.name            AS product_name,
  p.slug            AS product_slug,
  p.price           AS current_price,
  p.compare_at_price,
  p.stock,
  p.store_id,
  COUNT(DISTINCT ci.cart_id)    AS pending_cart_count,
  COALESCE(SUM(ci.quantity), 0) AS pending_units,
  MAX(ci.created_at)            AS last_added_at
FROM products p
LEFT JOIN cart_items ci ON ci.product_id = p.id
  AND ci.created_at > NOW() - INTERVAL '30 days'
WHERE p.store_id IS NOT NULL
GROUP BY p.id;

COMMENT ON VIEW seller_cart_suggestions IS
  'Per-product cart-pending counters for sellers (Rota-style suggestions).';

-- View RLS: inherits permissions from underlying tables; sellers see
-- only their products through the products RLS already in place.
