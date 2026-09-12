-- Şema drift onarımı: bu 5 tablo prod'a migration'sız (elle/MCP execute_sql)
-- eklenmişti — hiçbir migration onları CREATE etmiyordu. Schema Reproducibility
-- (DR) sıfırdan replay'i bu yüzden "relation does not exist" ile patlıyordu
-- (20260719084000 bunların RLS'ini kurmaya çalışırken). Ayrıca felaket kurtarmada
-- da yeniden oluşmazlardı. Prod'daki gerçek şemaya birebir uygun, IF NOT EXISTS
-- (prod'da no-op). Bu dosya 20260719084000'den ÖNCE sıralanır (RLS oradadır).

-- commission_campaigns: platform komisyon indirim kampanyaları
CREATE TABLE IF NOT EXISTS public.commission_campaigns (
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
ALTER TABLE public.commission_campaigns ENABLE ROW LEVEL SECURITY;

-- commission_campaign_products: kampanyaya katılan ürünler
CREATE TABLE IF NOT EXISTS public.commission_campaign_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES public.commission_campaigns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, product_id)
);
ALTER TABLE public.commission_campaign_products ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_comm_camp_products_campaign ON public.commission_campaign_products (campaign_id);
CREATE INDEX IF NOT EXISTS idx_comm_camp_products_product ON public.commission_campaign_products (product_id);

-- ad_balance_topups: reklam bakiyesi iyzico yükleme kayıtları
CREATE TABLE IF NOT EXISTS public.ad_balance_topups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  conversation_id text NOT NULL,
  basket_id text NOT NULL,
  token text,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','paid','failed'])),
  payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
ALTER TABLE public.ad_balance_topups ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ad_topups_store ON public.ad_balance_topups (store_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_topups_basket ON public.ad_balance_topups (basket_id);

-- ad_balance_transactions: reklam bakiyesi hareket defteri
CREATE TABLE IF NOT EXISTS public.ad_balance_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['topup_iyzico','admin_grant','gift','ad_spend','refund','adjustment'])),
  description text,
  balance_after numeric,
  payment_id text,
  campaign_id uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_balance_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ad_balance_tx_store ON public.ad_balance_transactions (store_id, created_at DESC);

-- seller_gift_coupons: satıcıya verilen komisyon/reklam kredisi hediye kuponları
CREATE TABLE IF NOT EXISTS public.seller_gift_coupons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  remaining_amount numeric NOT NULL,
  type text NOT NULL DEFAULT 'commission_credit' CHECK (type = ANY (ARRAY['commission_credit','ad_credit'])),
  title text,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active','used','expired','cancelled'])),
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);
ALTER TABLE public.seller_gift_coupons ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_seller_gift_coupons_store ON public.seller_gift_coupons (store_id, status);
