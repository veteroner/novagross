-- Trendikon Seed Data (Marketplace Version with Demo Stores)
-- Bu dosyayı Supabase SQL Editor'da çalıştırın
-- NOT: Önce marketplace migration'ı çalıştırmalısınız!

-- 0. MEVCUT VERİLERİ TEMİZLE (Varsa)
DO $$ 
BEGIN
    -- Marketplace tabloları
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'withdrawal_requests') THEN
        DELETE FROM withdrawal_requests;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'store_transactions') THEN
        DELETE FROM store_transactions;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'store_balance') THEN
        DELETE FROM store_balance;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'store_reviews') THEN
        DELETE FROM store_reviews;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'store_followers') THEN
        DELETE FROM store_followers;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_images') THEN
        DELETE FROM product_images;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
        DELETE FROM products;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stores') THEN
        DELETE FROM stores WHERE store_slug != 'nova-store';
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'categories') THEN
        DELETE FROM categories;
    END IF;
    
    -- Auth users temizle (demo kullanıcılar)
    DELETE FROM auth.users WHERE email LIKE '%@%.demo';
END $$;

-- 1. KATEGORİLER
INSERT INTO categories (name, slug, description, image_url, sort_order, is_active) VALUES
('Elektronik', 'elektronik', 'Telefon, bilgisayar, tablet ve aksesuarlar', 'https://placehold.co/400x300/3b82f6/ffffff?text=Elektronik', 1, true),
('Giyim', 'giyim', 'Erkek, kadın ve çocuk giyim', 'https://placehold.co/400x300/ec4899/ffffff?text=Giyim', 2, true),
('Ev & Yaşam', 'ev-yasam', 'Ev eşyaları, dekorasyon, beyaz eşya', 'https://placehold.co/400x300/10b981/ffffff?text=Ev+Yasam', 3, true),
('Spor', 'spor', 'Spor giyim ve ekipmanları', 'https://placehold.co/400x300/f59e0b/ffffff?text=Spor', 4, true),
('Kitap', 'kitap', 'Kitaplar ve dergiler', 'https://placehold.co/400x300/8b5cf6/ffffff?text=Kitap', 5, true),
('Kozmetik', 'kozmetik', 'Kişisel bakım ve kozmetik ürünleri', 'https://placehold.co/400x300/ef4444/ffffff?text=Kozmetik', 6, true);

-- 2. DEMO KULLANICILAR VE MAĞAZALAR
DO $$
DECLARE
    demo_user_1 UUID := '11111111-1111-1111-1111-111111111111'::UUID;
    demo_user_2 UUID := '22222222-2222-2222-2222-222222222222'::UUID;
    demo_user_3 UUID := '33333333-3333-3333-3333-333333333333'::UUID;
    
    techstore_id UUID;
    fashionhub_id UUID;
    homelife_id UUID;
    nova_store_id UUID;
    
    elektronik_id UUID;
    giyim_id UUID;
    ev_yasam_id UUID;
    spor_id UUID;
    kitap_id UUID;
    kozmetik_id UUID;
