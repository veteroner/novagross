# 🌐 Domain ve Deployment Kurulum Rehberi

## 📌 Domain Yapısı

```
trendikon.com              → Ana web sitesi (apps/web)
admin.trendikon.com        → Admin paneli (novastoreadmin repo)
```

## 🚀 Netlify Deployment

### 1️⃣ Admin Panel (https://github.com/veteroner/novastoreadmin)

**Netlify Dashboard:**
1. Site Settings → Domain Management
2. Add custom domain: `admin.trendikon.com`
3. Netlify size CNAME kaydı verecek

**Build Settings:**
```bash
Build command: npm run build
Publish directory: .next
```

**Environment Variables (Netlify):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://mdyecmjlxswprbpdtohg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_SITE_URL=https://admin.trendikon.com
NEXT_PUBLIC_ADMIN_URL=https://admin.trendikon.com
NEXT_PUBLIC_WEB_SITE_URL=https://trendikon.com

RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=bildirim@trendikon.com
RESEND_FROM_NAME=Trendikon
```

### 2️⃣ Web Sitesi (apps/web)

**Netlify Dashboard:**
1. Site Settings → Domain Management
2. Add custom domain: `trendikon.com`
3. Add `www.trendikon.com` → redirect to trendikon.com

**Build Settings:**
```bash
Base directory: apps/web
Build command: npm run build
Publish directory: apps/web/.next
```

**Environment Variables (Netlify):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://mdyecmjlxswprbpdtohg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_SITE_URL=https://trendikon.com
NEXT_PUBLIC_ADMIN_URL=https://admin.trendikon.com

IYZICO_API_KEY=your-iyzico-api-key
IYZICO_SECRET_KEY=your-iyzico-secret-key
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=Trendikon <bildirim@trendikon.com>
RESEND_FROM_NAME=Trendikon

EMAIL_QUEUE_PROCESSOR_SECRET=your-strong-random-secret
```

## 🌍 DNS Ayarları (Domain Sağlayıcınızda)

### trendikon.com için:

```
Type    Name    Value                           TTL
A       @       [Netlify IP]                    Auto
CNAME   www     trendikon.netlify.app          Auto
CNAME   admin   admin-teknovastore.netlify.app  Auto
```

**Netlify IP Adresi:** (Netlify DNS tab'inde gösterecek)
- Genellikle: `75.2.60.5` veya Netlify'nin verdiği IP

### Alternatif (Daha Kolay - Sadece CNAME):

```
Type    Name    Value                           TTL
CNAME   @       trendikon.netlify.app          Auto
CNAME   www     trendikon.netlify.app          Auto
CNAME   admin   admin-teknovastore.netlify.app  Auto
```

## 🔄 Deployment Akışı

### Admin Panel
```bash
# 1. Local değişiklikleri commit et
git add .
git commit -m "Update seller panel"
git push origin main

# 2. Netlify otomatik deploy eder
# admin.trendikon.com güncellenir
```

### Web Sitesi
```bash
# 1. Bu repo'dan deploy et
cd apps/web
npm run build

# 2. Netlify CLI ile deploy
netlify deploy --prod
```

## ✅ Test Checklist

### DNS Propagation (24-48 saat sürebilir)
```bash
# DNS kontrolü
nslookup admin.trendikon.com
nslookup trendikon.com

# veya
dig admin.trendikon.com
dig trendikon.com
```

### Site Erişimi
- [ ] https://trendikon.com açılıyor
- [ ] https://www.trendikon.com → trendikon.com redirect
- [ ] https://admin.trendikon.com açılıyor
- [ ] SSL sertifikaları aktif (🔒 yeşil kilit)

### Satıcı Akışı
- [ ] trendikon.com/satici-ol → Başvuru formu çalışıyor
- [ ] Admin panel'den başvuru görünüyor
- [ ] Onay emaili gönderiliyor
- [ ] Email'deki link → admin.trendikon.com/seller/dashboard
- [ ] Satıcı giriş yapabiliyor
- [ ] Ürün ekleyebiliyor

### Header Linkleri
- [ ] Ana sitede "Satıcı Paneli" → admin.trendikon.com (yeni sekme)
- [ ] "Satıcı Ol" → trendikon.com/satici-ol

## 🔒 Güvenlik

### CORS Ayarları (Supabase Dashboard)

```
Authentication → URL Configuration

Site URL: https://trendikon.com
Redirect URLs:
  - https://trendikon.com/**
  - https://admin.trendikon.com/**
  - http://localhost:3000/**
  - http://localhost:3001/**
```

### Netlify Headers (_headers file)

**apps/web/public/_headers:**
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## 📧 Email Configuration

### Resend Dashboard
```
Domain: trendikon.com
DNS Records (Resend verecek):
  - TXT _resend
  - CNAME resend._domainkey
```

**From Addresses:**
- bildirim@trendikon.com (transactional)
- destek@trendikon.com (support)
- seller-support@trendikon.com (seller support)

## 🐛 Troubleshooting

### "Site not found" hatası
- DNS propagation bekleniyor (48 saat)
- Netlify'da custom domain eklenmiş mi kontrol et
- DNS kayıtları doğru mu kontrol et

### Admin panele erişilemiyor
- admin.trendikon.com CNAME kaydı doğru mu?
- Netlify'da SSL certificate aktif mi?
- Environment variables set edilmiş mi?

### Email gönderilmiyor
- RESEND_API_KEY doğru mu?
- Domain verification tamamlandı mı?
- Supabase auth URL'leri güncellendi mi?

### Satıcı paneli açılmıyor
- Middleware kontrolü: is_seller=true mi?
- Supabase RLS policies aktif mi?
- Email'deki link doğru mu?

## 📞 Destek

- Netlify: https://answers.netlify.com/
- Supabase: https://supabase.com/docs
- Resend: https://resend.com/docs

## 🎯 Sonraki Adımlar

1. ✅ DNS kayıtlarını ekle
2. ✅ Netlify'da custom domain'leri ayarla
3. ✅ Environment variables'ları set et
4. ✅ Supabase auth URL'lerini güncelle
5. ✅ Resend domain verification yap
6. ✅ SSL sertifikalarını kontrol et (Netlify otomatik yapar)
7. ✅ Test et!
