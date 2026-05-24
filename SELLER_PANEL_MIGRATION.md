# 🏗️ Satıcı Paneli Mimarisi Değişiklikleri

## ✅ Yapılan Değişiklikler

### 1. Web Satıcı Paneli Kaldırıldı
- ❌ `/apps/web/src/app/satici/*` - Silindi
- ❌ `/apps/web/src/components/seller/*` - Silindi
- ✅ `/apps/web/src/app/(main)/satici-ol/page.tsx` - Başvuru sayfası kalıyor

### 2. Admin Panel Merkezi Satıcı Yönetimi
**Yeni Yapı:**
```
📁 apps/admin/
  ├── (dashboard)/        # Admin için (role='admin')
  └── (seller)/          # Satıcılar için (is_seller=true)
      └── seller/
          ├── dashboard/
          ├── products/
          │   ├── page.tsx        # Ürün listesi
          │   └── new/page.tsx    # YENİ - Ürün ekleme
          ├── orders/
          └── analytics/
```

### 3. Middleware Güncellemeleri
**Auth Flow:**
```typescript
// apps/admin/src/middleware.ts
1. Login kontrolü
2. Role kontrolü:
   - Admin → Tüm sayfalara erişebilir
   - Seller → Sadece /seller/* route'larına erişebilir
3. is_seller=true kontrolü
```

### 4. Email Sistemi
**Onay Emaili İçeriği:**
- ✅ Admin panel linki eklendi
- ✅ Giriş bilgileri
- ✅ İlk adımlar rehberi

```typescript
// packages/database/src/email-utils.ts
loginUrl: `${NEXT_PUBLIC_ADMIN_URL}/seller/dashboard`
```

## 🚀 Satıcı Akışı

### Başvuru Süreci
1. Kullanıcı → `trendikon.com/satici-ol` başvuru yapar
2. API → Store Application oluşturur
3. Email → Başvuru onay emaili gönderilir

### Onay Süreci
1. Admin → `admin.trendikon.com/saticilar/basvurular` gider
2. Başvuruyu inceler ve onaylar
3. Sistem:
   - ✅ `is_seller = true` yapar
   - ✅ `store` kaydı oluşturur
   - ✅ `store_balance` başlatır
   - ✅ Email ile admin panel linki gönderir

### Satıcı Giriş
1. Satıcı → Email'deki linke tıklar
2. `admin.trendikon.com/seller/dashboard` açılır
3. Supabase auth ile giriş yapar
4. Middleware → is_seller kontrolü yapar
5. ✅ Satıcı paneline erişir

## 🔐 Güvenlik

### RLS Policies
```sql
-- Sellers can only manage own products
CREATE POLICY "Sellers can insert products"
  ON products FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

-- Sellers redirected to /seller/* routes
-- Admin has full access
```

## 🌐 Environment Variables

### Web App (.env)
```bash
# Yok - artık satıcı paneli yok
```

### Admin App (.env)
```bash
NEXT_PUBLIC_ADMIN_URL=https://admin-trendikon.netlify.app
NEXT_PUBLIC_SUPABASE_URL=https://mdyecmjlxswprbpdtohg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 📝 Kullanım Talimatları

### Satıcı İçin
1. `trendikon.com/satici-ol` sayfasından başvuru yap
2. Email'deki onay mesajını bekle
3. Onaylanınca email'deki "Satıcı Paneline Git" butonuna tıkla
4. Giriş yap ve ürün eklemeye başla

### Admin İçin
1. `admin.trendikon.com` giriş yap
2. Satıcılar → Başvurular menüsüne git
3. Başvuruları incele ve onayla/reddet
4. Onaylanan satıcılar otomatik email alır

## 🎯 Avantajlar

### Güvenlik ✅
- Admin panel ayrı domain
- Web site hack'lense admin güvenli
- Farklı auth flows

### Performans ✅
- Admin işlemleri web sitesini etkilemez
- Ayrı CDN ve caching
- Daha hızlı deployment

### Kullanıcı Deneyimi ✅
- Müşteriler admin paneli görmez
- Satıcılar profesyonel panel kullanır
- Admin full kontrol

### Bakım ✅
- Tek kod tabanı (admin)
- Daha kolay güncelleme
- Daha az bug riski

## 🔄 Migration Checklist

- [x] Web satıcı paneli silindi
- [x] Admin seller routes kontrol edildi
- [x] Middleware güncellendi
- [x] Email sistemi admin panel linki içeriyor
- [x] Ürün ekleme sayfası oluşturuldu
- [x] Web navigation güncelendi
- [x] Başvuru sayfası mesajları güncellendi

## 📞 Destek

Satıcılar için: seller-support@trendikon.com
Admin için: admin@trendikon.com
