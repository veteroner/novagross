-- Telefon kategorisi banner
UPDATE banners 
SET image_url = (
  SELECT pi.url
  FROM products p
  INNER JOIN product_images pi ON p.id = pi.product_id
  WHERE p.category_id = (SELECT id FROM categories WHERE slug = 'telefon-kiliflari')
    AND p.is_active = true AND pi.is_primary = true
  LIMIT 1
)
WHERE link_value = 'telefon-kiliflari';

-- Kedi ürünleri banner
UPDATE banners 
SET image_url = (
  SELECT pi.url
  FROM products p
  INNER JOIN product_images pi ON p.id = pi.product_id
  WHERE p.category_id = (SELECT id FROM categories WHERE slug = 'kedi-urunleri')
    AND p.is_active = true AND pi.is_primary = true
  LIMIT 1
)
WHERE link_value = 'kedi-urunleri';

-- Ev düzenleme banner
UPDATE banners 
SET image_url = (
  SELECT pi.url
  FROM products p
  INNER JOIN product_images pi ON p.id = pi.product_id
  WHERE p.category_id = (SELECT id FROM categories WHERE slug = 'ev-duzenleme')
    AND p.is_active = true AND pi.is_primary = true
  LIMIT 1
)
WHERE link_value = 'ev-duzenleme';

-- Mutfak banner
UPDATE banners 
SET image_url = (
  SELECT pi.url
  FROM products p
  INNER JOIN product_images pi ON p.id = pi.product_id
  WHERE p.category_id = (SELECT id FROM categories WHERE slug = 'mutfak-organizasyon')
    AND p.is_active = true AND pi.is_primary = true
  LIMIT 1
)
WHERE link_value = 'mutfak-organizasyon';

-- Kuş ürünleri banner
UPDATE banners 
SET image_url = (
  SELECT pi.url
  FROM products p
  INNER JOIN product_images pi ON p.id = pi.product_id
  WHERE p.category_id = (SELECT id FROM categories WHERE slug = 'kus-urunleri')
    AND p.is_active = true AND pi.is_primary = true
  LIMIT 1
)
WHERE link_value = 'kus-urunleri';
