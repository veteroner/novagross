-- Nova Store Marketplace Infrastructure Migration
-- Çok satıcılı marketplace sistemine geçiş

-- ============================================================================
-- PART 1: MEVCUT TABLOLARA YENİ KOLONLAR EKLE (Foreign Keys Hariç)
-- ============================================================================

-- profiles tablosuna satıcı flag'i ekle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_seller BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_is_seller ON profiles(is_seller);

-- products tablosuna mağaza ve onay kolonları ekle (FK sonra eklenecek)
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' 
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_approval_status ON products(approval_status);

-- orders tablosuna satıcı komisyon bilgileri ekle (FK sonra eklenecek)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS primary_store_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS has_multiple_stores BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(primary_store_id);

-- order_items tablosuna satıcı bilgileri ekle (FK sonra eklenecek)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS store_id UUID;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 15.00;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS seller_amount DECIMAL(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_order_items_store ON order_items(store_id);

-- ============================================================================
-- PART 2: YENİ TABLOLAR OLUŞTUR
-- ============================================================================

-- STORES: Satıcı Mağazaları
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Mağaza Bilgileri
  store_name TEXT NOT NULL,
  store_slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  
  -- İletişim
  email TEXT,
  phone TEXT,
  
  -- Adres Bilgileri
  address TEXT,
  city TEXT,
  district TEXT,
  country TEXT DEFAULT 'TR',
  postal_code TEXT,
  
  -- İş Bilgileri
  company_name TEXT,
  tax_number TEXT,
  tax_office TEXT,
  
  -- Banka Bilgileri (şifrelenmiş olarak saklanmalı)
  bank_name TEXT,
  iban TEXT,
  account_holder TEXT,
  
  -- Durum ve Onay
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  is_verified BOOLEAN DEFAULT false,
  verification_badge TEXT CHECK (verification_badge IN ('bronze', 'silver', 'gold', 'platinum')),
  
  -- Performans Metrikleri
  rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  total_reviews INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0.00,
  
  -- Komisyon
  commission_rate DECIMAL(5,2) DEFAULT 15.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  
  -- Kargo Ayarları
  shipping_methods JSONB DEFAULT '[]', -- [{"provider": "Aras Kargo", "price": 29.99}]
  free_shipping_threshold DECIMAL(10,2) DEFAULT 500.00,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  
  -- Constraints
  CONSTRAINT stores_unique_name UNIQUE(store_name)
);

-- Indexes
CREATE INDEX idx_stores_owner ON stores(owner_id);
CREATE INDEX idx_stores_slug ON stores(store_slug);
CREATE INDEX idx_stores_status ON stores(status);
CREATE INDEX idx_stores_rating ON stores(rating DESC);
CREATE INDEX idx_stores_created_at ON stores(created_at DESC);

-- Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stores_updated_at_trigger
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_stores_updated_at();

-- STORE_APPLICATIONS: Satıcı Başvuruları
CREATE TABLE IF NOT EXISTS store_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Başvuru Bilgileri
  store_name TEXT NOT NULL,
  store_slug TEXT NOT NULL,
  description TEXT,
  company_name TEXT,
  tax_number TEXT,
  phone TEXT,
  email TEXT,
  
  -- Adres
  address TEXT,
  city TEXT,
  district TEXT,
  postal_code TEXT,
  
  -- Dökümanlar (Supabase Storage URLs)
  identity_document_url TEXT, -- Kimlik belgesi
  tax_certificate_url TEXT,   -- Vergi levhası
  business_license_url TEXT,  -- İş yeri ruhsatı (opsiyonel)
  other_documents JSONB DEFAULT '[]',
  
  -- Durum
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  rejection_reason TEXT,
  
  -- İşlem Bilgileri
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  
  -- Notlar
  admin_notes TEXT,
  
  -- Tek başvuru constraint
  CONSTRAINT one_application_per_user UNIQUE(user_id, status)
);

CREATE INDEX idx_applications_user ON store_applications(user_id);
CREATE INDEX idx_applications_status ON store_applications(status);
CREATE INDEX idx_applications_created_at ON store_applications(created_at DESC);

