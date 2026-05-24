# Marketing Automation & Seller Features

## 📋 Genel Bakış

Bu dokümantasyon, Trendikon'un marketing automation (pazarlama otomasyonu) ve seller marketplace (satıcı pazaryeri) özelliklerini içerir.

## ✨ Özellikler

### 1. Satıcı Başvuru Sistemi

**Dosyalar:**
- `apps/web/src/app/(main)/satici-ol/page.tsx` - Başvuru formu sayfası
- `apps/web/src/app/api/seller/apply/route.ts` - Başvuru API endpoint
- `apps/admin/src/lib/email/templates/seller/application-received.tsx` - Onay email template

**Özellikler:**
- ✅ Kapsamlı başvuru formu (mağaza bilgileri, iletişim, adres, finansal)
- ✅ Form validasyonu
- ✅ Başvuru onay sayfası
- ✅ Otomatik email bildirimleri (başvuran + admin)
- ✅ Database kaydı (`store_applications` tablosu)

**Kullanım:**
```typescript
// Başvuru formu: /satici-ol sayfası
// Kullanıcı formu doldurur
// POST /api/seller/apply → başvuru kaydedilir
// Email gönderilir (başvuran + admin)
```

**Başvuru Formu Alanları:**
- Mağaza adı ve açıklaması
- Yetkili adı, email, telefon
- İşyeri adresi (adres, ilçe, il, posta kodu)
- Vergi numarası
- Banka bilgileri (banka adı, hesap no, IBAN)

---

### 2. Abandoned Cart Recovery (Sepet Hatırlatma)

**Dosyalar:**
- `apps/admin/src/lib/email/templates/marketing/abandoned-cart.tsx` - Email template
- `apps/admin/src/app/api/marketing/abandoned-cart/route.ts` - Recovery API

**Özellikler:**
- ✅ 24+ saat eski sepetleri tespit eder
- ✅ Sepetteki ürünleri email ile hatırlatır
- ✅ Otomatik %10 indirim kodu oluşturur
- ✅ 24 saat geçerli özel kupon
- ✅ Checkout linki

**Kullanım:**
```bash
# Cron job ile günde 1-2 kez çalıştır
curl -X POST https://admin.trendikon.com/api/marketing/abandoned-cart
```

**Email İçeriği:**
- Sepetteki ürünler listesi (ürün adı, fiyat, adet)
- Toplam tutar
- Özel indirim kodu (RECOVER + random)
- Sepete dön butonu
- Avantajlar (aynı gün kargo, ücretsiz teslimat vb.)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "details": [
    {
      "userId": "user-123",
      "email": "user@example.com",
      "itemCount": 3,
      "totalAmount": 599.99
    }
  ]
}
```

---

### 3. Welcome Email Series (Hoş Geldin Email Serisi)

**Dosyalar:**
- `apps/admin/src/lib/email/templates/marketing/welcome-series.tsx` - 3 farklı email template
- `apps/admin/src/app/api/marketing/welcome-series/route.ts` - Series API

**Email Adımları:**

#### a) Welcome Email (Gün 0)
- Hoş geldin mesajı
- %15 hoş geldin indirimi (HOSGELDIN15 kodu, 7 gün geçerli)
- Platform özellikleri
- Alışverişe başla butonu

#### b) Getting Started (Gün 2)
- Platform kullanım ipuçları
- Favorilere ekleme
- Kategorileri keşfetme
- Güvenli alışveriş avantajları
- Indirim kodu hatırlatması

#### c) Tips & Tricks (Gün 7)
- Mobil uygulama tanıtımı
- Bildirim açma önerisi
- Hızlı kargo bilgisi
- Arkadaşını davet et kampanyası

**Kullanım:**
```bash
# Cron job ile günlük çalıştır
curl -X POST https://admin.trendikon.com/api/marketing/welcome-series \
  -H "Content-Type: application/json" \
  -d '{"step": "welcome"}'  # veya "getting-started", "tips"
