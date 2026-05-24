-- ============================================================================
-- Nova Store - Demo Data
-- ============================================================================
-- Bu migration demo verilerini ekler
-- Nova Store merkezi mağazası, demo kategoriler, demo ürünler
-- ============================================================================

-- ============================================================================
-- DEMO STORE: Nova Store Official
-- ============================================================================

DO $$
DECLARE
  admin_id UUID;
  nova_store_id UUID;
  
  -- Category IDs
  elektronik_id UUID;
  telefon_id UUID;
  bilgisayar_id UUID;
  giyim_id UUID;
  erkek_id UUID;
  kadin_id UUID;
  ev_yasam_id UUID;
  spor_id UUID;
  
  -- Product IDs
  iphone_id UUID;
  macbook_id UUID;
  airpods_id UUID;
BEGIN
  -- İlk admin'i bul
  SELECT id INTO admin_id FROM profiles WHERE role = 'super_admin' LIMIT 1;
  
  -- Eğer admin yoksa, uyarı ver ve çık
  IF admin_id IS NULL THEN
    RAISE NOTICE 'WARNING: No super_admin found. Please create an admin user first through Supabase Auth.';
    RAISE NOTICE 'Demo data creation skipped. You can run this migration again after creating an admin.';
    RETURN;
  END IF;
  
  -- ========================================================================
  -- Nova Store Merkezi Mağazası
  -- ========================================================================
  
  INSERT INTO stores (
    owner_id, store_name, store_slug, description,
    status, is_verified, verification_badge,
    commission_rate, email, phone,
    city, district, country,
    created_at, approved_at, approved_by
  ) VALUES (
    admin_id,
    'Nova Store',
    'nova-store',
    'Nova Store resmi mağazası - Yüksek kaliteli ürünler, hızlı teslimat, %100 müşteri memnuniyeti',
    'active',
    true,
    'platinum',
    0, -- Kendi ürünlerinde komisyon yok
    'info@novastore.com',
    '+905001234567',
    'İstanbul',
    'Kadıköy',
    'TR',
    NOW(),
    NOW(),
    admin_id
  )
  ON CONFLICT (store_slug) DO UPDATE SET
    status = EXCLUDED.status,
    is_verified = EXCLUDED.is_verified,
    verification_badge = EXCLUDED.verification_badge
  RETURNING id INTO nova_store_id;
  
  -- Nova Store balance oluştur
  INSERT INTO store_balance (store_id)
  VALUES (nova_store_id)
  ON CONFLICT (store_id) DO NOTHING;
  
  -- Admin'i seller olarak işaretle
  UPDATE profiles SET is_seller = true WHERE id = admin_id;
  
  -- ========================================================================
  -- Demo Kategoriler
  -- ========================================================================
  
  -- Elektronik (Ana Kategori)
  INSERT INTO categories (name, slug, description, is_active, sort_order)
  VALUES ('Elektronik', 'elektronik', 'Tüm elektronik ürünler', true, 1)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO elektronik_id;
  
  -- Telefon & Aksesuar (Alt Kategori)
  INSERT INTO categories (name, slug, description, parent_id, is_active, sort_order)
  VALUES ('Telefon & Aksesuar', 'telefon-aksesuar', 'Cep telefonları ve aksesuarları', elektronik_id, true, 1)
  ON CONFLICT (slug) DO UPDATE SET parent_id = elektronik_id
  RETURNING id INTO telefon_id;
  
  -- Bilgisayar & Tablet (Alt Kategori)
  INSERT INTO categories (name, slug, description, parent_id, is_active, sort_order)
  VALUES ('Bilgisayar & Tablet', 'bilgisayar-tablet', 'Dizüstü bilgisayarlar ve tabletler', elektronik_id, true, 2)
  ON CONFLICT (slug) DO UPDATE SET parent_id = elektronik_id
  RETURNING id INTO bilgisayar_id;
  
  -- Giyim (Ana Kategori)
  INSERT INTO categories (name, slug, description, is_active, sort_order)
  VALUES ('Giyim', 'giyim', 'Giyim ve moda ürünleri', true, 2)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO giyim_id;
  
  -- Erkek Giyim (Alt Kategori)
  INSERT INTO categories (name, slug, description, parent_id, is_active, sort_order)
  VALUES ('Erkek Giyim', 'erkek-giyim', 'Erkek giyim ürünleri', giyim_id, true, 1)
  ON CONFLICT (slug) DO UPDATE SET parent_id = giyim_id
  RETURNING id INTO erkek_id;
  
  -- Kadın Giyim (Alt Kategori)
  INSERT INTO categories (name, slug, description, parent_id, is_active, sort_order)
  VALUES ('Kadın Giyim', 'kadin-giyim', 'Kadın giyim ürünleri', giyim_id, true, 2)
  ON CONFLICT (slug) DO UPDATE SET parent_id = giyim_id
  RETURNING id INTO kadin_id;
  
  -- Ev & Yaşam (Ana Kategori)
  INSERT INTO categories (name, slug, description, is_active, sort_order)
  VALUES ('Ev & Yaşam', 'ev-yasam', 'Ev ve yaşam ürünleri', true, 3)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO ev_yasam_id;
  
  -- Spor & Outdoor (Ana Kategori)
  INSERT INTO categories (name, slug, description, is_active, sort_order)
  VALUES ('Spor & Outdoor', 'spor-outdoor', 'Spor ve outdoor ürünleri', true, 4)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO spor_id;
  
  -- ========================================================================
  -- Demo Ürünler
  -- ========================================================================
  
  -- iPhone 15 Pro
  INSERT INTO products (
    store_id, category_id, name, slug, description,
    price, compare_at_price, stock, brand,
    is_active, is_featured, approval_status,
    approved_at, approved_by, created_at
  ) VALUES (
    nova_store_id,
    telefon_id,
    'iPhone 15 Pro 256GB',
    'iphone-15-pro-256gb',
    'Apple iPhone 15 Pro, 256GB depolama alanı, A17 Pro çip, 48MP kamera sistemi, titanyum çerçeve.',
    54999.00,
    59999.00,
    50,
    'Apple',
    true,
    true,
    'approved',
    NOW(),
    admin_id,
    NOW()
  )
  ON CONFLICT (slug) DO UPDATE SET
    price = EXCLUDED.price,
    stock = EXCLUDED.stock
  RETURNING id INTO iphone_id;
  
  -- MacBook Air
  INSERT INTO products (
    store_id, category_id, name, slug, description,
    price, compare_at_price, stock, brand,
    is_active, is_featured, approval_status,
    approved_at, approved_by, created_at
  ) VALUES (
    nova_store_id,
    bilgisayar_id,
    'MacBook Air M2 13" 256GB',
    'macbook-air-m2-13-256gb',
    'Apple MacBook Air 13 inç, M2 çip, 256GB SSD, 8GB RAM, Retina ekran.',
    42999.00,
    45999.00,
    30,
    'Apple',
    true,
    true,
    'approved',
    NOW(),
    admin_id,
    NOW()
  )
  ON CONFLICT (slug) DO UPDATE SET
    price = EXCLUDED.price,
    stock = EXCLUDED.stock
  RETURNING id INTO macbook_id;
  
  -- AirPods Pro
  INSERT INTO products (
    store_id, category_id, name, slug, description,
    price, stock, brand,
    is_active, is_featured, approval_status,
    approved_at, approved_by, created_at
  ) VALUES (
    nova_store_id,
    telefon_id,
    'AirPods Pro 2. Nesil',
    'airpods-pro-2-nesil',
    'Apple AirPods Pro 2. nesil, aktif gürültü engelleme, MagSafe şarj kutusu.',
    10999.00,
    100,
    'Apple',
    true,
    true,
    'approved',
    NOW(),
    admin_id,
    NOW()
  )
  ON CONFLICT (slug) DO UPDATE SET
    price = EXCLUDED.price,
    stock = EXCLUDED.stock
  RETURNING id INTO airpods_id;
  
  -- Samsung Galaxy S24
  INSERT INTO products (
    store_id, category_id, name, slug, description,
    price, compare_at_price, stock, brand,
    is_active, approval_status,
    approved_at, approved_by, created_at
  ) VALUES (
    nova_store_id,
    telefon_id,
    'Samsung Galaxy S24 256GB',
    'samsung-galaxy-s24-256gb',
    'Samsung Galaxy S24, 256GB, Snapdragon 8 Gen 3, 6.2" Dynamic AMOLED 2X ekran.',
    38999.00,
    42999.00,
    40,
    'Samsung',
    true,
    'approved',
    NOW(),
    admin_id,
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;
  
  -- Dell XPS 15
  INSERT INTO products (
    store_id, category_id, name, slug, description,
    price, stock, brand,
    is_active, approval_status,
    approved_at, approved_by, created_at
  ) VALUES (
    nova_store_id,
    bilgisayar_id,
    'Dell XPS 15 9530',
    'dell-xps-15-9530',
    'Dell XPS 15, Intel Core i7-13700H, 16GB RAM, 512GB SSD, RTX 4050.',
    64999.00,
    15,
    'Dell',
    true,
    'approved',
    NOW(),
    admin_id,
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;
  
  -- Sony WH-1000XM5
  INSERT INTO products (
    store_id, category_id, name, slug, description,
    price, stock, brand,
    is_active, is_featured, approval_status,
    approved_at, approved_by, created_at
  ) VALUES (
    nova_store_id,
    telefon_id,
    'Sony WH-1000XM5 Kulaklık',
    'sony-wh-1000xm5-kulaklik',
    'Sony WH-1000XM5, premium gürültü engelleme, 30 saat pil ömrü.',
    14999.00,
    60,
    'Sony',
    true,
    true,
    'approved',
    NOW(),
    admin_id,
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;
  
  -- ========================================================================
  -- Demo Kuponlar
  -- ========================================================================
  
  INSERT INTO coupons (code, description, discount_type, discount_value, minimum_amount, maximum_discount, usage_limit, starts_at, expires_at, is_active)
  VALUES 
    ('HOSGELDIN10', 'Yeni üyelere özel %10 indirim', 'percentage', 10.00, 500.00, 500.00, 1000, NOW(), NOW() + INTERVAL '30 days', true),
    ('YILBASI500', 'Yılbaşı kampanyası 500 TL indirim', 'fixed', 500.00, 2000.00, NULL, 500, NOW(), NOW() + INTERVAL '15 days', true),
    ('KARGO50', '50 TL ve üzeri kargo bedava', 'percentage', 100.00, 50.00, 50.00, NULL, NOW(), NULL, true)
  ON CONFLICT (code) DO NOTHING;
  
  RAISE NOTICE 'Demo data created successfully!';
  RAISE NOTICE 'Nova Store ID: %', nova_store_id;
  RAISE NOTICE 'Admin ID: %', admin_id;
  RAISE NOTICE 'Categories: 8';
  RAISE NOTICE 'Products: 6';
  RAISE NOTICE 'Coupons: 3';
  
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE stores IS 'Nova Store merkezi mağazası ve satıcı mağazaları';
COMMENT ON TABLE categories IS 'Demo kategoriler: Elektronik, Giyim, Ev & Yaşam, Spor';
COMMENT ON TABLE products IS 'Demo ürünler: iPhone, MacBook, AirPods, Samsung, Dell, Sony';
