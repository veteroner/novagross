-- Ev & Yaşam kategorisini alt kategorilere böl

-- 1. Yeni kategorileri ekle
INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active) 
SELECT 
  'Mobilya' as name,
  'mobilya' as slug,
  'Oturma odası, yatak odası ve ofis mobilyaları' as description,
  id as parent_id,
  1 as sort_order,
  true as is_active
FROM categories WHERE slug = 'ev-yasam'
UNION ALL
SELECT 'Dekorasyon', 'dekorasyon', 'Duvar süsleri, tablolar, vazo ve aksesuar', id, 2, true FROM categories WHERE slug = 'ev-yasam'
UNION ALL
SELECT 'Mutfak & Sofra', 'mutfak-sofra', 'Mutfak eşyaları, yemek takımları', id, 3, true FROM categories WHERE slug = 'ev-yasam'
UNION ALL
SELECT 'Banyo', 'banyo', 'Banyo aksesuarları, havlu ve banyo ürünleri', id, 4, true FROM categories WHERE slug = 'ev-yasam'
UNION ALL
SELECT 'Aydınlatma', 'aydinlatma', 'Avize, lamba, spot ve aydınlatma', id, 5, true FROM categories WHERE slug = 'ev-yasam'
UNION ALL
SELECT 'Ev Tekstili', 'ev-tekstili', 'Perdeler, yatak örtüsü, yastık', id, 6, true FROM categories WHERE slug = 'ev-yasam'
UNION ALL
SELECT 'Organizasyon', 'organizasyon-saklama', 'Raf, sepet, kutu ve düzenleyiciler', id, 7, true FROM categories WHERE slug = 'ev-yasam'
UNION ALL
SELECT 'Bahçe & Balkon', 'bahce-balkon', 'Bahçe mobilyası, saksı ve dış mekan', id, 8, true FROM categories WHERE slug = 'ev-yasam';

-- 2. Aktif kategorileri listele
SELECT name, slug, is_active, (SELECT name FROM categories p WHERE p.id = c.parent_id) as parent
FROM categories c
WHERE is_active = true
ORDER BY sort_order, name;
