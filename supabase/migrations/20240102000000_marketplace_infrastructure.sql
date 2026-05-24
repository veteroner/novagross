-- ============================================================================
-- Nova Store - Marketplace Infrastructure Migration
-- ============================================================================
-- Bu migration çok satıcılı marketplace sistemini ekler
-- Tablolar: stores, store_applications, store_followers, store_reviews,
--           store_balance, store_transactions, withdrawal_requests
-- ============================================================================

-- ============================================================================
-- STORES TABLE - Satıcı Mağazaları
-- ============================================================================
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
  
  -- Banka Bilgileri
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
  shipping_methods JSONB DEFAULT '[]',
  free_shipping_threshold DECIMAL(10,2) DEFAULT 500.00,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  
  CONSTRAINT stores_unique_name UNIQUE(store_name)
);

CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(store_slug);
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_rating ON stores(rating DESC);
CREATE INDEX IF NOT EXISTS idx_stores_created ON stores(created_at DESC);

COMMENT ON TABLE stores IS 'Satıcı mağazaları - Marketplace için çok satıcılı sistem';

-- ============================================================================
-- STORE_APPLICATIONS TABLE - Satıcı Başvuruları
-- ============================================================================
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
  identity_document_url TEXT,
  tax_certificate_url TEXT,
  business_license_url TEXT,
  other_documents JSONB DEFAULT '[]',
  
  -- Durum
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  rejection_reason TEXT,
  
  -- İşlem Bilgileri
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  
  -- Notlar
  admin_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON store_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON store_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created ON store_applications(created_at DESC);

COMMENT ON TABLE store_applications IS 'Satıcı başvuruları - Onay sürecinde bekleyen başvurular';

-- ============================================================================
-- STORE_FOLLOWERS TABLE - Mağaza Takipçileri
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_followers_store ON store_followers(store_id);
CREATE INDEX IF NOT EXISTS idx_store_followers_user ON store_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_store_followers_created ON store_followers(created_at DESC);

COMMENT ON TABLE store_followers IS 'Mağaza takipçileri - Kullanıcıların takip ettiği mağazalar';

-- ============================================================================
-- STORE_REVIEWS TABLE - Mağaza Yorumları
-- ============================================================================
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
  is_verified BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(store_id, user_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_store_reviews_store ON store_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_user ON store_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_rating ON store_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_store_reviews_created ON store_reviews(created_at DESC);

COMMENT ON TABLE store_reviews IS 'Mağaza değerlendirmeleri - Satıcı puanlama ve yorumları';

-- ============================================================================
-- STORE_BALANCE TABLE - Satıcı Bakiyeleri
-- ============================================================================
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_balance_store ON store_balance(store_id);

COMMENT ON TABLE store_balance IS 'Satıcı bakiyeleri - Available ve pending bakiyeler';

-- ============================================================================
-- STORE_TRANSACTIONS TABLE - Finansal İşlem Geçmişi
-- ============================================================================
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
  
  -- Ödeme Bilgisi
  payout_date TIMESTAMPTZ,
  is_paid BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_store ON store_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order ON store_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON store_transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_payout ON store_transactions(payout_date);
CREATE INDEX IF NOT EXISTS idx_transactions_paid ON store_transactions(is_paid);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON store_transactions(created_at DESC);

COMMENT ON TABLE store_transactions IS 'Finansal işlem geçmişi - Tüm para hareketleri';

-- ============================================================================
-- WITHDRAWAL_REQUESTS TABLE - Para Çekme Talepleri
-- ============================================================================
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
  transaction_id TEXT,
  
  -- İşlem Tarihleri
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_store ON withdrawal_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requested ON withdrawal_requests(requested_at DESC);

COMMENT ON TABLE withdrawal_requests IS 'Para çekme talepleri - 20 iş günü sonrası haftalık ödemeler';

-- ============================================================================
-- ADD FOREIGN KEYS TO EXISTING TABLES
-- ============================================================================

-- Products store_id FK
ALTER TABLE products 
  DROP CONSTRAINT IF EXISTS fk_products_store;
  
ALTER TABLE products 
  ADD CONSTRAINT fk_products_store 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

-- Orders primary_store_id FK
ALTER TABLE orders 
  DROP CONSTRAINT IF EXISTS fk_orders_store;
  
ALTER TABLE orders 
  ADD CONSTRAINT fk_orders_store 
  FOREIGN KEY (primary_store_id) REFERENCES stores(id) ON DELETE SET NULL;

-- Order items store_id FK
ALTER TABLE order_items 
  DROP CONSTRAINT IF EXISTS fk_order_items_store;
  
ALTER TABLE order_items 
  ADD CONSTRAINT fk_order_items_store 
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate payout date (20 business days + next Monday)
CREATE OR REPLACE FUNCTION calculate_payout_date(order_date TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  business_days INTEGER := 0;
  calc_date TIMESTAMPTZ := order_date;
BEGIN
  WHILE business_days < 20 LOOP
    calc_date := calc_date + INTERVAL '1 day';
    IF EXTRACT(DOW FROM calc_date) NOT IN (0, 6) THEN
      business_days := business_days + 1;
    END IF;
  END LOOP;
  
  WHILE EXTRACT(DOW FROM calc_date) != 1 LOOP
    calc_date := calc_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN calc_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Process order commissions
CREATE OR REPLACE FUNCTION process_order_commissions(p_order_id UUID)
RETURNS void AS $$
DECLARE
  item RECORD;
  store_balance_rec RECORD;
  commission DECIMAL(10,2);
  seller_amount DECIMAL(10,2);
  payout_date TIMESTAMPTZ;
BEGIN
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
    commission := (item.price * item.quantity) * (item.commission_rate / 100);
    seller_amount := (item.price * item.quantity) - commission;
    
    UPDATE order_items
    SET 
      commission_amount = commission,
      seller_amount = seller_amount
    WHERE id = item.item_id;
    
    INSERT INTO store_balance (store_id, pending_balance)
    VALUES (item.store_id, 0)
    ON CONFLICT (store_id) DO NOTHING;
    
    SELECT * INTO store_balance_rec FROM store_balance WHERE store_id = item.store_id;
    
    UPDATE store_balance
    SET 
      pending_balance = pending_balance + seller_amount,
      updated_at = NOW()
    WHERE store_id = item.store_id;
    
    payout_date := calculate_payout_date(item.order_date);
    
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

-- Update store rating
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

-- Update stores updated_at
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_reviews_updated_at
  BEFORE UPDATE ON store_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
