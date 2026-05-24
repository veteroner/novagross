# 🛍️ Trendikon Admin Panel Kullanım Kılavuzu

## 📍 Admin Panel Erişimi

Admin panel şu adrestedir:
- **Geliştirme:** http://localhost:3001
- **Canlı:** https://admin.trendikon.com (deploy sonrası)

## 🚀 Admin Panel Başlatma

### 1. Bağımlılıkları Yükle
```bash
cd /Volumes/LaCie/nova_store
npm install
# veya
pnpm install
```

### 2. Admin Paneli Başlat
```bash
# Yöntem 1: Root klasörden
npm run dev:admin

# Yöntem 2: Admin klasöründen
cd apps/admin
npm run dev
```

Admin panel **http://localhost:3001** adresinde açılacak

## 📦 ÜRÜN NASIL EKLENİR?

### Adım 1: Admin Panele Giriş
1. Tarayıcıda http://localhost:3001 adresini aç
2. Sol menüden **"Ürünler"** sekmesine tıkla
3. Sağ üstteki **"+ Yeni Ürün"** butonuna tıkla

### Adım 2: Ürün Bilgilerini Gir

#### Temel Bilgiler
```
✅ Ürün Adı: iPhone 15 Pro Max 256GB
✅ Slug: iphone-15-pro-max-256gb (otomatik oluşur)
✅ Açıklama: Ürün hakkında detaylı açıklama
✅ Kategori: Elektronik (dropdown'dan seç)
✅ Marka: Apple
```

#### Fiyatlandırma
```
✅ Satış Fiyatı: 74999
✅ Karşılaştırma Fiyatı: 84999 (indirim göstermek için)
✅ Maliyet Fiyatı: 65000 (opsiyonel, admin için)
```

#### Stok ve SKU
```
✅ SKU: APL-IPH15PM-256
✅ Barkod: 194253912545 (opsiyonel)
✅ Stok Miktarı: 50
✅ Düşük Stok Uyarısı: 10
```

#### Görseller
```
📸 "Görsel Ekle" butonuna tıkla
📸 Birden fazla görsel yükleyebilirsiniz
📸 İlk görsel ana görsel olacak
```

#### Diğer Ayarlar
```
☑️ Aktif (Yayında göster)
☐ Öne Çıkan (Ana sayfada göster)
```

#### SEO
```
✅ Meta Başlık: iPhone 15 Pro Max 256GB - En Uygun Fiyat
✅ Meta Açıklama: iPhone 15 Pro Max'i hemen satın alın...
```

### Adım 3: Kaydet
**"Ürünü Kaydet"** butonuna tıklayın!

## 🗂️ KATEGORİ EKLEME

### Kategori Sayfasına Git
1. Sol menüden **"Kategoriler"** tıkla
2. **"+ Yeni Kategori"** butonuna tıkla

### Kategori Bilgileri
```
✅ Kategori Adı: Elektronik
✅ Slug: elektronik
✅ Açıklama: Telefon, bilgisayar, tablet...
✅ Üst Kategori: - (ana kategori için boş)
✅ İkon: 📱 (opsiyonel emoji)
```

## 📁 TOPLU ÜRÜN YÜKLEMESİ (Supabase ile)

Admin panelden tek tek yerine, toplu ürün yüklemek için:

### 1. Supabase Dashboard'a Git
https://supabase.com → Projen → SQL Editor

### 2. Örnek SQL Sorgusu

```sql
-- Önce kategori ekle
INSERT INTO categories (name, slug, is_active)
VALUES 
  ('Elektronik', 'elektronik', true),
  ('Giyim', 'giyim', true),
  ('Ev & Yaşam', 'ev-yasam', true);

-- Kategori ID'sini al (örn: uuid)
-- Ardından ürünleri ekle
INSERT INTO products (
  name, slug, description, 
  base_price, compare_price, 
  sku, stock_quantity, 
  category_id, brand,
  is_active, is_featured
)
VALUES 
  (
    'iPhone 15 Pro Max 256GB',
    'iphone-15-pro-max-256gb',
    'En yeni iPhone modeli',
    74999,
    84999,
    'APL-IPH15PM-256',
    50,
    'kategori-uuid-buraya',
    'Apple',
    true,
    true
  ),
  (
    'Samsung Galaxy S24 Ultra',
    'samsung-galaxy-s24-ultra',
    'Samsung flagshiği',
    64999,
    69999,
    'SAM-S24U-256',
    30,
    'kategori-uuid-buraya',
    'Samsung',
    true,
    false
  );
```

### 3. CSV İçe Aktarma (Gelecek Özellik)
Şu anda CSV import özelliği yok, elle eklemeniz gerekiyor.

## 🖼️ ÜRÜN GÖRSELLERİ

### Supabase Storage'a Yükleme

1. **Supabase Dashboard** → Storage → "product-images" bucket
2. Görselleri yükle
3. Public URL'i kopyala
4. Ürün eklerken görsel URL'ini yapıştır

### Veya Admin Panelden:
Admin panel görsel yükleme özelliği var, otomatik Supabase Storage'a yükler.

## 🔐 ADMIN YETKİSİ

### Admin Kullanıcı Oluşturma

```sql
-- Supabase'de admin rolü ekle
UPDATE auth.users 
SET raw_app_meta_data = 
  raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@trendikon.com';
```

## 📊 MEVCUT ADMIN ÖZELLİKLERİ

- ✅ Dashboard (satış özeti)
- ✅ Ürün Listesi
- ✅ Ürün Ekleme/Düzenleme
- ✅ Kategori Yönetimi
- ✅ Sipariş Listesi
- ⏳ Kullanıcı Yönetimi (yakında)
- ⏳ Kupon Yönetimi (yakında)
- ⏳ Raporlar (yakında)

## 🎯 HIZLI BAŞLANGIÇ - 5 DK'DA İLK ÜRÜN

```bash
# 1. Admin paneli başlat
cd /Volumes/LaCie/nova_store/apps/admin
npm run dev

# 2. Tarayıcıda aç: http://localhost:3001

# 3. Ürünler → Yeni Ürün

# 4. Formu doldur ve kaydet!
```

## 🆘 SORUN GİDERME

### "Kategori bulunamadı" hatası
→ Önce kategori eklemeniz gerekiyor

### Görsel yüklenmiyor
→ Supabase Storage bucket'ı public olmalı

### Admin panel açılmıyor
→ Port 3001 kullanımda olabilir
→ `lsof -ti:3001 | xargs kill -9` komutuyla kapatın

## 📞 YARDIM

Sorun yaşarsanız:
1. Console loglarını kontrol edin (F12)
2. Supabase bağlantısını kontrol edin
3. Environment variables'ları kontrol edin (.env.local)

---

**Not:** Admin panel şu anda local'de çalışıyor. Deploy için Vercel veya Netlify kullanabilirsiniz.
