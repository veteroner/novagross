-- Kategori ID'lerini değişkenlere ata
DO $$
DECLARE
  telefon_cat_id UUID;
  tablet_cat_id UUID;
  saat_cat_id UUID;
  kedi_cat_id UUID;
  kus_cat_id UUID;
  ev_duzenleme_cat_id UUID;
  mutfak_cat_id UUID;
  dekoratif_cat_id UUID;
  oyuncak_cat_id UUID;
BEGIN
  -- Kategori ID'lerini al
  SELECT id INTO telefon_cat_id FROM categories WHERE slug = 'telefon-kiliflari';
  SELECT id INTO tablet_cat_id FROM categories WHERE slug = 'tablet-aksesuarlari';
  SELECT id INTO saat_cat_id FROM categories WHERE slug = 'akilli-saat';
  SELECT id INTO kedi_cat_id FROM categories WHERE slug = 'kedi-urunleri';
  SELECT id INTO kus_cat_id FROM categories WHERE slug = 'kus-urunleri';
  SELECT id INTO ev_duzenleme_cat_id FROM categories WHERE slug = 'ev-duzenleme';
  SELECT id INTO mutfak_cat_id FROM categories WHERE slug = 'mutfak-organizasyon';
  SELECT id INTO dekoratif_cat_id FROM categories WHERE slug = 'dekoratif-urunler';
  SELECT id INTO oyuncak_cat_id FROM categories WHERE slug = 'oyuncak-hobi';

  -- iPhone kılıfları ve aksesuarları
  UPDATE products SET category_id = telefon_cat_id 
  WHERE name ILIKE '%iPhone%' OR name ILIKE '%Samsung%' OR name ILIKE '%Galaxy%';

  -- Tablet aksesuarları
  UPDATE products SET category_id = tablet_cat_id 
  WHERE name ILIKE '%TAB%' OR name ILIKE '%Tablet%' OR name ILIKE '%iPad%';

  -- Apple Watch ve akıllı saat
  UPDATE products SET category_id = saat_cat_id 
  WHERE name ILIKE '%Apple Watch%' OR name ILIKE '%Kordon%';

  -- Kedi ürünleri
  UPDATE products SET category_id = kedi_cat_id 
  WHERE name ILIKE '%Kedi%' OR name ILIKE '%Malt%' OR name ILIKE '%Bentonit%';

  -- Kuş ürünleri
  UPDATE products SET category_id = kus_cat_id 
  WHERE name ILIKE '%Muhabbet%' OR name ILIKE '%Papağan%' OR name ILIKE '%Kanarya%' OR name ILIKE '%Egzotik%';

  -- Dekoratif ürünler
  UPDATE products SET category_id = dekoratif_cat_id 
  WHERE name ILIKE '%Hediyelik%' OR name ILIKE '%LOVE%' OR name ILIKE '%Kalp%' OR name ILIKE '%Dekoratif%';

  -- Oyuncak & Hobi
  UPDATE products SET category_id = oyuncak_cat_id 
  WHERE name ILIKE '%İskelet%' OR name ILIKE '%UNO%';

  -- Mutfak organizasyonu (mutfak düzenleyiciler, kaşık altlıkları, kahve düzenleyici)
  UPDATE products SET category_id = mutfak_cat_id 
  WHERE name ILIKE '%Mutfak%' OR name ILIKE '%Kaşık%' OR name ILIKE '%Tencere%' OR name ILIKE '%Kapsül Kahve%';

  -- Ev düzenleme & saklama (geri kalan organizerler, kalemlikler, çekmeceler, kablo sarıcı)
  UPDATE products SET category_id = ev_duzenleme_cat_id 
  WHERE name ILIKE '%Kalemlik%' OR name ILIKE '%Çekmece%' OR name ILIKE '%LEGO%' 
     OR name ILIKE '%Fren Diski%' OR name ILIKE '%Lastik%' OR name ILIKE '%Brick%'
     OR name ILIKE '%Kablo%' OR name ILIKE '%Makaralı%' OR name ILIKE '%Düzenleyici%'
     AND category_id != mutfak_cat_id;

END $$;
