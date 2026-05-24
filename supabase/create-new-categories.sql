-- Önce tüm kategorileri pasif yap
UPDATE categories SET is_active = false;

-- Yeni kategorileri oluştur
INSERT INTO categories (name, slug, description, sort_order, is_active) VALUES
('Telefon Kılıfları & Aksesuarları', 'telefon-kiliflari', 'iPhone ve Samsung kılıfları, ekran koruyucular, şarj kabloları', 1, true),
('Tablet Aksesuarları', 'tablet-aksesuarlari', 'Tablet ekran koruyucular ve aksesuarlar', 2, true),
('Akıllı Saat Aksesuarları', 'akilli-saat', 'Apple Watch ve akıllı saat kordonları', 3, true),
('Kedi Ürünleri', 'kedi-urunleri', 'Kedi kumu, malt pasta, vitamin, taşıma çantası', 4, true),
('Kuş Ürünleri', 'kus-urunleri', 'Muhabbet kuşu, papağan, kanarya yemleri', 5, true),
('Ev Düzenleme & Saklama', 'ev-duzenleme', 'Kalemlikler, mini çekmeceler, organizerler, düzenleyiciler', 6, true),
('Mutfak Organizasyonu', 'mutfak-organizasyon', 'Mutfak düzenleyicileri, kaşık altlıkları, kapsül kahve düzenleyici', 7, true),
('Dekoratif Ürünler', 'dekoratif-urunler', 'Hediyelik objeler, dekoratif aksesuarlar', 8, true),
('Oyuncak & Hobi', 'oyuncak-hobi', 'Oyuncaklar, hobi ürünleri', 9, true)
ON CONFLICT DO NOTHING;
