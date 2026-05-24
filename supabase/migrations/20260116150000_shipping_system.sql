-- ============================================================================
-- SHIPPING SYSTEM MIGRATION
-- Kargo firmaları, kargo yöntemleri ve fiyatlandırma
-- ============================================================================

-- 1. SHIPPING CARRIERS (Kargo Firmaları)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipping_carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo', 'PTT Kargo'
  code TEXT NOT NULL UNIQUE, -- 'yurtici', 'aras', 'mng', 'ptt'
  logo_url TEXT,
  tracking_url_template TEXT, -- 'https://yurti.com/track?code={tracking_number}'
  api_enabled BOOLEAN DEFAULT false,
  api_endpoint TEXT,
  api_key_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SHIPPING METHODS (Kargo Yöntemleri)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipping_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES shipping_carriers(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'Standart Teslimat', 'Hızlı Kargo', 'Aynı Gün Teslimat'
  code TEXT NOT NULL UNIQUE, -- 'standard', 'express', 'same_day'
  description TEXT,
  estimated_delivery_days INTEGER, -- Min delivery days
  estimated_delivery_days_max INTEGER, -- Max delivery days
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_delivery_days CHECK (
    estimated_delivery_days_max IS NULL OR 
    estimated_delivery_days_max >= estimated_delivery_days
  )
);

-- 3. SHIPPING RATES (Kargo Fiyatları)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_id UUID NOT NULL REFERENCES shipping_methods(id) ON DELETE CASCADE,
  
  -- Conditional pricing
  region TEXT, -- 'all', 'same_city', 'same_region', 'other_regions', city code
  min_weight DECIMAL(10,2), -- kg
  max_weight DECIMAL(10,2), -- kg
  min_order_value DECIMAL(10,2), -- Minimum order amount
  max_order_value DECIMAL(10,2), -- Maximum order amount
  
  -- Price
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_per_kg DECIMAL(10,2) DEFAULT 0, -- Additional cost per kg
  
  -- Free shipping conditions
  free_shipping_threshold DECIMAL(10,2), -- Free if order > this amount
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_weight_range CHECK (
    max_weight IS NULL OR max_weight >= min_weight
  ),
  CONSTRAINT valid_order_value_range CHECK (
    max_order_value IS NULL OR max_order_value >= min_order_value
  )
);

-- 4. STORE SHIPPING SETTINGS (Mağaza Kargo Ayarları)
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_shipping_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  method_id UUID NOT NULL REFERENCES shipping_methods(id) ON DELETE CASCADE,
  
  -- Custom pricing for this store (overrides default rates)
  custom_base_price DECIMAL(10,2),
  custom_free_shipping_threshold DECIMAL(10,2),
  
  -- Availability
  is_enabled BOOLEAN DEFAULT true,
  processing_time_days INTEGER DEFAULT 1, -- Kargo hazırlama süresi
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- One setting per store per method
  UNIQUE(store_id, method_id)
);

-- 5. ORDER SHIPMENTS (Sipariş Kargo Bilgileri)
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier_id UUID NOT NULL REFERENCES shipping_carriers(id),
  method_id UUID NOT NULL REFERENCES shipping_methods(id),
  
  -- Tracking info
  tracking_number TEXT UNIQUE,
  tracking_url TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', 
  -- 'pending', 'preparing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'
  
  -- Timestamps
  shipped_at TIMESTAMPTZ,
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Additional info
  package_weight DECIMAL(10,2), -- kg
  package_dimensions JSONB, -- {length, width, height}
  shipping_cost DECIMAL(10,2) NOT NULL,
  
  -- Label
  shipping_label_url TEXT, -- PDF etiket URL'i
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_shipment_status CHECK (
    status IN ('pending', 'preparing', 'shipped', 'in_transit', 
               'out_for_delivery', 'delivered', 'failed', 'returned')
  )
);

