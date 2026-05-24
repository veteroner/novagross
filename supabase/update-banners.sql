-- Eski banner'ları sil
DELETE FROM banners;

-- Yeni banner'ları ekle
INSERT INTO banners (title, description, image_url, link_type, link_value, button_text, sort_order, is_active) VALUES
('Telefon Kılıfları & Aksesuarları', 'iPhone ve Samsung için en yeni kılıf modelleri', 'https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=1920&q=80', 'category', 'telefon-kiliflari', 'İncele', 1, true),
('Kedi Ürünleri', 'Sevimli dostlarınız için kaliteli ürünler', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1920&q=80', 'category', 'kedi-urunleri', 'İncele', 2, true),
('Ev Düzenleme & Saklama', 'Evinizi düzenleyin, hayatınızı kolaylaştırın', 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1920&q=80', 'category', 'ev-duzenleme', 'İncele', 3, true),
('Mutfak Organizasyonu', 'Mutfağınız için pratik çözümler', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1920&q=80', 'category', 'mutfak-organizasyon', 'İncele', 4, true),
('Kuş Ürünleri', 'Kuşlarınız için sağlıklı yemler', 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=1920&q=80', 'category', 'kus-urunleri', 'İncele', 5, true);
