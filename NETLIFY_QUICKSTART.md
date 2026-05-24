# 🚀 Netlify Deployment - Hızlı Başlangıç

## 📂 Proje Yapısı

```
trendikon.com              → Bu repo (apps/web)
admin.trendikon.com        → https://github.com/veteroner/novastoreadmin
```

## ⚡ Hızlı Setup

### 1. Environment Variables'ları Görüntüle

```bash
./netlify-setup.sh
```

Bu script size:
- ✅ Admin panel env variables
- ✅ Web sitesi env variables  
- ✅ DNS kayıtları
- ✅ Yapılacaklar listesi

verecek.

### 2. Netlify'da İki Site Oluştur

#### Admin Panel
- **Repo:** https://github.com/veteroner/novastoreadmin
- **Domain:** admin.trendikon.com
- **Build:** `npm run build`
- **Publish:** `.next`

#### Web Sitesi
- **Repo:** Bu repo
- **Domain:** trendikon.com
- **Base directory:** `apps/web`
- **Build:** `npm run build`
- **Publish:** `apps/web/.next`

### 3. DNS Kayıtlarını Ekle

Domain sağlayıcınızda (GoDaddy, Namecheap, vs.):

```
CNAME   @       trendikon.netlify.app
CNAME   www     trendikon.netlify.app
CNAME   admin   admin-teknovastore.netlify.app
```

### 4. Environment Variables Ekle

Script çıktısını kopyala-yapıştır:
- Netlify Dashboard → Site Settings → Environment variables

### 5. Supabase Auth Güncelle

Supabase Dashboard → Authentication → URL Configuration:
```
Site URL: https://trendikon.com

Redirect URLs:
  - https://trendikon.com/**
  - https://admin.trendikon.com/**
```

## 📚 Detaylı Dokümantasyon

- [DOMAIN_DEPLOYMENT_GUIDE.md](./DOMAIN_DEPLOYMENT_GUIDE.md) - Tam kurulum rehberi
- [SELLER_PANEL_MIGRATION.md](./SELLER_PANEL_MIGRATION.md) - Satıcı paneli mimarisi

## ✅ Test Et

```bash
# DNS propagation kontrolü (24-48 saat sürebilir)
nslookup admin.trendikon.com
nslookup trendikon.com

# Sitelere eriş
open https://trendikon.com
open https://admin.trendikon.com
```

## 🎯 Satıcı Akışı Test

1. https://trendikon.com/satici-ol → Başvuru yap
2. https://admin.trendikon.com → Admin giriş yap
3. Satıcılar → Başvurular → Onayla
4. Email kontrol et
5. Email'deki linke tıkla
6. Ürün ekle

## 🐛 Sorun mu var?

Detaylı troubleshooting için:
- [DOMAIN_DEPLOYMENT_GUIDE.md#troubleshooting](./DOMAIN_DEPLOYMENT_GUIDE.md#-troubleshooting)

## 📞 İletişim

- GitHub Issues: Bu repo
- Admin Panel Issues: https://github.com/veteroner/novastoreadmin/issues