BEGIN
    -- DEMO AUTH USERS (Şifre: demo123)
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token
    ) VALUES
    (
        '00000000-0000-0000-0000-000000000000',
        demo_user_1, 'authenticated', 'authenticated',
        'ahmet@techstore.demo',
        crypt('demo123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Ahmet Yılmaz"}'::jsonb,
        NOW(), NOW(), '', ''
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        demo_user_2, 'authenticated', 'authenticated',
        'ayse@fashionhub.demo',
        crypt('demo123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Ayşe Demir"}'::jsonb,
        NOW(), NOW(), '', ''
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        demo_user_3, 'authenticated', 'authenticated',
        'mehmet@homelife.demo',
        crypt('demo123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Mehmet Kaya"}'::jsonb,
        NOW(), NOW(), '', ''
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- DEMO PROFILES
    INSERT INTO profiles (id, email, first_name, last_name, is_seller, created_at)
    VALUES 
        (demo_user_1, 'ahmet@techstore.demo', 'Ahmet', 'Yılmaz', true, NOW()),
        (demo_user_2, 'ayse@fashionhub.demo', 'Ayşe', 'Demir', true, NOW()),
        (demo_user_3, 'mehmet@homelife.demo', 'Mehmet', 'Kaya', true, NOW())
    ON CONFLICT (id) DO UPDATE SET is_seller = true;
    
    -- Kategori ID'leri
    SELECT id INTO elektronik_id FROM categories WHERE slug = 'elektronik';
    SELECT id INTO giyim_id FROM categories WHERE slug = 'giyim';
    SELECT id INTO ev_yasam_id FROM categories WHERE slug = 'ev-yasam';
    SELECT id INTO spor_id FROM categories WHERE slug = 'spor';
    SELECT id INTO kitap_id FROM categories WHERE slug = 'kitap';
    SELECT id INTO kozmetik_id FROM categories WHERE slug = 'kozmetik';
    SELECT id INTO nova_store_id FROM stores WHERE store_slug = 'nova-store';

    -- Merkezi mağazayı Trendikon olarak güncelle (store_slug korunur)
    UPDATE stores
    SET
        store_name = 'Trendikon',
        description = 'Trendikon resmi mağazası - Yüksek kaliteli ürünler, hızlı teslimat, %100 müşteri memnuniyeti',
        email = 'info@trendikon.com'
    WHERE id = nova_store_id;
    
    -- DEMO MAĞAZALAR
    INSERT INTO stores (
        owner_id, store_name, store_slug, description, logo_url,
        email, phone, city, status, is_verified, verification_badge,
        rating, total_reviews, total_sales, total_revenue, commission_rate,
        approved_at, created_at
    ) VALUES
    (
        demo_user_1, 'TechStore', 'techstore',
        'En yeni ve en kaliteli elektronik ürünler. Apple, Samsung ve daha fazlası.',
        'https://placehold.co/200x200/3b82f6/ffffff?text=TS',
        'info@techstore.demo', '+90 555 111 2233', 'İstanbul',
        'active', true, 'gold', 4.7, 156, 423, 2150000, 15.00,
        NOW() - INTERVAL '30 days', NOW() - INTERVAL '60 days'
    ),
    (
        demo_user_2, 'FashionHub', 'fashionhub',
        'Trend giyim ve aksesuar mağazası. Kaliteli markaların adresi.',
        'https://placehold.co/200x200/ec4899/ffffff?text=FH',
        'destek@fashionhub.demo', '+90 555 444 5566', 'Ankara',
        'active', true, 'silver', 4.5, 89, 267, 980000, 15.00,
        NOW() - INTERVAL '45 days', NOW() - INTERVAL '90 days'
    ),
    (
        demo_user_3, 'HomeLife', 'homelife',
        'Eviniz için her şey burada. Ev aletleri ve dekorasyon.',
        'https://placehold.co/200x200/10b981/ffffff?text=HL',
        'iletisim@homelife.demo', '+90 555 777 8899', 'İzmir',
        'active', true, 'bronze', 4.3, 67, 189, 725000, 15.00,
        NOW() - INTERVAL '20 days', NOW() - INTERVAL '30 days'
    )
    RETURNING id INTO techstore_id, fashionhub_id, homelife_id;
    
    -- Son eklenen store_id'leri al
    SELECT id INTO techstore_id FROM stores WHERE store_slug = 'techstore';
    SELECT id INTO fashionhub_id FROM stores WHERE store_slug = 'fashionhub';
    SELECT id INTO homelife_id FROM stores WHERE store_slug = 'homelife';
    
    -- STORE BALANCE
    INSERT INTO store_balance (store_id, available_balance, pending_balance, last_payout_date, next_payout_date)
    VALUES 
        (techstore_id, 12500.00, 8750.00, NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days'),
        (fashionhub_id, 8340.00, 5230.00, NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days'),
        (homelife_id, 6150.00, 3890.00, NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days');
    
    -- ÜRÜNLER (Mağazalara dağıtılmış)
    INSERT INTO products (name, slug, description, price, compare_price, sku, stock, category_id, brand, store_id, is_active, is_featured, approval_status, approved_at) VALUES
    -- TechStore (4 elektronik)
    ('iPhone 15 Pro Max 256GB', 'iphone-15-pro-max-256gb', 'iPhone 15 Pro Max, Apple''ın en gelişmiş iPhone''u. Titanyum tasarımı, A17 Pro çipi ve profesyonel kamera sistemi.', 74999, 84999, 'APL-IPH15PM-256', 50, elektronik_id, 'Apple', techstore_id, true, true, 'approved', NOW()),
    ('Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 'Galaxy S24 Ultra, Samsung''un flagship modeli. 200MP kamera, S Pen desteği ve güçlü performans.', 64999, 69999, 'SAM-S24U-256', 30, elektronik_id, 'Samsung', techstore_id, true, true, 'approved', NOW()),
    ('MacBook Air M3 13"', 'macbook-air-m3-13', 'Yeni M3 çip ile güçlenen MacBook Air. İnce, hafif ve sessiz performans.', 49999, NULL, 'APL-MBA-M3-13', 20, elektronik_id, 'Apple', techstore_id, true, true, 'approved', NOW()),
    ('Sony WH-1000XM5', 'sony-wh-1000xm5', 'Endüstri lideri gürültü engelleme teknolojisi. Premium ses kalitesi ve konfor.', 9999, 12999, 'SNY-WH1000XM5', 40, elektronik_id, 'Sony', techstore_id, true, false, 'approved', NOW()),
    
    -- FashionHub (4 giyim/spor)
    ('Levi''s 501 Original Jeans', 'levis-501-original-jeans', 'İkonik 501 model straight fit kot pantolon. %100 pamuklu, dayanıklı kumaş.', 899, 1299, 'LEV-501-BLU-32', 120, giyim_id, 'Levi''s', fashionhub_id, true, true, 'approved', NOW()),
    ('Adidas Originals Trefoil Hoodie', 'adidas-originals-trefoil-hoodie', 'Klasik trefoil logo baskılı kapüşonlu sweatshirt. Pamuklu kumaş, rahat kesim.', 1299, 1799, 'ADI-TRF-HOOD-L', 80, giyim_id, 'Adidas', fashionhub_id, true, false, 'approved', NOW()),
    ('Zara Slim Fit Gömlek', 'zara-slim-fit-gomlek', 'Modern slim fit kesim erkek gömlek. %100 pamuklu, kolay ütülenir kumaş.', 599, NULL, 'ZRA-SLM-SHT-M', 150, giyim_id, 'Zara', fashionhub_id, true, false, 'approved', NOW()),
    ('Nike Air Max 270', 'nike-air-max-270', 'Rahat ve stil sahibi spor ayakkabı. Air Max yastıklama teknolojisi ile maksimum konfor.', 3499, 4299, 'NKE-AM270-BLK-42', 60, spor_id, 'Nike', fashionhub_id, true, true, 'approved', NOW()),
    
    -- HomeLife (2 ev yaşam)
    ('Dyson V15 Detect', 'dyson-v15-detect', 'Lazer teknolojisi ile görünmez tozu bile algılayan kablosuz süpürge.', 24999, 29999, 'DYS-V15-DTC', 18, ev_yasam_id, 'Dyson', homelife_id, true, true, 'approved', NOW()),
    ('Philips Airfryer XXL', 'philips-airfryer-xxl', 'Yağsız pişirme teknolojisi. 7.3L kapasiteli XXL hava fritözü.', 6999, 8499, 'PHL-AF-XXL', 35, ev_yasam_id, 'Philips', homelife_id, true, true, 'approved', NOW()),
    
    -- Trendikon (5 çeşitli)
    ('Samsung 65" QLED 4K TV', 'samsung-65-qled-4k-tv', 'Quantum Dot teknolojisi ile canlı renkler. 4K çözünürlük ve akıllı TV özellikleri.', 42999, 54999, 'SAM-QLED65-4K', 15, elektronik_id, 'Samsung', nova_store_id, true, false, 'approved', NOW()),
    ('Garmin Forerunner 265', 'garmin-forerunner-265', 'GPS''li koşu saati. Kalp atış hızı takibi, uyku analizi ve antrenman önerileri.', 12999, 14999, 'GRM-FR265', 25, spor_id, 'Garmin', nova_store_id, true, false, 'approved', NOW()),
    ('Suç ve Ceza - Dostoyevski', 'suc-ve-ceza-dostoyevski', 'Dostoyevski''nin ölümsüz eseri. Psikolojik suç romanının başyapıtı.', 189, NULL, 'KTP-DOST-001', 200, kitap_id, 'İş Bankası Yayınları', nova_store_id, true, true, 'approved', NOW()),
    ('La Roche-Posay Effaclar Duo+', 'la-roche-posay-effaclar-duo', 'Akne ve sivilce lekelerine karşı bakım kremi. Dermatolojik bakım.', 479, 599, 'KZM-LRP-EFF-40ML', 90, kozmetik_id, 'La Roche-Posay', nova_store_id, true, true, 'approved', NOW()),
    ('CeraVe Nemlendirici Krem', 'cerave-nemlendirici-krem', 'Seramid içeren 24 saat nemlendirme. Hassas ciltler için.', 299, NULL, 'KZM-CRV-MOIST-454G', 120, kozmetik_id, 'CeraVe', nova_store_id, true, false, 'approved', NOW());

END $$;

-- 3. ÜRÜN GÖRSELLERİ
DO $$
DECLARE
    product_rec RECORD;
BEGIN
    FOR product_rec IN SELECT id, slug FROM products LOOP
        INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary) VALUES
        (product_rec.id, 'https://placehold.co/800x800/e2e8f0/64748b?text=' || product_rec.slug, product_rec.slug || ' ön görsel', 1, true),
        (product_rec.id, 'https://placehold.co/800x800/f1f5f9/475569?text=' || product_rec.slug || '-2', product_rec.slug || ' yan görsel', 2, false),
        (product_rec.id, 'https://placehold.co/800x800/f8fafc/334155?text=' || product_rec.slug || '-3', product_rec.slug || ' detay görsel', 3, false);
    END LOOP;
END $$;

-- 4. VERİ DOĞRULAMA
SELECT 
    'STORES' as table_name,
    COUNT(*) as total_count
FROM stores
UNION ALL
SELECT 'CATEGORIES', COUNT(*) FROM categories
UNION ALL
SELECT 'PRODUCTS', COUNT(*) FROM products
UNION ALL
SELECT 'AUTH_USERS', COUNT(*) FROM auth.users WHERE email LIKE '%@%.demo';

-- Mağaza bazlı ürün dağılımı
SELECT 
    s.store_name,
    s.verification_badge,
    COUNT(p.id) as product_count,
    SUM(CASE WHEN p.approval_status = 'approved' THEN 1 ELSE 0 END) as approved
FROM stores s
LEFT JOIN products p ON p.store_id = s.id
GROUP BY s.id, s.store_name, s.verification_badge
ORDER BY product_count DESC;