-- STORE_FOLLOWERS: Mağaza Takipçileri
CREATE TABLE IF NOT EXISTS store_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(store_id, user_id)
);

CREATE INDEX idx_store_followers_store ON store_followers(store_id);
CREATE INDEX idx_store_followers_user ON store_followers(user_id);
CREATE INDEX idx_store_followers_created_at ON store_followers(created_at DESC);

-- STORE_REVIEWS: Mağaza Yorumları
CREATE TABLE IF NOT EXISTS store_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Değerlendirme
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  
  -- Durum
  is_verified BOOLEAN DEFAULT false, -- Gerçek alışverişten mi?
  is_hidden BOOLEAN DEFAULT false,   -- Admin gizledi mi?
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Bir siparişten sadece bir yorum
  UNIQUE(store_id, user_id, order_id)
);

CREATE INDEX idx_store_reviews_store ON store_reviews(store_id);
CREATE INDEX idx_store_reviews_user ON store_reviews(user_id);
CREATE INDEX idx_store_reviews_rating ON store_reviews(rating);
CREATE INDEX idx_store_reviews_created_at ON store_reviews(created_at DESC);

-- Trigger: Mağaza rating'ini güncelle
CREATE OR REPLACE FUNCTION update_store_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stores
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM store_reviews
      WHERE store_id = NEW.store_id AND is_hidden = false
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM store_reviews
      WHERE store_id = NEW.store_id AND is_hidden = false
    )
  WHERE id = NEW.store_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER store_reviews_update_rating
  AFTER INSERT OR UPDATE ON store_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_store_rating();

-- STORE_BALANCE: Satıcı Bakiyeleri
CREATE TABLE IF NOT EXISTS store_balance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Bakiyeler
  available_balance DECIMAL(12,2) DEFAULT 0.00 CHECK (available_balance >= 0),
  pending_balance DECIMAL(12,2) DEFAULT 0.00 CHECK (pending_balance >= 0),
  total_withdrawn DECIMAL(12,2) DEFAULT 0.00 CHECK (total_withdrawn >= 0),
  
  -- Meta
  last_payout_date TIMESTAMPTZ,
  next_payout_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_store_balance_store ON store_balance(store_id);

-- STORE_TRANSACTIONS: Finansal İşlem Geçmişi
CREATE TABLE IF NOT EXISTS store_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  
  -- İşlem Tipi
  type TEXT NOT NULL CHECK (type IN ('sale', 'commission', 'refund', 'payout', 'penalty', 'adjustment')),
  
  -- Tutarlar
  amount DECIMAL(12,2) NOT NULL,
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  
  -- Detaylar
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Ödeme Bilgisi (payout işlemleri için)
  payout_date TIMESTAMPTZ, -- 20 iş günü sonraki haftalık ödeme tarihi
  is_paid BOOLEAN DEFAULT false,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_store ON store_transactions(store_id);
CREATE INDEX idx_transactions_order ON store_transactions(order_id);
CREATE INDEX idx_transactions_type ON store_transactions(type);
CREATE INDEX idx_transactions_payout_date ON store_transactions(payout_date);
CREATE INDEX idx_transactions_is_paid ON store_transactions(is_paid);
CREATE INDEX idx_transactions_created_at ON store_transactions(created_at DESC);

-- WITHDRAWAL_REQUESTS: Para Çekme Talepleri
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  -- Tutar
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  fee DECIMAL(10,2) DEFAULT 0.00,
  net_amount DECIMAL(12,2) NOT NULL,
  
  -- Durum
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
  
  -- Banka Bilgileri
  bank_name TEXT NOT NULL,
  iban TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  
  -- İşlem Detayları
  rejection_reason TEXT,
  admin_notes TEXT,
  transaction_id TEXT, -- Banka transfer ID
  
  -- İşlem Tarihleri
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_withdrawal_store ON withdrawal_requests(store_id);
CREATE INDEX idx_withdrawal_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requested_at ON withdrawal_requests(requested_at DESC);

