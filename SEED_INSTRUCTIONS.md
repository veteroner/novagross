# Seed Data Yükleme Talimatları

Demo verilerini Supabase'e yüklemek için aşağıdaki adımları izleyin:

## 1. Supabase Dashboard'a Giriş

1. https://supabase.com/dashboard adresine gidin
2. Projenizi seçin

## 2. SQL Editor'ı Açın

1. Sol menüden **SQL Editor** seçeneğine tıklayın
2. **New query** butonuna tıklayın

## 3. Seed Data'yı Çalıştırın

1. `supabase/seed-demo-data.sql` dosyasının içeriğini kopyalayın
2. SQL Editor'a yapıştırın
3. **Run** butonuna tıklayın

## Seed Data İçeriği

Bu script şunları ekler:

### Kategoriler (6 adet)
- Elektronik (124 ürün kapasitesi)
- Giyim (456 ürün kapasitesi)
- Ev & Yaşam (89 ürün kapasitesi)
- Spor (67 ürün kapasitesi)
- Kitap (234 ürün kapasitesi)
- Kozmetik (156 ürün kapasitesi)

### Ürünler (15 adet)
- **Elektronik**: iPhone 15 Pro Max, Samsung Galaxy S24 Ultra, MacBook Air M3, Samsung 65" QLED TV, Sony WH-1000XM5
- **Spor**: Nike Air Max 270, Garmin Forerunner 265
- **Ev & Yaşam**: Dyson V15 Detect, Philips Airfryer XXL
- **Giyim**: Levi's 501 Jeans, Adidas Trefoil Hoodie, Zara Slim Fit Gömlek
- **Kitap**: Suç ve Ceza, İnce Memed
- **Kozmetik**: La Roche-Posay Effaclar Duo+, CeraVe Nemlendirici

### Ürün Görselleri
Her ürün için 3 placeholder görsel (ön, yan, detay)

### Ürün Özellikleri
iPhone, Samsung S24 ve MacBook için detaylı teknik özellikler

## 4. Kontrol

SQL Editor'da aşağıdaki sorguları çalıştırarak verileri kontrol edebilirsiniz:

```sql
-- Kategori sayısı
SELECT COUNT(*) FROM categories;

-- Ürün sayısı
SELECT COUNT(*) FROM products;

-- Kategori başına ürün dağılımı
SELECT 
    c.name as kategori,
    COUNT(p.id) as urun_sayisi
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.sort_order;

-- Görsel sayısı
SELECT COUNT(*) FROM product_images;
```

Beklenen sonuçlar:
- Kategoriler: 6
- Ürünler: 15
- Görseller: 45 (her ürün için 3 görsel)
- Özellikler: 21 (3 ürün için toplam)

## Sorun Giderme

Eğer script hata verirse:

1. **Duplicate key error**: Daha önce seed data çalıştırılmış olabilir. Önce tabloları temizleyin:
   ```sql
   DELETE FROM product_images;
   DELETE FROM product_attributes;
   DELETE FROM products;
   DELETE FROM categories;
   ```

2. **Foreign key error**: Migration dosyalarının tümü çalıştırılmış olmalı. `supabase/migrations/` klasöründeki tüm dosyaları sırayla çalıştırın.

3. **Column not found**: Schema güncel değil. Tüm migration dosyalarını kontrol edin.
