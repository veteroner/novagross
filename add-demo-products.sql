-- ============================================================================
-- Demo Ürünler Manuel Ekleme - Production için
-- ============================================================================
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın
-- ============================================================================

DO $$
DECLARE
  admin_id UUID;
  nova_store_id UUID;
  
  elektronik_id UUID;
  telefon_id UUID;
  bilgisayar_id UUID;
  giyim_id UUID;
  ev_yasam_id UUID;
  spor_id UUID;
BEGIN
  -- ========================================================================
  -- 1. Admin kullanıcısını bul veya ilk kullanıcıyı al
  -- ========================================================================
  SELECT id INTO admin_id 
  FROM profiles 
  WHERE role IN ('super_admin', 'admin')
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- Eğer admin yoksa, ilk kullanıcıyı admin yap
  IF admin_id IS NULL THEN
    SELECT id INTO admin_id FROM profiles ORDER BY created_at ASC LIMIT 1;
  END IF;
  
  -- Eğer hala yoksa, auth.users'dan kullanıcı al ve profile oluştur
  IF admin_id IS NULL THEN
    SELECT id INTO admin_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    IF admin_id IS NULL THEN
      RAISE EXCEPTION 'No users found in database. Please create a user first through Supabase Auth (Authentication > Users > Add user).';
    END IF;
    
    -- Profile oluştur (email ile birlikte)
    INSERT INTO profiles (id, email, role, created_at)
    SELECT id, email, 'super_admin', NOW()
    FROM auth.users
    WHERE id = admin_id
    ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
    
    RAISE NOTICE 'Profile created and promoted to super_admin: %', admin_id;
  ELSIF (SELECT role FROM profiles WHERE id = admin_id) NOT IN ('super_admin', 'admin') THEN
    -- Mevcut kullanıcıyı admin yap
    UPDATE profiles SET role = 'super_admin' WHERE id = admin_id;
    RAISE NOTICE 'User promoted to super_admin: %', admin_id;
  END IF;
  
  RAISE NOTICE 'Using admin ID: %', admin_id;
  
  -- ========================================================================
  -- 2. Trendikon mağazasını oluştur
  -- ========================================================================
  INSERT INTO stores (
    owner_id, store_name, store_slug, description,
    status, is_verified, verification_badge,
    commission_rate, email, phone,
    city, district, country,
    created_at, approved_at, approved_by
  ) VALUES (
    admin_id,
    'Trendikon',
    'nova-store',
    'Trendikon resmi mağazası - Yüksek kaliteli ürünler, hızlı teslimat, %100 müşteri memnuniyeti',
    'active',
    true,
    'platinum',
    0,
    'info@trendikon.com',
    '+905001234567',
    'İstanbul',
    'Kadıköy',
    'TR',
    NOW(),
    NOW(),
    admin_id
  )
  ON CONFLICT (store_slug) DO UPDATE SET
    status = 'active',
    is_verified = true,
    verification_badge = 'platinum'
  RETURNING id INTO nova_store_id;
  
  RAISE NOTICE 'Trendikon store created/updated: %', nova_store_id;
  
  -- Store balance oluştur
  INSERT INTO store_balance (store_id)
  VALUES (nova_store_id)
  ON CONFLICT (store_id) DO NOTHING;
  
  -- Admin'i seller yap
  UPDATE profiles SET is_seller = true WHERE id = admin_id;
  
  -- ========================================================================
  -- 3. Kategoriler
  -- ========================================================================
  
  -- Elektronik (Ana)
  INSERT INTO categories (name, slug, description, is_active, sort_order)
  VALUES ('Elektronik', 'elektronik', 'Tüm elektronik ürünler', true, 1)
  ON CONFLICT (slug) DO UPDATE SET is_active = true
  RETURNING id INTO elektronik_id;
  
  -- Telefon & Aksesuar
  INSERT INTO categories (name, slug, description, parent_id, is_active, sort_order)
  VALUES ('Telefon & Aksesuar', 'telefon-aksesuar', 'Cep telefonları ve aksesuarları', elektronik_id, true, 1)
  ON CONFLICT (slug) DO UPDATE SET parent_id = elektronik_id, is_active = true
  RETURNING id INTO telefon_id;
  
  -- Bilgisayar & Tablet
  INSERT INTO categories (name, slug, description, parent_id, is_active, sort_order)
  VALUES ('Bilgisayar & Tablet', 'bilgisayar-tablet', 'Dizüstü bilgisayarlar ve tabletler', elektronik_id, true, 2)
  ON CONFLICT (slug) DO UPDATE SET parent_id = elektronik_id, is_active = true
  RETURNING id INTO bilgisayar_id;
  
  -- Giyim (Ana)
  INSERT INTO categories (name, slug, description, is_active, sort_order)
  VALUES ('Giyim', 'giyim', 'Giyim ve moda ürünleri', true, 2)
  ON CONFLICT (slug) DO UPDATE SET is_active = true
  RETURNING id INTO giyim_id;
  
  -- Ev & Yaşam (Ana)
  INSERT INTO categories (name, slug, description, is_active, sort_order)
  VALUES ('Ev & Yaşam', 'ev-yasam', 'Ev ve yaşam ürünleri', true, 3)
  ON CONFLICT (slug) DO UPDATE SET is_active = true
  RETURNING id INTO ev_yasam_id;
  
  -- Spor & Outdoor (Ana)
  INSERT INTO categories (name, slug, description, is_active, sort_order)
  VALUES ('Spor & Outdoor', 'spor-outdoor', 'Spor ve outdoor ürünleri', true, 4)
  ON CONFLICT (slug) DO UPDATE SET is_active = true
  RETURNING id INTO spor_id;
  
  RAISE NOTICE 'Categories created/updated';
  
  -- ========================================================================
  -- 4. Demo Ürünler
  -- ========================================================================
  
  -- iPhone 15 Pro
  INSERT INTO products (
    store_id, category_id, name, slug, description,
    price, compare_at_price, stock, brand,
    is_active, is_featured, approval_status,
    approved_at, approved_by
  ) VALUES (
    nova_store_id, telefon_id,
    'iPhone 15 Pro 256GB',
    'iphone-15-pro-256gb',
    'Apple iPhone 15 Pro, 256GB depolama alanı, A17 Pro çip, 48MP kamera sistemi, titanyum çerçeve.',
    54999.00, 59999.00, 50, 'Apple',
    true, true, 'approved',
    NOW(), admin_id
  )
  ON CONFLICT (slug) DO UPDATE SET
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    is_active = true,
    is_featured = true;
  
  -- MacBook Air M2
  INSERT INTO products (
    store_id, category_id, name, slug, description,
    price, compare_at_price, stock, brand,
    is_active, is_featured, approval_status,
    approved_at, approved_by
  ) VALUES (
    nova_store_id, bilgisayar_id,
    'MacBook Air M2 13" 256GB',
    'macbook-air-m2-13-256gb',
    'Apple MacBook Air 13 inç, M2 çip, 256GB SSD, 8GB RAM, Retina ekran.',
    42999.00, 45999.00, 30, 'Apple',
    true, true, 'approved',
    NOW(), admin_id
  )
  ON CONFLICT (slug) DO UPDATE SET
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    is_active = true,
    is_featured = true;
  
  -- AirPods Pro 2
  INSERT INTO products (
    store_id, category_id, name, slug, description,
    price, stock, brand,
    is_active, is_featured, approval_status,
    approved_at, approved_by
  ) VALUES (
    nova_store_id, telefon_id,
    'AirPods Pro 2. Nesil',
    'airpods-pro-2-nesil',
    'Apple AirPods Pro 2. nesil, aktif gürültü engelleme, MagSafe şarj kutusu.',
    10999.00, 100, 'Apple',
    true, true, 'approved',
    NOW(), admin_id
  )
  ON CONFLICT (slug) DO UPDATE SET
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    is_active = true,
    is_featured = true;
  
  -- Samsung Galaxy S24
  INSERT INTO products (
    store_id, category_id, name, slug, description,
    price, compare_at_price, stock, brand,
    is_active, is_featured, approval_status,
    approved_at, approved_by
  ) VALUES (
    nova_store_id, telefon_id,
    'Samsung Galaxy S24 256GB',
    'samsung-galaxy-s24-256gb',
    'Samsung Galaxy S24, 256GB, Snapdragon 8 Gen 3, 6.2" Dynamic AMOLED 2X ekran.',
    38999.00, 42999.00, 40, 'Samsung',
    true, false, 'approved',
    NOW(), admin_id
  )
  ON CONFLICT (slug) DO UPDATE SET
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    is_active = true;
  
  -- Dell XPS 15
  INSERT INTO products (
    store_id, category_id, name, slug, description,
    price, stock, brand,
    is_active, approval_status,
    approved_at, approved_by
  ) VALUES (
    nova_store_id, bilgisayar_id,
    'Dell XPS 15 9530',
    'dell-xps-15-9530',
    'Dell XPS 15, Intel Core i7-13700H, 16GB RAM, 512GB SSD, RTX 4050.',
    64999.00, 15, 'Dell',
    true, 'approved',
    NOW(), admin_id
  )
  ON CONFLICT (slug) DO UPDATE SET
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    is_active = true;
  
  -- Sony WH-1000XM5
  INSERT INTO products (
    store_id, category_id, name, slug, description,
    price, stock, brand,
    is_active, is_featured, approval_status,
    approved_at, approved_by
  ) VALUES (
    nova_store_id, telefon_id,
    'Sony WH-1000XM5 Kulaklık',
    'sony-wh-1000xm5-kulaklik',
    'Sony WH-1000XM5, premium gürültü engelleme, 30 saat pil ömrü.',
    14999.00, 60, 'Sony',
    true, true, 'approved',
    NOW(), admin_id
  )
  ON CONFLICT (slug) DO UPDATE SET
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    is_active = true,
    is_featured = true;
  
  -- iPad Pro 12.9
  INSERT INTO products (
    store_id, category_id, name, slug, description,
    price, compare_at_price, stock, brand,
    is_active, is_featured, approval_status,
    approved_at, approved_by
  ) VALUES (
    nova_store_id, bilgisayar_id,
    'iPad Pro 12.9" M2 256GB',
    'ipad-pro-12-9-m2-256gb',
    'iPad Pro 12.9 inç, M2 çip, 256GB, Wi-Fi, Liquid Retina XDR ekran.',
    49999.00, 54999.00, 25, 'Apple',
    true, true, 'approved',
    NOW(), admin_id
  )
  ON CONFLICT (slug) DO UPDATE SET
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    is_active = true,
    is_featured = true;
  
  -- Samsung Galaxy Watch 6
  INSERT INTO products (
    store_id, category_id, name, slug, description,
    price, compare_at_price, stock, brand,
    is_active, approval_status,
    approved_at, approved_by
  ) VALUES (
    nova_store_id, telefon_id,
    'Samsung Galaxy Watch 6 Classic 47mm',
    'samsung-galaxy-watch-6-classic',
    'Samsung Galaxy Watch 6 Classic, 47mm, Bluetooth, sağlık takibi.',
    12999.00, 14999.00, 35, 'Samsung',
    true, 'approved',
    NOW(), admin_id
  )
  ON CONFLICT (slug) DO UPDATE SET
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    is_active = true;
  
  RAISE NOTICE 'Products created/updated successfully!';
  
  -- ========================================================================
  -- 5. Kuponlar
  -- ========================================================================
  
  INSERT INTO coupons (code, description, discount_type, discount_value, minimum_amount, maximum_discount, usage_limit, starts_at, expires_at, is_active)
  VALUES 
    ('HOSGELDIN10', 'Yeni üyelere özel %10 indirim', 'percentage', 10.00, 500.00, 500.00, 1000, NOW(), NOW() + INTERVAL '30 days', true),
    ('YILBASI500', 'Yılbaşı kampanyası 500 TL indirim', 'fixed', 500.00, 2000.00, NULL, 500, NOW(), NOW() + INTERVAL '15 days', true),
    ('KARGO50', '50 TL ve üzeri alışverişte kargo bedava', 'percentage', 100.00, 50.00, 50.00, NULL, NOW(), NULL, true)
  ON CONFLICT (code) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    expires_at = EXCLUDED.expires_at;
  
  RAISE NOTICE 'Coupons created/updated';
  
  -- ========================================================================
  -- Özet
  -- ========================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo data oluşturuldu!';
  RAISE NOTICE 'Admin ID: %', admin_id;
  RAISE NOTICE 'Trendikon Store ID: %', nova_store_id;
  RAISE NOTICE 'Kategoriler: 6 (Elektronik, Telefon, Bilgisayar, Giyim, Ev&Yaşam, Spor)';
  RAISE NOTICE 'Ürünler: 8 (iPhone, MacBook, AirPods, Samsung S24, Dell, Sony, iPad, Watch)';
  RAISE NOTICE 'Kuponlar: 3';
  RAISE NOTICE '========================================';
  
END $$;

-- ============================================================================
-- Sonuçları kontrol et
-- ============================================================================

-- Kategoriler
SELECT id, name, slug, parent_id, is_active 
FROM categories 
ORDER BY sort_order, created_at;

-- Ürünler
SELECT id, name, price, compare_at_price, stock, is_featured, is_active
FROM products
ORDER BY created_at DESC;

-- Store
SELECT id, store_name, store_slug, status, is_verified 
FROM stores 
WHERE store_slug = 'nova-store';