-- ============================================================================
-- PART 3: FOREIGN KEY CONSTRAINTS EKLE
-- ============================================================================

-- Artık stores tablosu var, şimdi FK'leri ekleyebiliriz
ALTER TABLE products 
  ADD CONSTRAINT fk_products_store 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE orders 
  ADD CONSTRAINT fk_orders_store 
  FOREIGN KEY (primary_store_id) REFERENCES stores(id) ON DELETE SET NULL;

ALTER TABLE order_items 
  ADD CONSTRAINT fk_order_items_store 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

-- ============================================================================
-- PART 4: HELPER FUNCTIONS
-- ============================================================================

-- Function: 20 iş günü hesaplama (hafta sonları hariç)
CREATE OR REPLACE FUNCTION calculate_payout_date(order_date TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  business_days INTEGER := 0;
  calc_date TIMESTAMPTZ := order_date;
BEGIN
  WHILE business_days < 20 LOOP
    calc_date := calc_date + INTERVAL '1 day';
    -- Hafta sonu değilse sayı artır
    IF EXTRACT(DOW FROM calc_date) NOT IN (0, 6) THEN
      business_days := business_days + 1;
    END IF;
  END LOOP;
  
  -- Bir sonraki Pazartesi'yi bul (haftalık ödeme günü)
  WHILE EXTRACT(DOW FROM calc_date) != 1 LOOP
    calc_date := calc_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN calc_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Sipariş sonrası komisyon ve bakiye güncelleme
CREATE OR REPLACE FUNCTION process_order_commissions(p_order_id UUID)
RETURNS void AS $$
DECLARE
  item RECORD;
  store_balance_rec RECORD;
  commission DECIMAL(10,2);
  seller_amount DECIMAL(10,2);
  payout_date TIMESTAMPTZ;
BEGIN
  -- Her order item için işlem yap
  FOR item IN 
    SELECT 
      oi.id as item_id,
      oi.store_id,
      oi.price,
      oi.quantity,
      s.commission_rate,
      o.created_at as order_date
    FROM order_items oi
    JOIN stores s ON s.id = oi.store_id
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.order_id = p_order_id AND oi.store_id IS NOT NULL
  LOOP
    -- Komisyon hesapla
    commission := (item.price * item.quantity) * (item.commission_rate / 100);
    seller_amount := (item.price * item.quantity) - commission;
    
    -- Order item'ı güncelle
    UPDATE order_items
    SET 
      commission_amount = commission,
      seller_amount = seller_amount
    WHERE id = item.item_id;
    
    -- Store balance al veya oluştur
    INSERT INTO store_balance (store_id, pending_balance)
    VALUES (item.store_id, 0)
    ON CONFLICT (store_id) DO NOTHING;
    
    SELECT * INTO store_balance_rec FROM store_balance WHERE store_id = item.store_id;
    
    -- Pending balance'a ekle
    UPDATE store_balance
    SET 
      pending_balance = pending_balance + seller_amount,
      updated_at = NOW()
    WHERE store_id = item.store_id;
    
    -- Ödeme tarihini hesapla
    payout_date := calculate_payout_date(item.order_date);
    
    -- Transaction kaydet (sale)
    INSERT INTO store_transactions (
      store_id, order_id, order_item_id, type,
      amount, balance_before, balance_after,
      description, payout_date, metadata
    ) VALUES (
      item.store_id, p_order_id, item.item_id, 'sale',
      seller_amount,
      store_balance_rec.pending_balance,
      store_balance_rec.pending_balance + seller_amount,
      'Sipariş geliri',
      payout_date,
      jsonb_build_object(
        'commission_amount', commission,
        'commission_rate', item.commission_rate,
        'original_amount', item.price * item.quantity
      )
    );
    
    -- Transaction kaydet (commission)
    INSERT INTO store_transactions (
      store_id, order_id, order_item_id, type,
      amount, balance_before, balance_after,
      description, metadata
    ) VALUES (
      item.store_id, p_order_id, item.item_id, 'commission',
      -commission,
      store_balance_rec.pending_balance + seller_amount,
      store_balance_rec.pending_balance + seller_amount,
      'Platform komisyonu',
      jsonb_build_object(
        'commission_rate', item.commission_rate,
        'sale_amount', item.price * item.quantity
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- STORES policies
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active stores"
  ON stores FOR SELECT
  USING (status = 'active');

CREATE POLICY "Sellers can view own store"
  ON stores FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Sellers can update own store"
  ON stores FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can manage all stores"
  ON stores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- STORE_APPLICATIONS policies
ALTER TABLE store_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
  ON store_applications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own applications"
  ON store_applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all applications"
  ON store_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- STORE_FOLLOWERS policies
ALTER TABLE store_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view followers"
  ON store_followers FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own follows"
  ON store_followers FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- STORE_REVIEWS policies
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view non-hidden reviews"
  ON store_reviews FOR SELECT
  USING (is_hidden = false);

CREATE POLICY "Users can create own reviews"
  ON store_reviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reviews"
  ON store_reviews FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all reviews"
  ON store_reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- STORE_BALANCE policies
ALTER TABLE store_balance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own balance"
  ON store_balance FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all balances"
  ON store_balance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- STORE_TRANSACTIONS policies
ALTER TABLE store_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own transactions"
  ON store_transactions FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all transactions"
  ON store_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- WITHDRAWAL_REQUESTS policies
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own withdrawal requests"
  ON withdrawal_requests FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can create withdrawal requests"
  ON withdrawal_requests FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all withdrawal requests"
  ON withdrawal_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- PRODUCTS policies (Güncelleme - marketplace için)
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view approved active products"
  ON products FOR SELECT
  USING (approval_status = 'approved' AND is_active = true);

CREATE POLICY "Sellers can view own products"
  ON products FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can manage own products"
  ON products FOR ALL
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- PART 6: INITIAL DATA
-- ============================================================================

-- Nova Store merkezi mağazası oluştur
DO $$
DECLARE
  admin_id UUID;
  nova_store_id UUID;
BEGIN
  -- İlk admin'i bul
  SELECT id INTO admin_id FROM profiles WHERE role = 'super_admin' LIMIT 1;
  
  IF admin_id IS NOT NULL THEN
    -- Nova Store merkezi mağazasını oluştur
    INSERT INTO stores (
      owner_id, store_name, store_slug, description,
      status, is_verified, verification_badge,
      commission_rate, created_at, approved_at, approved_by
    ) VALUES (
      admin_id,
      'Nova Store',
      'nova-store',
      'Nova Store resmi mağazası',
      'active',
      true,
      'platinum',
      0, -- Kendi ürünlerinde komisyon yok
      NOW(),
      NOW(),
      admin_id
    )
    ON CONFLICT (store_slug) DO NOTHING
    RETURNING id INTO nova_store_id;
    
    IF nova_store_id IS NOT NULL THEN
      -- Store balance oluştur
      INSERT INTO store_balance (store_id)
      VALUES (nova_store_id)
      ON CONFLICT (store_id) DO NOTHING;
      
      -- Admin'i seller olarak işaretle
      UPDATE profiles SET is_seller = true WHERE id = admin_id;
      
      RAISE NOTICE 'Nova Store merkezi mağazası oluşturuldu: %', nova_store_id;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE stores IS 'Satıcı mağazaları - Marketplace için çok satıcılı sistem';
COMMENT ON TABLE store_applications IS 'Satıcı başvuruları - Onay sürecinde bekleyen başvurular';
COMMENT ON TABLE store_followers IS 'Mağaza takipçileri - Kullanıcıların takip ettiği mağazalar';
COMMENT ON TABLE store_reviews IS 'Mağaza değerlendirmeleri - Satıcı puanlama ve yorumları';
COMMENT ON TABLE store_balance IS 'Satıcı bakiyeleri - Available ve pending bakiyeler';
COMMENT ON TABLE store_transactions IS 'Finansal işlem geçmişi - Tüm para hareketleri';
COMMENT ON TABLE withdrawal_requests IS 'Para çekme talepleri - 20 iş günü sonrası haftalık ödemeler';
