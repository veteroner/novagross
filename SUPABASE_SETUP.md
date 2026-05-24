# Supabase Marketplace Migration ve Seed Data Kurulum Kılavuzu

## 📋 Genel Bakış

Trendikon'u çok satıcılı marketplace'e dönüştürmek için 2 SQL dosyasını sırayla çalıştırmanız gerekiyor.

---

## 🗄️ Adım 1: Migration Dosyasını Çalıştırın

### Dosya Konumu
```
supabase/migrations/20240111000000_marketplace_infrastructure.sql
```

### Nasıl Çalıştırılır?

1. **Supabase Dashboard'a gidin:**
   - [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Projenizi seçin

2. **SQL Editor'ü açın:**
   - Sol menüden **SQL Editor** seçin
   - **New Query** butonuna tıklayın

3. **Migration dosyasını kopyalayın:**
   - `supabase/migrations/20240111000000_marketplace_infrastructure.sql` dosyasını açın
   - **TÜM İÇERİĞİ** kopyalayın (Cmd+A, Cmd+C)

4. **SQL Editor'a yapıştırın ve çalıştırın:**
   - SQL Editor'a yapıştırın (Cmd+V)
   - **RUN** veya **Ctrl+Enter** ile çalıştırın

### ✅ Beklenen Sonuç

Migration başarılı olursa şu mesajı göreceksiniz:
```
Success. No rows returned
NOTICE: Merkezi mağaza oluşturuldu: [UUID]
```

### 📋 Ne Oluşturuldu?

- **7 yeni tablo:**
  - `stores` - Satıcı mağazaları
  - `store_applications` - Satıcı başvuruları
  - `store_followers` - Mağaza takipçileri
  - `store_reviews` - Mağaza yorumları
  - `store_balance` - Satıcı bakiyeleri
  - `store_transactions` - Finansal işlemler
  - `withdrawal_requests` - Para çekme talepleri

- **4 tabloya yeni kolonlar:**
  - `profiles` → `is_seller`
  - `products` → `store_id`, `approval_status`, `rejection_reason`, `approved_at`, `approved_by`
  - `orders` → `primary_store_id`, `has_multiple_stores`
  - `order_items` → `store_id`, `commission_amount`, `commission_rate`, `seller_amount`

- **Trendikon** merkezi mağazası otomatik oluşturuldu

---

## 🌱 Adım 2: Seed Data Dosyasını Çalıştırın

### Dosya Konumu
```
supabase/seed-demo-data.sql
```

### Nasıl Çalıştırılır?

1. **Yeni bir SQL Query açın:**
   - SQL Editor'de **New Query**

2. **Seed dosyasını kopyalayın:**
   - `supabase/seed-demo-data.sql` dosyasını açın
   - **TÜM İÇERİĞİ** kopyalayın

3. **SQL Editor'a yapıştırın ve çalıştırın:**
   - Yapıştırın ve **RUN**

### ✅ Beklenen Sonuç

Seed data başarılı olursa şu tabloları göreceksiniz:

```
table_name   | total_count
-------------+------------
STORES       | 4
CATEGORIES   | 6  
PRODUCTS     | 15
```

ve

```
store_name    | store_status | product_count | approved_products
--------------+--------------+---------------+------------------
Trendikon     | active       | 5             | 5
TechStore     | active       | 4             | 4
FashionHub    | active       | 4             | 4
HomeLife      | active       | 2             | 2
```

### 📋 Ne Oluşturuldu?

- **6 kategori:**
  - Elektronik, Giyim, Ev & Yaşam, Spor, Kitap, Kozmetik

- **4 mağaza:**
   - **Trendikon** (Platinum Badge) - Merkezi mağaza
  - **TechStore** (Gold Badge) - Elektronik
  - **FashionHub** (Silver Badge) - Giyim
  - **HomeLife** (Bronze Badge) - Ev & Yaşam

- **15 ürün:**
  - TechStore: 4 elektronik ürün
  - FashionHub: 4 giyim/spor ürün
  - HomeLife: 2 ev ürünü
   - Trendikon: 5 çeşitli ürün

- **Her ürün için 3 görsel**

- **Mağaza bakiyeleri:**
  - TechStore: 12,500 TL available, 8,750 TL pending
  - FashionHub: 8,340 TL available, 5,230 TL pending
  - HomeLife: 6,150 TL available, 3,890 TL pending

---

## 🔍 Doğrulama

Migration ve seed data başarılı olduysa şu sorguları çalıştırarak kontrol edebilirsiniz:

### Mağazaları Kontrol Et
```sql
SELECT store_name, status, rating, total_sales, commission_rate
FROM stores
ORDER BY created_at;
```

### Ürünleri ve Mağazalarını Kontrol Et
```sql
SELECT 
  p.name as product_name,
  s.store_name,
  p.price,
  p.approval_status
FROM products p
LEFT JOIN stores s ON s.id = p.store_id
ORDER BY s.store_name, p.name;
```

### Kategori Dağılımını Kontrol Et
```sql
SELECT 
  c.name as category,
  COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.sort_order;
```

---

## ⚠️ Önemli Notlar

1. **Sıralama Önemli:**
   - Önce migration, sonra seed data çalıştırılmalı
   - Migration tekrar çalıştırılabilir (IF NOT EXISTS ile korumalı)
   - Seed data tekrar çalıştırılabilir (DELETE önce yapılıyor)

2. **Trendikon:**
   - Otomatik oluşturulan merkezi mağaza
   - Mevcut ürünler bu mağazaya bağlanacak
   - %0 komisyon oranı (platform ürünleri)

3. **Demo Kullanıcılar:**
   - Seed data içinde 3 demo satıcı kullanıcı var
   - UUID'ler: 
     - `00000000-0000-0000-0000-000000000001` (Ahmet Yılmaz - TechStore)
     - `00000000-0000-0000-0000-000000000002` (Ayşe Demir - FashionHub)
     - `00000000-0000-0000-0000-000000000003` (Mehmet Kaya - HomeLife)

4. **RLS (Row Level Security):**
   - Tüm tablolar RLS korumalı
   - Satıcılar sadece kendi verilerini görebilir
   - Admin'ler her şeyi görebilir

---

## 🐛 Sorun Giderme

### Hata: "relation 'stores' does not exist"
✅ **Çözüldü!** Migration dosyası güncellendi. Tekrar çalıştırın.

### Hata: "duplicate key value violates unique constraint"
Bu normal - seed data tekrar çalıştırıldığında oluyor. Seed data başında DELETE var, ama eğer hala hata alıyorsanız:

```sql
-- Manuel temizleme
DELETE FROM withdrawal_requests;
DELETE FROM store_transactions;
DELETE FROM store_balance;
DELETE FROM store_reviews;
DELETE FROM store_followers;
DELETE FROM product_images;
DELETE FROM products;
DELETE FROM stores WHERE store_slug != 'nova-store';
DELETE FROM categories;
```

### Hata: "column already exists"
Migration zaten çalıştırılmış demektir. Normal, tekrar çalıştırmak zararsızdır.

---

## 📊 Sonraki Adımlar

Migration ve seed data başarıyla çalıştıktan sonra:

1. **Web uygulamasını başlatın:**
   ```bash
   cd /Volumes/LaCie/nova_store
   pnpm --filter @nova-store/web dev
   ```

2. **Mağazaları görün:**
   - `/stores` sayfası (henüz oluşturulmadı - Phase 2)
   - Şimdilik Supabase Table Editor'den kontrol edebilirsiniz

3. **Admin panelinde:**
   - Yeni satıcı başvurularını onaylayabilirsiniz
   - Ürün onaylarını yönetebilirsiniz
   - Para çekme taleplerini işleyebilirsiniz

---

## 📁 Dosya Yapısı

```
supabase/
├── migrations/
│   ├── 20240101000000_initial_schema.sql       # Mevcut şema
│   ├── 20240102000000_storage_policies.sql     # Storage
│   └── 20240111000000_marketplace_infrastructure.sql  # ← YENİ (1. çalıştır)
├── seed-demo-data.sql  # ← SONRA BU (2. çalıştır)
├── seed.sql            # Eski seed (kullanma)
└── config.toml
```

---

**Hazır mısınız?** Migration ve seed data'yı şimdi çalıştırabilirsiniz! 🚀
