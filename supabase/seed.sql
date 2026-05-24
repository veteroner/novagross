-- =====================================================
-- ÖRNEK VERİLER - Supabase SQL Editor'da çalıştırın
-- =====================================================

-- Kategoriler
INSERT INTO public.categories (name, slug, description, sort_order, is_active) VALUES
('Elektronik', 'elektronik', 'Telefon, bilgisayar, TV ve daha fazlası', 1, true),
('Giyim', 'giyim', 'Erkek, kadın ve çocuk giyim ürünleri', 2, true),
('Ev & Yaşam', 'ev-yasam', 'Mobilya, dekorasyon ve ev ürünleri', 3, true),
('Spor', 'spor', 'Spor giyim ve ekipmanları', 4, true),
('Kitap', 'kitap', 'Kitap, dergi ve kırtasiye', 5, true),
('Kozmetik', 'kozmetik', 'Güzellik ve kişisel bakım ürünleri', 6, true);

-- Ürünler
INSERT INTO public.products (name, slug, description, price, compare_price, stock, category_id, brand, is_active, is_featured, sku) VALUES
-- Elektronik
('iPhone 15 Pro Max 256GB', 'iphone-15-pro-max-256gb', 'Apple iPhone 15 Pro Max, 256GB depolama, Titanyum tasarım, A17 Pro çip', 74999.00, 84999.00, 15, (SELECT id FROM categories WHERE slug = 'elektronik'), 'Apple', true, true, 'APL-IP15PM-256'),
('Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 'Samsung Galaxy S24 Ultra, 256GB, Titanium Gray, Galaxy AI özellikleri', 64999.00, 69999.00, 20, (SELECT id FROM categories WHERE slug = 'elektronik'), 'Samsung', true, true, 'SAM-S24U-256'),
('MacBook Air M3', 'macbook-air-m3', 'Apple MacBook Air 13 inç, M3 çip, 8GB RAM, 256GB SSD', 49999.00, NULL, 10, (SELECT id FROM categories WHERE slug = 'elektronik'), 'Apple', true, true, 'APL-MBA-M3'),
('Sony WH-1000XM5', 'sony-wh-1000xm5', 'Sony kablosuz gürültü önleyici kulaklık, 30 saat pil ömrü', 9999.00, 12999.00, 30, (SELECT id FROM categories WHERE slug = 'elektronik'), 'Sony', true, false, 'SNY-WH1000XM5'),
('Samsung 65" QLED 4K TV', 'samsung-65-qled-4k-tv', 'Samsung 65 inç QLED 4K Smart TV, Quantum HDR', 42999.00, 54999.00, 8, (SELECT id FROM categories WHERE slug = 'elektronik'), 'Samsung', true, true, 'SAM-TV65Q'),

-- Giyim
('Nike Air Max 270', 'nike-air-max-270', 'Nike Air Max 270 erkek spor ayakkabı, rahat taban teknolojisi', 3499.00, 4299.00, 50, (SELECT id FROM categories WHERE slug = 'giyim'), 'Nike', true, true, 'NIK-AM270'),
('Levis 501 Original', 'levis-501-original', 'Levis 501 Original Fit erkek kot pantolon, klasik kesim', 1899.00, 2299.00, 40, (SELECT id FROM categories WHERE slug = 'giyim'), 'Levis', true, false, 'LEV-501'),
('Adidas Originals Hoodie', 'adidas-originals-hoodie', 'Adidas Originals Trefoil Hoodie, pamuklu sweatshirt', 1299.00, NULL, 60, (SELECT id FROM categories WHERE slug = 'giyim'), 'Adidas', true, false, 'ADI-HOOD'),
('Zara Oversize T-Shirt', 'zara-oversize-tshirt', 'Zara oversize pamuklu t-shirt, unisex', 499.00, 699.00, 100, (SELECT id FROM categories WHERE slug = 'giyim'), 'Zara', true, false, 'ZRA-TSH'),

-- Ev & Yaşam
('Dyson V15 Detect', 'dyson-v15-detect', 'Dyson V15 Detect kablosuz süpürge, lazer toz algılama', 24999.00, 29999.00, 12, (SELECT id FROM categories WHERE slug = 'ev-yasam'), 'Dyson', true, true, 'DYS-V15'),
('IKEA MALM Yatak', 'ikea-malm-yatak', 'IKEA MALM çift kişilik yatak, 160x200 cm, beyaz', 4999.00, NULL, 25, (SELECT id FROM categories WHERE slug = 'ev-yasam'), 'IKEA', true, false, 'IKE-MALM'),
('Philips Airfryer XXL', 'philips-airfryer-xxl', 'Philips Airfryer XXL, 7.3L kapasite, yağsız pişirme', 6999.00, 8499.00, 35, (SELECT id FROM categories WHERE slug = 'ev-yasam'), 'Philips', true, true, 'PHL-AFXXL'),
('Nespresso Vertuo', 'nespresso-vertuo', 'Nespresso Vertuo Next kahve makinesi, otomatik', 3499.00, 4299.00, 20, (SELECT id FROM categories WHERE slug = 'ev-yasam'), 'Nespresso', true, false, 'NSP-VRT'),

-- Spor
('Nike Dri-FIT Set', 'nike-drifit-set', 'Nike Dri-FIT antrenman seti, üst ve alt', 1999.00, 2499.00, 45, (SELECT id FROM categories WHERE slug = 'spor'), 'Nike', true, false, 'NIK-DFS'),
('Decathlon Yoga Matı', 'decathlon-yoga-mati', 'Decathlon 5mm yoga matı, kaymaz yüzey', 299.00, NULL, 80, (SELECT id FROM categories WHERE slug = 'spor'), 'Decathlon', true, false, 'DCT-YGM'),
('Garmin Forerunner 265', 'garmin-forerunner-265', 'Garmin Forerunner 265 GPS akıllı saat, AMOLED ekran', 12999.00, 14999.00, 15, (SELECT id FROM categories WHERE slug = 'spor'), 'Garmin', true, true, 'GAR-FR265'),

-- Kitap
('Atomic Habits', 'atomic-habits', 'James Clear - Atomic Habits: Küçük Değişiklikler Büyük Sonuçlar', 149.00, 199.00, 200, (SELECT id FROM categories WHERE slug = 'kitap'), 'Pegasus', true, false, 'BK-ATOMC'),
('Sapiens', 'sapiens', 'Yuval Noah Harari - Sapiens: İnsan Türünün Kısa Tarihi', 189.00, NULL, 150, (SELECT id FROM categories WHERE slug = 'kitap'), 'Kolektif', true, true, 'BK-SAPNS'),

-- Kozmetik  
('La Roche-Posay Serum', 'la-roche-posay-serum', 'La Roche-Posay Hyalu B5 Serum, 30ml', 899.00, 1099.00, 70, (SELECT id FROM categories WHERE slug = 'kozmetik'), 'La Roche-Posay', true, false, 'LRP-HB5'),
('MAC Ruby Woo Ruj', 'mac-ruby-woo-ruj', 'MAC Ruby Woo mat ruj, ikonik kırmızı', 749.00, NULL, 55, (SELECT id FROM categories WHERE slug = 'kozmetik'), 'MAC', true, true, 'MAC-RW');

-- Ürün Görselleri (placeholder URL'ler - gerçek görseller Supabase Storage'a yüklenecek)
INSERT INTO public.product_images (product_id, url, alt_text, sort_order, is_primary) 
SELECT id, 'https://via.placeholder.com/600x600?text=' || REPLACE(name, ' ', '+'), name, 1, true
FROM public.products;
