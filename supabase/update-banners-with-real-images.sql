-- Banner'ları her kategorinin gerçek ürün resimleriyle güncelle
DO $$
DECLARE
  telefon_img text;
  kedi_img text;
  ev_duzenleme_img text;
  mutfak_img text;
  kus_img text;
BEGIN
  -- Her kategori için bir ürün resmi al
  SELECT pi.url INTO telefon_img
  FROM products p
  INNER JOIN product_images pi ON p.id = pi.product_id
  WHERE p.category_id = (SELECT id FROM categories WHERE slug = 'telefon-kiliflari')
    AND p.is_active = true AND pi.is_primary = true
  LIMIT 1;

  SELECT pi.url INTO kedi_img
  FROM products p
  INNER JOIN product_images pi ON p.id = pi.product_id
  WHERE p.category_id = (SELECT id FROM categories WHERE slug = 'kedi-urunleri')
    AND p.is_active = true AND pi.is_primary = true
  LIMIT 1;

  SELECT pi.url INTO ev_duzenleme_img
  FROM products p
  INNER JOIN product_images pi ON p.id = pi.product_id
  WHERE p.category_id = (SELECT id FROM categories WHERE slug = 'ev-duzenleme')
    AND p.is_active = true AND pi.is_primary = true
  LIMIT 1;

  SELECT pi.url INTO mutfak_img
  FROM products p
  INNER JOIN product_images pi ON p.id = pi.product_id
  WHERE p.category_id = (SELECT id FROM categories WHERE slug = 'mutfak-organizasyon')
    AND p.is_active = true AND pi.is_primary = true
  LIMIT 1;

  SELECT pi.url INTO kus_img
  FROM products p
  INNER JOIN product_images pi ON p.id = pi.product_id
  WHERE p.category_id = (SELECT id FROM categories WHERE slug = 'kus-urunleri')
    AND p.is_active = true AND pi.is_primary = true
  LIMIT 1;

  -- Banner'ları güncelle
  UPDATE banners 
  SET image_url = telefon_img
  WHERE link_value = 'telefon-kiliflari' AND telefon_img IS NOT NULL;

  UPDATE banners 
  SET image_url = kedi_img
  WHERE link_value = 'kedi-urunleri' AND kedi_img IS NOT NULL;

  UPDATE banners 
  SET image_url = ev_duzenleme_img
  WHERE link_value = 'ev-duzenleme' AND ev_duzenleme_img IS NOT NULL;

  UPDATE banners 
  SET image_url = mutfak_img
  WHERE link_value = 'mutfak-organizasyon' AND mutfak_img IS NOT NULL;

  UPDATE banners 
  SET image_url = kus_img
  WHERE link_value = 'kus-urunleri' AND kus_img IS NOT NULL;
  
  RAISE NOTICE 'Banner resimleri güncellendi!';
END $$;
