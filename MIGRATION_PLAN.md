# Trendikon - Database Migration Plan

## 📋 Migration Özeti

Bu dokümantasyon, Trendikon veritabanı migration'larının yapısını ve sırasını açıklar.

## 🗂️ Migration Dosyaları (Sıralı)

### 1. Base Schema (20240101000000_base_schema.sql)
**Satır Sayısı:** 544  
**Amaç:** Temel veritabanı yapısını oluşturur

**İçerik:**
- UUID extension
- 15 temel tablo:
  - `profiles` - Kullanıcı profilleri (metadata JSONB ile)
  - `categories` - Ürün kategorileri (hierarchical)
  - `products` - Ürünler (marketplace için hazır)
  - `product_images` - Ürün görselleri
  - `product_variants` - Ürün varyantları
  - `addresses` - Kullanıcı adresleri
  - `carts` - Sepetler
  - `cart_items` - Sepet ürünleri
  - `orders` - Siparişler
  - `order_items` - Sipariş ürünleri
  - `payments` - Ödemeler
  - `wishlists` - Favoriler
  - `reviews` - Ürün yorumları
  - `coupons` - Kuponlar
  - `contact_messages` - İletişim mesajları

**Özellikler:**
- Temel indexler
- `updated_at` trigger
- Auto-create profile on signup
- 5 Storage bucket (products, categories, avatars, stores, documents)

**Bağımlılıklar:** Yok (ilk migration)

---

### 2. Marketplace Infrastructure (20240102000000_marketplace_infrastructure.sql)
**Satır Sayısı:** 452  
**Amaç:** Çok satıcılı marketplace sistemini ekler

**İçerik:**
- 7 marketplace tablosu:
  - `stores` - Satıcı mağazaları
  - `store_applications` - Satıcı başvuruları
  - `store_followers` - Mağaza takipçileri
  - `store_reviews` - Mağaza yorumları
  - `store_balance` - Satıcı bakiyeleri
  - `store_transactions` - Finansal işlem geçmişi
  - `withdrawal_requests` - Para çekme talepleri

**Foreign Keys:**
- `products.store_id` → `stores.id`
- `orders.primary_store_id` → `stores.id`
- `order_items.store_id` → `stores.id`

**Helper Functions:**
- `calculate_payout_date()` - 20 iş günü + sonraki Pazartesi
- `process_order_commissions()` - Komisyon ve bakiye hesaplama
- `update_store_rating()` - Mağaza rating'i otomatik güncelleme

**Bağımlılıklar:** 
- `20240101000000_base_schema.sql`

---

### 3. RLS Policies (20240103000000_rls_policies.sql)
**Satır Sayısı:** 612  
**Amaç:** Tüm tablolar için Row Level Security politikaları

**İçerik:**
- 22 tablo için RLS enable
- Helper functions:
  - `is_admin()` - Admin kontrolü
  - `owns_store(UUID)` - Mağaza sahipliği kontrolü

**Policy Tipleri:**
- Admin/Owner/Public separation
- Field-level protection (approval_status, commission_rate)
- Function-only updates (balance, transactions)
- Business rule enforcement

**Storage Policies:**
- Products, Categories, Stores: Public read, Authenticated write
- Avatars: User-specific
- Documents: Private (owner + admin)

**Bağımlılıklar:**
- `20240101000000_base_schema.sql`
- `20240102000000_marketplace_infrastructure.sql`

---

### 4. Performance Indexes (20240104000000_performance_indexes.sql)
**Satır Sayısı:** 458  
**Amaç:** Comprehensive indexler ve query optimization

**İçerik:**
- 80+ index:
  - Composite indexes (multi-column queries)
  - Filtered indexes (WHERE clause optimization)
  - Partial indexes (specific conditions)
  - Full-text search indexes (pg_trgm)

**Index Kategorileri:**
- Public listing optimization (products, stores)
- Analytics queries (order_items, transactions)
- Admin workflows (approval queues, pending requests)
- Search optimization (name, description)

**Extensions:**
- `pg_trgm` - Fuzzy text search

**Statistics:**
- ANALYZE commands for all tables

**Bağımlılıklar:**
- `20240101000000_base_schema.sql`
- `20240102000000_marketplace_infrastructure.sql`

---

### 5. Validation & Security (20240105000000_validation_and_security.sql)
**Satır Sayısı:** 628  
**Amaç:** Input validation, rate limiting, business rules

**İçerik:**
- 9 validation functions:
  - `validate_email()` - RFC email format
  - `validate_phone()` - Turkish format (+90 / 0)
  - `validate_iban()` - Turkish IBAN (TR+24 digits)
  - `validate_tc_kimlik()` - TC Kimlik No with algorithm
  - `validate_price()` - 0 to 1M TL
  - `validate_stock()` - 0 to 1M units
  - `validate_commission_rate()` - 0 to 100%
  - `sanitize_text()` - XSS prevention
  - `normalize_slug()` - URL-safe slugs

**Validation Triggers:**
- profiles, products, stores, store_applications
- withdrawal_requests, store_reviews, reviews
- addresses, contact_messages

**Rate Limiting:**
- Product creation: 50/day/store
- Withdrawal requests: 3/day/store
- Contact messages: 5/hour/email

**Business Rules:**
- Prevent duplicate applications (one pending/approved per user)
- Prevent duplicate store reviews (one per user per store)
- Prevent self-review
- Single default address per type
- Balance sufficiency check for withdrawals
- Amount limits (withdrawal: 500-50K TL)

**Bağımlılıklar:**
- `20240101000000_base_schema.sql`
- `20240102000000_marketplace_infrastructure.sql`