```

**Response:**
```json
{
  "success": true,
  "count": 12,
  "details": [
    {
      "userId": "user-123",
      "email": "user@example.com",
      "step": "welcome"
    }
  ]
}
```

---

### 4. Product Recommendations (Ürün Önerileri)

**Dosyalar:**
- `apps/admin/src/lib/email/templates/marketing/product-recommendations.tsx` - Email template
- `apps/admin/src/app/api/marketing/recommendations/route.ts` - Recommendations API

**Öneri Tipleri:**

#### a) Similar Products (Benzer Ürünler)
- Kullanıcının baktığı ürüne benzer ürünler
- Aynı kategoriden seçim

#### b) Frequently Bought Together (Birlikte Alınanlar)
- İlgili ürünle birlikte sıkça alınan ürünler
- Sipariş geçmişi analizi

#### c) Trending Products (Trend Ürünler)
- En çok görüntülenen/satılan ürünler
- Popülerlik sıralaması

#### d) Personalized (Kişiselleştirilmiş)
- Kullanıcının geçmiş davranışına göre
- Browsing history, purchase history

**Kullanım:**
```bash
curl -X POST https://admin.trendikon.com/api/marketing/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "recommendationType": "personalized"
  }'

# veya benzer ürünler için:
curl -X POST https://admin.trendikon.com/api/marketing/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "recommendationType": "similar",
    "productId": "product-456"
  }'
```

**Email İçeriği:**
- 6 ürün önerisi
- Ürün görseli (placeholder)
- Ürün adı ve fiyatı
- Yıldız rating
- İndirim badge'i (rastgele)
- İncele butonu
- Tüm ürünleri görüntüle CTA

---

## 🗄️ Database Tabloları

### store_applications (Zaten mevcut)
```sql
- id (uuid)
- user_id (uuid, nullable)
- store_name (text)
- store_description (text)
- contact_name (text)
- contact_email (text)
- contact_phone (text)
- business_address (text)
- business_city (text)
- business_state (text)
- business_postal_code (text)
- tax_number (text)
- bank_name (text)
- bank_account_number (text)
- iban (text)
- status (text) - pending, approved, rejected
- created_at (timestamp)
- updated_at (timestamp)
```

### email_queue (Zaten mevcut)
```sql
- id (uuid)
- recipient (text)
- subject (text)
- template (text)
- data (jsonb)
- priority (text)
- status (text)
- scheduled_at (timestamp)
- sent_at (timestamp)
- error (text)
- created_at (timestamp)
```

---

## 🔄 Automation Workflow

### Cron Jobs (Önerilen Zamanlama)

```yaml
# Abandoned Cart Recovery
abandoned-cart:
  schedule: "0 10,18 * * *"  # Günde 2 kez (10:00, 18:00)
  endpoint: POST /api/marketing/abandoned-cart

# Welcome Email - Day 0
welcome-immediate:
  schedule: "*/15 * * * *"  # Her 15 dakika
  endpoint: POST /api/marketing/welcome-series {"step": "welcome"}

# Welcome Email - Day 2
welcome-day2:
  schedule: "0 9 * * *"  # Her gün 09:00
  endpoint: POST /api/marketing/welcome-series {"step": "getting-started"}

# Welcome Email - Day 7
welcome-day7:
  schedule: "0 10 * * *"  # Her gün 10:00
  endpoint: POST /api/marketing/welcome-series {"step": "tips"}

# Product Recommendations
recommendations:
  schedule: "0 11 * * 1,4"  # Pazartesi ve Perşembe 11:00
  endpoint: POST /api/marketing/recommendations (kullanıcı bazlı)
```

---

## 📧 Email Template Listesi

### Yeni Eklenen Templates:

1. **seller/application-received** - Satıcı başvuru onayı
2. **marketing/abandoned-cart** - Sepet hatırlatma
3. **marketing/welcome-series** - Hoş geldin serisi (3 varyant)
4. **marketing/product-recommendations** - Ürün önerileri

---

## 🚀 Deployment Checklist

### 1. Environment Variables
```bash
# .env.local (Admin)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_EMAIL=admin@trendikon.com
NEXT_PUBLIC_ADMIN_URL=https://admin.trendikon.com

# .env.local (Web)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_WEB_URL=https://trendikon.com
```

### 2. Database Migration
```bash
# store_applications tablosu zaten mevcut
# email_queue tablosu zaten mevcut
# Ek migration gerekmez
```

### 3. Resend API
```bash
# Email templates'leri Resend'e yükle (opsiyonel)
# veya React Email ile render et
```

### 4. Cron Jobs Kurulumu

**Vercel Cron (Önerilen):**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/marketing/abandoned-cart",
      "schedule": "0 10,18 * * *"
    },
    {
      "path": "/api/marketing/welcome-series?step=welcome",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/marketing/welcome-series?step=getting-started",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/marketing/welcome-series?step=tips",
      "schedule": "0 10 * * *"
    }
  ]
}
```

