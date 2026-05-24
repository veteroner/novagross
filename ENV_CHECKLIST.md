# Trendikon - Environment Variables Checklist

Projenizi yapılandırırken bu checklist'i kullanarak hiçbir şeyi atlamayın.

## ✅ Zorunlu Yapılandırmalar

### 1. Supabase (Tüm Uygulamalar)

**Dosyalar:**
- [ ] `.env`
- [ ] `apps/web/.env.local`
- [ ] `apps/admin/.env.local`
- [ ] `apps/mobile/.env`

**Değişkenler:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (sadece web/admin)
```

**Nereden alınır:** 
https://supabase.com > Your Project > Settings > API

---

### 2. Site URL

**Dosyalar:**
- [ ] `.env`
- [ ] `apps/web/.env.local`
- [ ] `apps/admin/.env.local`

**Development:**
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Production:**
```env
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

---

## 🔧 Opsiyonel Yapılandırmalar

### 3. Ödeme - iyzico

**Dosyalar:**
- [ ] `apps/web/.env.local`

**Değişkenler:**
```env
IYZICO_API_KEY=your-api-key
IYZICO_SECRET_KEY=your-secret-key
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
```

**Test için:** Sandbox URL kullanın  
**Production için:** `https://api.iyzipay.com`

**Nereden alınır:** https://merchant.iyzipay.com > Settings > API Keys

---

### 4. E-posta - Resend

**Dosyalar:**
- [ ] `apps/admin/.env.local` (email service)
- [ ] `apps/web/.env.local` (email queue)

**Admin App - Email Service:**
```env
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_NAME=Trendikon
RESEND_FROM_EMAIL=bildirim@trendikon.com
RESEND_WEBHOOK_SECRET=whsec_xxxxx

# Rate limiting (optional)
EMAIL_RATE_LIMIT_HOURLY=10
EMAIL_RATE_LIMIT_DAILY=50
```

**Web App - Email Queue & Processor:**
```env
# Resend (for queue processor)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=bildirim@trendikon.com
RESEND_FROM_NAME=Trendikon

# Queue processor security (optional but recommended)
EMAIL_QUEUE_PROCESSOR_SECRET=trendikon_email_processor_secret_2026
EMAIL_QUEUE_MAX_RETRIES=5

# Site URLs for email links
NEXT_PUBLIC_ADMIN_URL=https://admin.trendikon.com
CONTACT_EMAIL=info@trendikon.com
```

**Nereden alınır:** 
- API Key: https://resend.com/api-keys
- Webhook Secret: https://resend.com/webhooks (create webhook first)
- **Important:** Verify your domain (trendikon.com) in Resend before production!

---

### 5. SMS - Netgsm

**Dosyalar:**
- [ ] `apps/web/.env.local`

**Değişkenler:**
```env
NETGSM_USERNAME=your-username
NETGSM_PASSWORD=your-password
NETGSM_HEADER=TRENDIKON
```

**Nereden alınır:** https://www.netgsm.com.tr

---

### 6. Kargo - Yurtiçi Kargo

**Dosyalar:**
- [ ] `apps/web/.env.local`

**Değişkenler:**
```env
YURTICI_API_URL=https://ws.yurticikargo.com
YURTICI_API_USER=your-username
YURTICI_API_PASS=your-password
YURTICI_CUSTOMER_CODE=your-customer-code
```

**Nereden alınır:** Yurtiçi Kargo müşteri temsilcinizden

---

### 7. Analytics - Google Analytics

**Dosyalar:**
- [ ] `apps/web/.env.local`

**Değişkenler:**
```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

**Nereden alınır:** https://analytics.google.com

---

### 8. Hata Takibi - Sentry

**Dosyalar:**
- [ ] `apps/web/.env.local`
- [ ] `apps/admin/.env.local`

**Değişkenler:**
```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

**Nereden alınır:** https://sentry.io > Project > Settings > Client Keys

---

## 🔒 Güvenlik

### 9. API Secrets

**Dosyalar:**
- [ ] `apps/web/.env.local`

**Değişkenler:**
```env
REVALIDATE_SECRET=your-random-secret-string
```

**Nasıl oluşturulur:**
```bash
openssl rand -base64 32
```

---

## 📱 Mobil App (Ekstra)

### 10. React Native Config

**Dosyalar:**
- [ ] `apps/mobile/.env`

**Değişkenler:**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
API_URL=https://api.trendikon.com
APP_NAME=Trendikon
APP_VERSION=1.0.0
BUNDLE_ID=com.novastore.mobile
```

---

## ✨ Deployment Checklist

### Vercel (Web & Admin)

- [ ] Vercel projesinde tüm environment variables eklendi
- [ ] `NEXT_PUBLIC_SITE_URL` production URL'sine güncellendi
- [ ] `IYZICO_BASE_URL` production API'sine değiştirildi
- [ ] Supabase RLS (Row Level Security) aktif
- [ ] CORS ayarları yapıldı

### Mobile App Stores

#### iOS
- [ ] Bundle ID doğru yapılandırıldı
- [ ] Signing sertifikaları eklendi
- [ ] App Store Connect'te app oluşturuldu
- [ ] Privacy policy ve terms URL'leri eklendi

#### Android
- [ ] Package name doğru yapılandırıldı
- [ ] Keystore oluşturuldu ve yapılandırıldı
- [ ] Google Play Console'da app oluşturuldu
- [ ] Privacy policy URL'i eklendi

---

## 🧪 Test Environment

Test için ayrı bir `.env.test` dosyası oluşturabilirsiniz:

```env
NODE_ENV=test
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
# ... test değerleri
```

---

## 📝 Notlar

- **Asla** `.env` dosyalarını git'e commit etmeyin!
- Production değerlerini güvenli bir yerde saklayın (1Password, etc.)
- Tüm API anahtarlarını düzenli olarak rotate edin
- Development ve production için farklı Supabase projeleri kullanın

---

## ❓ Yardım

Sorun mu yaşıyorsunuz?

1. [KURULUM.md](./KURULUM.md) - Detaylı kurulum kılavuzu
2. [SETUP.md](./SETUP.md) - Başlangıç dökümanı
3. GitHub Issues - Topluluk desteği
