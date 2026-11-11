-- [restore] Canlıya uygulanmış (supabase_migrations.schema_migrations version 20260613173336,
-- [restore] name seller_monetization_and_auth_security) ama dosyası repoda yoktu. Aşağıdaki gövde canlıdaki
-- [restore] statements ile birebir aynıdır (md5 doğrulamalı); düzenlemeyin.

-- ============ ÖZELLİK 1: SATICI MONETİZASYONU ============

-- Reklam bakiyesi (stores)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS ad_balance numeric NOT NULL DEFAULT 0;

-- Reklam bakiyesi hareket defteri
CREATE TABLE IF NOT EXISTS ad_balance_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('topup_iyzico','admin_grant','gift','ad_spend','refund','adjustment')),
  description text,
  balance_after numeric,
  payment_id text,
  campaign_id uuid REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_balance_tx_store ON ad_balance_transactions(store_id, created_at DESC);

-- Satıcı hediye kuponları (admin mağazaya komisyon/reklam kredisi hediye eder)
CREATE TABLE IF NOT EXISTS seller_gift_coupons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  remaining_amount numeric NOT NULL,
  type text NOT NULL DEFAULT 'commission_credit' CHECK (type IN ('commission_credit','ad_credit')),
  title text,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired','cancelled')),
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_seller_gift_coupons_store ON seller_gift_coupons(store_id, status);

-- Komisyon indirimli kampanyalar (admin oluşturur, satıcı ürün ekler)
CREATE TABLE IF NOT EXISTS commission_campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  discounted_commission_rate numeric NOT NULL,
  category_ids uuid[],
  min_price numeric DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commission_campaign_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES commission_campaigns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_comm_camp_products_campaign ON commission_campaign_products(campaign_id);
CREATE INDEX IF NOT EXISTS idx_comm_camp_products_product ON commission_campaign_products(product_id);

-- ============ ÖZELLİK 2: AUTH GÜVENLİĞİ ============

-- E-posta OTP kodları (admin + seller 2FA)
CREATE TABLE IF NOT EXISTS auth_otp_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL DEFAULT 'login_2fa',
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_otp_user ON auth_otp_codes(user_id, created_at DESC);

-- ============ RLS ============
ALTER TABLE ad_balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_gift_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_campaign_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_otp_codes ENABLE ROW LEVEL SECURITY;

-- Satıcı kendi mağazasının reklam hareketlerini görür (yazma yalnızca service role)
CREATE POLICY "seller reads own ad tx" ON ad_balance_transactions FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- Satıcı kendi hediye kuponlarını görür
CREATE POLICY "seller reads own gift coupons" ON seller_gift_coupons FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- Aktif komisyon kampanyalarını herkes (giriş yapmış) görebilir
CREATE POLICY "anyone reads active commission campaigns" ON commission_campaigns FOR SELECT
  USING (is_active = true);

-- Satıcı kendi opt-in kayıtlarını yönetir
CREATE POLICY "seller reads own campaign products" ON commission_campaign_products FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
CREATE POLICY "seller inserts own campaign products" ON commission_campaign_products FOR INSERT
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
CREATE POLICY "seller deletes own campaign products" ON commission_campaign_products FOR DELETE
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- auth_otp_codes: hiçbir public policy yok → yalnızca service role erişir (RLS aktif, policy yok = kilitli)
