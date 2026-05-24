-- Ev & Yaşam kategorisindeki ürünleri yeni alt kategorilere dağıt

-- Kategori ID'lerini al
WITH category_ids AS (
  SELECT id, slug FROM categories 
  WHERE slug IN ('mobilya', 'dekorasyon', 'mutfak-sofra', 'aydinlatma', 'ev-tekstili', 'banyo', 'organizasyon-saklama', 'bahce-balkon')
),
old_ev_yasam AS (
  SELECT id FROM categories WHERE slug = 'ev-yasam'
)

-- Ürünleri isimlerine göre yeni kategorilere taşı
UPDATE products SET category_id = (
  CASE 
    -- Mutfak & Sofra
    WHEN LOWER(name) LIKE '%mutfak%' OR LOWER(name) LIKE '%kaşık%' OR LOWER(name) LIKE '%tencere%' 
         OR LOWER(name) LIKE '%tabak%' OR LOWER(name) LIKE '%bardak%' OR LOWER(name) LIKE '%kahve%'
         OR LOWER(name) LIKE '%çatal%' OR LOWER(name) LIKE '%bıçak%' OR LOWER(name) LIKE '%fincan%'
    THEN (SELECT id FROM category_ids WHERE slug = 'mutfak-sofra')
    
    -- Organizasyon & Saklama
    WHEN LOWER(name) LIKE '%düzenleyici%' OR LOWER(name) LIKE '%kalemlik%' OR LOWER(name) LIKE '%sepet%'
         OR LOWER(name) LIKE '%kutu%' OR LOWER(name) LIKE '%raf%' OR LOWER(name) LIKE '%kablo sarıcı%'
         OR LOWER(name) LIKE '%organizer%' OR LOWER(name) LIKE '%askı%' OR LOWER(name) LIKE '%saklama%'
    THEN (SELECT id FROM category_ids WHERE slug = 'organizasyon-saklama')
    
    -- Aydınlatma
    WHEN LOWER(name) LIKE '%lamba%' OR LOWER(name) LIKE '%avize%' OR LOWER(name) LIKE '%aydınlatma%'
         OR LOWER(name) LIKE '%spot%' OR LOWER(name) LIKE '%ampul%'
    THEN (SELECT id FROM category_ids WHERE slug = 'aydinlatma')
    
    -- Banyo
    WHEN LOWER(name) LIKE '%banyo%' OR LOWER(name) LIKE '%havlu%' OR LOWER(name) LIKE '%duş%'
         OR LOWER(name) LIKE '%sabunluk%' OR LOWER(name) LIKE '%wc%'
    THEN (SELECT id FROM category_ids WHERE slug = 'banyo')
    
    -- Ev Tekstili
    WHEN LOWER(name) LIKE '%perde%' OR LOWER(name) LIKE '%nevresim%' OR LOWER(name) LIKE '%yastık%'
         OR LOWER(name) LIKE '%örtü%' OR LOWER(name) LIKE '%çarşaf%' OR LOWER(name) LIKE '%halı%'
    THEN (SELECT id FROM category_ids WHERE slug = 'ev-tekstili')
    
    -- Bahçe & Balkon
    WHEN LOWER(name) LIKE '%bahçe%' OR LOWER(name) LIKE '%saksı%' OR LOWER(name) LIKE '%bitki%'
         OR LOWER(name) LIKE '%tohum%' OR LOWER(name) LIKE '%balkon%'
    THEN (SELECT id FROM category_ids WHERE slug = 'bahce-balkon')
    
    -- Mobilya
    WHEN LOWER(name) LIKE '%mobilya%' OR LOWER(name) LIKE '%koltuk%' OR LOWER(name) LIKE '%masa%'
         OR LOWER(name) LIKE '%sandalye%' OR LOWER(name) LIKE '%dolap%' OR LOWER(name) LIKE '%komidin%'
    THEN (SELECT id FROM category_ids WHERE slug = 'mobilya')
    
    -- Dekorasyon (varsayılan - diğer kategorilere uymayan her şey)
    ELSE (SELECT id FROM category_ids WHERE slug = 'dekorasyon')
  END
)
WHERE category_id = (SELECT id FROM old_ev_yasam)
  AND is_active = true;

-- Sonuçları kontrol et
SELECT 
  c.name as kategori, 
  COUNT(p.id) as urun_sayisi
FROM categories c
LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
WHERE c.slug IN ('mobilya', 'dekorasyon', 'mutfak-sofra', 'aydinlatma', 'ev-tekstili', 'banyo', 'organizasyon-saklama', 'bahce-balkon')
GROUP BY c.id, c.name
ORDER BY urun_sayisi DESC;