-- 6. SHIPPING STATUS HISTORY (Kargo Durum Geçmişi)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shipping_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES order_shipments(id) ON DELETE CASCADE,
  
  status TEXT NOT NULL,
  location TEXT, -- Şube/şehir bilgisi
  description TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  
  -- Webhook data
  raw_data JSONB, -- Kargo firmasından gelen ham veri
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_shipping_methods_carrier ON shipping_methods(carrier_id);
CREATE INDEX idx_shipping_rates_method ON shipping_rates(method_id);
CREATE INDEX idx_store_shipping_settings_store ON store_shipping_settings(store_id);
CREATE INDEX idx_store_shipping_settings_method ON store_shipping_settings(method_id);
CREATE INDEX idx_order_shipments_order ON order_shipments(order_id);
CREATE INDEX idx_order_shipments_tracking ON order_shipments(tracking_number);
CREATE INDEX idx_order_shipments_status ON order_shipments(status);
CREATE INDEX idx_shipping_status_history_shipment ON shipping_status_history(shipment_id);
CREATE INDEX idx_shipping_status_history_timestamp ON shipping_status_history(timestamp DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Shipping Carriers (Public read, admin write)
ALTER TABLE shipping_carriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active carriers"
ON shipping_carriers FOR SELECT
USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage carriers"
ON shipping_carriers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Shipping Methods (Public read, admin write)
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active methods"
ON shipping_methods FOR SELECT
USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage methods"
ON shipping_methods FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Shipping Rates (Public read, admin write)
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rates"
ON shipping_rates FOR SELECT
USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage rates"
ON shipping_rates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Store Shipping Settings (Store owners and admins)
ALTER TABLE store_shipping_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view own settings"
ON store_shipping_settings FOR SELECT
USING (
  store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Store owners can manage own settings"
ON store_shipping_settings FOR ALL
USING (
  store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Order Shipments (Buyers, sellers, admins)
ALTER TABLE order_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order shipments"
ON order_shipments FOR SELECT
USING (
  -- Buyer can see their orders
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
  OR
  -- Seller can see their store's orders
  order_id IN (
    SELECT o.id FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    JOIN stores s ON s.id = p.store_id
    WHERE s.owner_id = auth.uid()
  )
  OR
  -- Admins can see all
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Sellers can create/update shipments for own orders"
ON order_shipments FOR ALL
USING (
  order_id IN (
    SELECT o.id FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    JOIN stores s ON s.id = p.store_id
    WHERE s.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Shipping Status History (Same as shipments)
ALTER TABLE shipping_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shipment history"
ON shipping_status_history FOR SELECT
USING (
  shipment_id IN (
    SELECT id FROM order_shipments WHERE
      order_id IN (
        SELECT id FROM orders WHERE user_id = auth.uid()
      )
      OR
      order_id IN (
        SELECT o.id FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        JOIN stores s ON s.id = p.store_id
        WHERE s.owner_id = auth.uid()
      )
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "System can insert shipping history"
ON shipping_status_history FOR INSERT
WITH CHECK (true); -- Webhooks need to insert

-- ============================================================================
-- SEED DATA - Türkiye Kargo Firmaları
-- ============================================================================

INSERT INTO shipping_carriers (name, code, logo_url, tracking_url_template, api_enabled, is_active, display_order)
VALUES
  ('Yurtiçi Kargo', 'yurtici', 'https://www.yurticikargo.com/images/logo.png', 'https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code={tracking_number}', true, true, 1),
  ('Aras Kargo', 'aras', 'https://www.araskargo.com.tr/images/logo.png', 'https://kargotakip.araskargo.com.tr/mainpage.aspx?code={tracking_number}', true, true, 2),
  ('MNG Kargo', 'mng', 'https://www.mngkargo.com.tr/images/logo.png', 'https://www.mngkargo.com.tr/kargotakip?code={tracking_number}', false, true, 3),
  ('PTT Kargo', 'ptt', 'https://www.ptt.gov.tr/images/logo.png', 'https://gonderitakip.ptt.gov.tr/Track/Verify?q={tracking_number}', false, true, 4),
  ('Sürat Kargo', 'surat', null, 'https://www.suratkargo.com.tr/kargo-takip?code={tracking_number}', false, true, 5)
ON CONFLICT (code) DO NOTHING;

-- Default shipping methods
INSERT INTO shipping_methods (carrier_id, name, code, description, estimated_delivery_days, estimated_delivery_days_max, is_active)
SELECT 
  id,
  'Standart Teslimat',
  code || '_standard',
  '2-4 iş günü içinde teslimat',
  2,
  4,
  true
FROM shipping_carriers WHERE code IN ('yurtici', 'aras', 'mng', 'ptt', 'surat')
ON CONFLICT (code) DO NOTHING;

INSERT INTO shipping_methods (carrier_id, name, code, description, estimated_delivery_days, estimated_delivery_days_max, is_active)
SELECT 
  id,
  'Hızlı Kargo',
  code || '_express',
  '1-2 iş günü içinde teslimat',
  1,
  2,
  true
FROM shipping_carriers WHERE code IN ('yurtici', 'aras')
ON CONFLICT (code) DO NOTHING;

-- Default shipping rates (Türkiye geneli standart fiyatlar)
INSERT INTO shipping_rates (method_id, region, min_weight, max_weight, base_price, free_shipping_threshold, is_active)
SELECT 
  id,
  'all',
  0,
  5,
  29.90,
  500.00,
  true
FROM shipping_methods WHERE code LIKE '%_standard'
ON CONFLICT DO NOTHING;

INSERT INTO shipping_rates (method_id, region, min_weight, max_weight, base_price, free_shipping_threshold, is_active)
SELECT 
  id,
  'all',
  0,
  5,
  49.90,
  750.00,
  true
FROM shipping_methods WHERE code LIKE '%_express'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate shipping cost for an order
CREATE OR REPLACE FUNCTION calculate_shipping_cost(
  p_store_id UUID,
  p_method_id UUID,
  p_order_value DECIMAL,
  p_weight DECIMAL DEFAULT 1.0,
  p_region TEXT DEFAULT 'all'
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_price DECIMAL;
  v_free_threshold DECIMAL;
  v_custom_price DECIMAL;
  v_custom_threshold DECIMAL;
BEGIN
  -- Check store custom settings first
  SELECT custom_base_price, custom_free_shipping_threshold
  INTO v_custom_price, v_custom_threshold
  FROM store_shipping_settings
  WHERE store_id = p_store_id 
    AND method_id = p_method_id 
    AND is_enabled = true;
  
  -- If store has custom settings, use them
  IF v_custom_price IS NOT NULL THEN
    IF v_custom_threshold IS NOT NULL AND p_order_value >= v_custom_threshold THEN
      RETURN 0; -- Free shipping
    END IF;
    RETURN v_custom_price;
  END IF;
  
  -- Otherwise use default rates
  SELECT base_price, free_shipping_threshold
  INTO v_base_price, v_free_threshold
  FROM shipping_rates
  WHERE method_id = p_method_id
    AND is_active = true
    AND (region = p_region OR region = 'all')
    AND (min_weight IS NULL OR p_weight >= min_weight)
    AND (max_weight IS NULL OR p_weight <= max_weight)
    AND (min_order_value IS NULL OR p_order_value >= min_order_value)
    AND (max_order_value IS NULL OR p_order_value <= max_order_value)
  ORDER BY 
    CASE WHEN region = p_region THEN 1 ELSE 2 END,
    min_order_value DESC NULLS LAST
  LIMIT 1;
  
  -- Check free shipping
  IF v_free_threshold IS NOT NULL AND p_order_value >= v_free_threshold THEN
    RETURN 0;
  END IF;
  
  RETURN COALESCE(v_base_price, 0);
END;
$$;

-- Trigger to update order_shipments.updated_at
CREATE OR REPLACE FUNCTION update_shipment_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_shipment_timestamp
BEFORE UPDATE ON order_shipments
FOR EACH ROW
EXECUTE FUNCTION update_shipment_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE shipping_carriers IS 'Kargo firmaları (Yurtiçi, Aras, MNG, PTT)';
COMMENT ON TABLE shipping_methods IS 'Kargo yöntemleri (Standart, Express, vb.)';
COMMENT ON TABLE shipping_rates IS 'Kargo fiyatlandırma kuralları';
COMMENT ON TABLE store_shipping_settings IS 'Mağaza özel kargo ayarları';
COMMENT ON TABLE order_shipments IS 'Sipariş kargo bilgileri ve takip';
COMMENT ON TABLE shipping_status_history IS 'Kargo durum geçmişi';