---

### 6. Demo Data (20240106000000_demo_data.sql)
**Satır Sayısı:** 328  
**Amaç:** Production-ready demo data

**İçerik:**
- **Trendikon** (merkezi mağaza):
  - Status: Active
  - Badge: Platinum
  - Commission: 0% (kendi ürünleri)
  
- **8 Kategori:**
  - Elektronik (Ana)
    - Telefon & Aksesuar
    - Bilgisayar & Tablet
  - Giyim (Ana)
    - Erkek Giyim
    - Kadın Giyim
  - Ev & Yaşam (Ana)
  - Spor & Outdoor (Ana)

- **6 Ürün:**
  - iPhone 15 Pro 256GB (54,999 TL)
  - MacBook Air M2 (42,999 TL)
  - AirPods Pro 2 (10,999 TL)
  - Samsung Galaxy S24 (38,999 TL)
  - Dell XPS 15 (64,999 TL)
  - Sony WH-1000XM5 (14,999 TL)

- **3 Kupon:**
  - HOSGELDIN10 (%10 indirim)
  - YILBASI500 (500 TL indirim)
  - KARGO50 (Kargo bedava)

**Bağımlılıklar:**
- Tüm önceki migration'lar

---

## 🔄 Migration Sırası ve Bağımlılıklar

```
20240101000000_base_schema.sql
    ↓
20240102000000_marketplace_infrastructure.sql
    ↓
20240103000000_rls_policies.sql
    ↓
20240104000000_performance_indexes.sql
    ↓
20240105000000_validation_and_security.sql
    ↓
20240106000000_demo_data.sql
```

## 📊 İstatistikler

| Metrik | Değer |
|--------|-------|
| **Toplam Migration** | 6 |
| **Toplam Satır** | 3,022 |
| **Toplam Tablo** | 22 |
| **Toplam Index** | 80+ |
| **Toplam Fonksiyon** | 15+ |
| **Toplam Trigger** | 20+ |
| **Toplam RLS Policy** | 60+ |

## 🛡️ Güvenlik Özellikleri

### Row Level Security (RLS)
- ✅ Tüm tablolarda enable
- ✅ Admin/Owner/Public separation
- ✅ Field-level protection
- ✅ Function-only updates (critical data)

### Input Validation
- ✅ Email, phone, IBAN validation
- ✅ TC Kimlik No algorithm check
- ✅ Price, stock, commission range checks
- ✅ XSS prevention (text sanitization)
- ✅ Slug normalization

### Rate Limiting
- ✅ Product creation (50/day)
- ✅ Withdrawal requests (3/day)
- ✅ Contact messages (5/hour)

### Business Rules
- ✅ Duplicate prevention
- ✅ Self-review prevention
- ✅ Balance sufficiency checks
- ✅ Amount limit enforcement

## ⚡ Performance Özellikleri

### Indexler
- ✅ Composite indexes (multi-column queries)
- ✅ Filtered indexes (WHERE optimization)
- ✅ Full-text search (pg_trgm)
- ✅ Analytics optimization

### Query Optimization
- ✅ Statistics collection (ANALYZE)
- ✅ Covering indexes (avoid table lookups)
- ✅ Partial indexes (specific conditions)

## 🚀 Deployment

### Supabase CLI ile Deploy

```bash
# Migration'ları deploy et
supabase db push

# Migration durumunu kontrol et
supabase migration list

# Database'i sıfırdan oluştur (development)
supabase db reset
```

### Production Deployment Checklist

- [ ] Yedek al (`supabase db dump`)
- [ ] Migration'ları test ortamında çalıştır
- [ ] RLS policy'leri test et
- [ ] Index kullanımını kontrol et (`EXPLAIN ANALYZE`)
- [ ] Validation trigger'ları test et
- [ ] Rate limiting'i test et
- [ ] Demo data'yı production'a uyarla
- [ ] Migration'ları production'a deploy et
- [ ] Post-deployment smoke test

## 📝 Migration Geçmişi

| Tarih | Migration | Açıklama |
|-------|-----------|----------|
| 2024-01-12 | Complete Rebuild | Tüm migration'lar sıfırdan oluşturuldu |
| 2024-01-12 | Migration 01 | Base schema |
| 2024-01-12 | Migration 02 | Marketplace infrastructure |
| 2024-01-12 | Migration 03 | RLS policies |
| 2024-01-12 | Migration 04 | Performance indexes |
| 2024-01-12 | Migration 05 | Validation & security |
| 2024-01-12 | Migration 06 | Demo data |

## 🔧 Bakım ve Güncelleme

### Yeni Migration Ekleme

```bash
# Yeni migration dosyası oluştur
supabase migration new <migration_name>

# Migration'ı yaz ve test et
supabase db reset

# Deploy et
supabase db push
```

### Index Kullanımını Kontrol

```sql
-- Index kullanımını göster
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Kullanılmayan indexleri bul
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

### RLS Policy Test

```sql
-- Admin olarak test
SET request.jwt.claims = '{"sub": "<admin_uuid>", "role": "super_admin"}';
SELECT * FROM stores; -- Tüm mağazaları görmeli

-- Seller olarak test
SET request.jwt.claims = '{"sub": "<seller_uuid>"}';
SELECT * FROM stores; -- Sadece kendi mağazasını görmeli

-- Public olarak test
RESET request.jwt.claims;
SELECT * FROM stores; -- Sadece active mağazaları görmeli
```

---

**Son Güncelleme:** 12 Ocak 2024  
**Durum:** ✅ Production Ready  
**Versiyon:** 1.0.0
