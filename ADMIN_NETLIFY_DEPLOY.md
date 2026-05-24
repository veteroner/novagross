# 🚀 Trendikon Admin Panel - Netlify Deploy Rehberi

## ⚠️ ÖNEMLİ: Admin şu an YAYINDA DEĞİL!

Web sitesi: ✅ https://trendikon.netlify.app (ÇALIŞIYOR)
Admin paneli: ❌ Henüz deploy edilmedi

---

## 📋 Admin'i 5 Dakikada Yayına Al

### Adım 1: Netlify'da Yeni Site Oluştur

1. **Netlify Dashboard'a git:** https://app.netlify.com/
2. **"Add new site" → "Import an existing project"** tıkla
3. **GitHub'dan** `veteroner/novastore` repo'sunu seç
4. **Site ayarları:**
   ```
   Site name: admin-trendikon (veya istediğin isim)
   Base directory: (BOŞ BIRAK)
   Build command: pnpm install && turbo run build --filter @nova-store/admin
   Publish directory: apps/admin/.next
   ```

### Adım 2: Environment Variables Ekle

Site oluştuktan sonra **Site settings → Environment variables:**

```bash
NEXT_PUBLIC_SUPABASE_URL = https://wbgaggkncqhddbecxwap.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = [Supabase Dashboard'dan kopyala]
NODE_VERSION = 22
PNPM_VERSION = 9
```

### Adım 3: Deploy Et!

- **Deploy site** butonuna bas
- 2-3 dakika bekle
- Admin paneli hazır: `https://admin-trendikon.netlify.app`

---

## ⚡ Hızlı Yol: CLI ile Deploy

```bash
# Netlify CLI kur
npm install -g netlify-cli

# Login
netlify login

# Admin klasöründen deploy
cd apps/admin
netlify deploy --prod

# Build klasörünü seç: .next
```

---

## 🔗 Deploy Sonrası

Admin paneline erişim: **https://admin-trendikon.netlify.app**

Giriş yapmak için:
1. Supabase'de kullanıcını `profiles` tablosunda bul
2. `role` kolonunu `super_admin` yap
3. Admin paneline giriş yap

### Yöntem 2: CLI ile Deploy

```bash
# Netlify CLI kur (eğer yoksa)
npm install -g netlify-cli

# Login
netlify login

# Yeni site oluştur
netlify sites:create --name admin-teknovastore

# Environment variables ekle
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://[YOUR-PROJECT].supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your-anon-key"
netlify env:set NEXT_PUBLIC_SITE_URL "https://admin-trendikon.netlify.app"

# Manuel deploy
netlify deploy --prod --dir=apps/admin/.next
```

### Yöntem 3: Otomatik Deploy (Git Branch)

1. **Admin için yeni branch oluştur:**
   ```bash
   git checkout -b admin-deploy
   ```

2. **netlify.toml dosyasını admin için düzenle:**
   ```toml
   [build]
     base = "/"
     command = "turbo run build --filter @nova-store/admin"
     publish = "apps/admin/.next"
   ```

3. **Push et:**
   ```bash
   git push origin admin-deploy
   ```

4. **Netlify'da branch deploy ayarla:**
   - Site settings → Build & deploy → Continuous deployment
   - Branch deploys → "Let me add individual branches" → `admin-deploy`

## Önerilen Yapı

```
https://trendikon.netlify.app/        → Web (müşteri sitesi)
https://admin-trendikon.netlify.app/  → Admin panel
```

veya

```
https://trendikon.com/                → Web (domain aldıktan sonra)
https://admin.trendikon.com/          → Admin panel subdomain
```

## Hızlı Başlangıç (Önerilen)

En kolay yöntem:

1. Netlify Dashboard → "Add new site"
2. Same repository seç (nova_store)
3. Build settings:
   - Base: `/`
   - Command: `turbo run build --filter @nova-store/admin`
   - Publish: `apps/admin/.next`
4. Environment variables ekle (yukarıdaki gibi)
5. Deploy!

**Site adı:** `admin-trendikon` veya istediğin bir isim

## Not

Admin paneli için **güvenlik** önemli:
- Supabase Row Level Security (RLS) kullan
- Admin auth kontrolü ekle
- Firewall kuralları belirle (opsiyonel)
