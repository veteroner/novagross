-- Örnek banner kayıtları ekle (iyzico uyumluluğu için)
-- Her banner bir ürün veya kategoriye yönlendiriyor

INSERT INTO public.banners (title, description, image_url, link_type, link_value, button_text, sort_order, is_active)
VALUES 
  -- Banner 1: Elektronik kategorisi
  (
    'Yeni Teknoloji Ürünleri',
    'En yeni elektronik ürünler, en uygun fiyatlarla! Telefon, bilgisayar, tablet ve daha fazlası.',
    'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1920&h=600&fit=crop',
    'category',
    'elektronik',
    'Elektronik Ürünlere Göz At',
    1,
    true
  ),
  
  -- Banner 2: Telefon & Aksesuar kategorisi
  (
    'Akıllı Telefon Kampanyası',
    'En son model telefonlar ve aksesuarlar şimdi indirimde! Kaçırmayın!',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1920&h=600&fit=crop',
    'category',
    'telefon-aksesuar',
    'Telefonları İncele',
    2,
    true
  ),
  
  -- Banner 3: Tüm ürünler sayfası
  (
    'Kış İndirimleri Başladı',
    'Binlerce üründe %50''ye varan indirimler! Tüm ürünleri inceleyin.',
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1920&h=600&fit=crop',
    'page',
    '/urunler',
    'Alışverişe Başla',
    3,
    true
  )
ON CONFLICT DO NOTHING;

-- Banner sayısını kontrol et
SELECT COUNT(*) as banner_sayisi FROM public.banners WHERE is_active = true;