**GitHub Actions (Alternatif):**
```yaml
# .github/workflows/marketing-automation.yml
name: Marketing Automation
on:
  schedule:
    - cron: '0 10,18 * * *'  # Abandoned cart
    - cron: '*/15 * * * *'    # Welcome immediate
    - cron: '0 9 * * *'       # Welcome day 2
    - cron: '0 10 * * *'      # Welcome day 7
jobs:
  abandoned-cart:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Abandoned Cart
        run: |
          curl -X POST ${{ secrets.ADMIN_URL }}/api/marketing/abandoned-cart
```

---

## 🧪 Testing

### Manual Testing

```bash
# Test abandoned cart
curl -X POST http://localhost:3001/api/marketing/abandoned-cart

# Test welcome series
curl -X POST http://localhost:3001/api/marketing/welcome-series \
  -H "Content-Type: application/json" \
  -d '{"step": "welcome"}'

# Test recommendations
curl -X POST http://localhost:3001/api/marketing/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "recommendationType": "personalized"
  }'

# Test seller application
# Web sayfasından: http://localhost:3000/satici-ol
```

### Email Preview

```bash
# React Email Development
cd apps/admin
pnpm email dev

# Tarayıcıda görüntüle:
# http://localhost:3000/preview
```

---

## 📊 Analytics & Monitoring

### Email Analytics Dashboard

- URL: `/email-analytics` (Admin panel)
- Features:
  - Total emails sent/queued/failed
  - Average delivery time
  - Template performance
  - Recent emails
  - Time range filtering (24h, 7d, 30d, all)

### Metrics to Track

1. **Abandoned Cart:**
   - Recovery rate (% of users who return)
   - Revenue recovered
   - Coupon usage rate

2. **Welcome Series:**
   - Open rates per step
   - First purchase conversion
   - Time to first purchase

3. **Product Recommendations:**
   - Click-through rate
   - Conversion rate
   - Revenue per email

---

## 🔐 Security

- ✅ Service role key kullanılıyor (server-side only)
- ✅ Email validation yapılıyor
- ✅ Rate limiting önerilir (API endpoints)
- ✅ SQL injection koruması (Supabase)
- ✅ XSS koruması (React)

---

## 🐛 Troubleshooting

### Email gönderilmiyor
- Resend API key'i kontrol et
- Email queue tablosunu kontrol et (`SELECT * FROM email_queue WHERE status = 'failed'`)
- Supabase service role key'i kontrol et

### Abandoned cart bulunamıyor
- `carts` tablosunda veri var mı kontrol et
- `status = 'active'` ve `checked_out_at IS NULL` filtrelerini kontrol et
- Timestamp hesaplaması doğru mu kontrol et (24+ saat)

### Welcome email gönderilmiyor
- Yeni kayıt olan kullanıcılar var mı kontrol et
- Tarih filtreleri doğru mu kontrol et
- Email zaten gönderilmiş mi kontrol et (duplicate prevention eklenebilir)

---

## 📝 TODO & Improvements

- [ ] Email duplicate prevention (aynı email birden fazla kez gönderilmesin)
- [ ] Unsubscribe functionality (email tercihlerini kapat)
- [ ] A/B testing infrastructure
- [ ] Email template versioning
- [ ] Advanced personalization (ML-based recommendations)
- [ ] Email engagement tracking (opens, clicks)
- [ ] Seller dashboard (satıcı admin panel)
- [ ] Seller approval workflow (admin onay sistemi)

---

## 🎯 Next Steps

1. **Email Analytics Sayfasını Navigation'a Ekle**
   - Admin sidebar menu güncellemesi

2. **Satıcı Admin Paneli Geliştir**
   - `/seller/dashboard` - Seller dashboard
   - `/seller/products` - Ürün yönetimi
   - `/seller/orders` - Sipariş yönetimi
   - `/seller/analytics` - Satış analizleri

3. **Satıcı Onay Workflow'u Ekle**
   - Admin panel: `/satici-basvurulari`
   - Onaylama/reddetme işlemleri
   - Email bildirimleri

4. **Cron Jobs Kur**
   - Vercel Cron veya GitHub Actions
   - Monitoring ve alerting

5. **Email Tracking Ekle**
   - Open rate tracking
   - Click tracking
   - Conversion tracking

---

## 📞 Destek

Sorular için:
- GitHub Issues
- Email: dev@trendikon.com
- Slack: #trendikon-dev
