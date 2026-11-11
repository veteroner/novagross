-- [restore] Canlıya uygulanmış (supabase_migrations.schema_migrations version 20260613180450,
-- [restore] name ad_balance_topups) ama dosyası repoda yoktu. Aşağıdaki gövde canlıdaki
-- [restore] statements ile birebir aynıdır (md5 doğrulamalı); düzenlemeyin.

CREATE TABLE IF NOT EXISTS ad_balance_topups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  conversation_id text NOT NULL,
  basket_id text NOT NULL,
  token text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ad_topups_store ON ad_balance_topups(store_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_topups_basket ON ad_balance_topups(basket_id);

ALTER TABLE ad_balance_topups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seller reads own topups" ON ad_balance_topups FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
