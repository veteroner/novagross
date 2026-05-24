# Trendikon - Yapılandırma Kılavuzu

Bu doküman, Trendikon projesini sıfırdan kurmak ve çalıştırmak için gerekli adımları içerir.

## 📋 Gereksinimler

### Tüm Platformlar
- Node.js 18 veya üzeri
- pnpm (otomatik kurulacak)
- Git

### Mobil (Opsiyonel)
- iOS geliştirme için: macOS, Xcode 14+, CocoaPods
- Android geliştirme için: Android Studio, JDK 17

## 🚀 Hızlı Başlangıç

### 1. Otomatik Kurulum (Önerilen)

```bash
# Repo'yu klonlayın
git clone https://github.com/yourorg/nova-store.git
cd nova-store

# Kurulum scriptini çalıştırın
chmod +x setup.sh
./setup.sh
```

### 2. Manuel Kurulum

```bash
# 1. Bağımlılıkları yükleyin
pnpm install

# 2. Environment dosyalarını oluşturun
cp .env.example .env
cp .env.example apps/web/.env.local
cp .env.example apps/admin/.env.local
cp apps/mobile/.env.example apps/mobile/.env

# 3. Build yapın
pnpm build
```

## 🔐 Environment Yapılandırması

### Gerekli Değişkenler

Tüm `.env` dosyalarında aşağıdaki değerleri doldurmanız gerekir:

#### Supabase (Zorunlu)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Nasıl alınır:**
1. https://supabase.com adresine gidin
2. Yeni proje oluşturun
3. Settings > API > Project URL ve anon key'i kopyalayın

#### Site URL
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Deployment için production URL'ini kullanın.

### Opsiyonel Servisler

#### iyzico (Ödeme)
```env
IYZICO_API_KEY=your-api-key
IYZICO_SECRET_KEY=your-secret-key
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
```

Test için sandbox, production için `https://api.iyzipay.com` kullanın.

#### Resend (E-posta)
```env
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
CONTACT_EMAIL=info@trendikon.com
```

#### Netgsm (SMS)
```env
NETGSM_USERNAME=your-username
NETGSM_PASSWORD=your-password
```

#### Yurtiçi Kargo
```env
YURTICI_API_URL=https://ws.yurticikargo.com
YURTICI_API_USER=your-username
YURTICI_API_PASS=your-password
```

## 🗄️ Veritabanı Kurulumu

### Supabase Migration

```bash
# Supabase CLI'yi kurun (henüz yoksa)
npm install -g supabase

# Supabase'e login olun
supabase login

# Projeyi bağlayın
supabase link --project-ref your-project-ref

# Migration'ları çalıştırın
cd supabase
supabase db push
```

### Demo Veri (Opsiyonel)

```bash
# Supabase Studio'dan SQL Editor'e gidin
# seed.sql veya seed-demo-data.sql dosyasını çalıştırın
```

## 🏃‍♂️ Uygulamaları Çalıştırma

### Web Uygulaması (Next.js)

```bash
# Geliştirme
pnpm --filter @nova-store/web dev

# Production build
pnpm --filter @nova-store/web build
pnpm --filter @nova-store/web start
```

URL: http://localhost:3000

### Admin Panel (Next.js)

```bash
# Geliştirme
pnpm --filter @nova-store/admin dev

# Production build
pnpm --filter @nova-store/admin build
pnpm --filter @nova-store/admin start
```

URL: http://localhost:3001

### Mobil Uygulama (React Native)

```bash
cd apps/mobile

# iOS
pnpm ios

# Android
pnpm android
```

**Not:** İlk iOS build için CocoaPods kurulumu gerekir:
```bash
cd ios
pod install
cd ..
```

## 🔧 Yaygın Sorunlar

### pnpm bulunamadı
```bash
npm install -g pnpm
```

### Next.js build hataları
```bash
# Cache temizle
pnpm --filter @nova-store/web clean
rm -rf apps/web/.next
pnpm --filter @nova-store/web dev
```

### Supabase bağlantı hatası
- `.env` dosyasındaki `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` değerlerini kontrol edin
- Supabase projenizin aktif olduğundan emin olun

### React Native metro bundler
```bash
cd apps/mobile
pnpm start --reset-cache
```

### iOS pod install hatası
```bash
cd apps/mobile/ios
pod deintegrate
pod install
cd ../..
```

## 📦 Build & Deploy

### Vercel (Web & Admin)

```bash
# Vercel CLI
npm install -g vercel

# Deploy
vercel

# Production
vercel --prod
```

**Environment Variables:**
Vercel dashboard'dan tüm `.env` değişkenlerini ekleyin.

### Mobile App Stores

#### iOS (App Store)

1. Xcode ile `ios/NovaStore.xcworkspace` açın
2. Signing & Capabilities yapılandırın
3. Archive > Distribute

#### Android (Play Store)

1. Android Studio ile `android` klasörünü açın
2. `android/app/build.gradle` içinde signing config yapın
3. Build > Generate Signed Bundle/APK

## 🧪 Test

```bash
# Tüm testler
pnpm test

# Spesifik paket
pnpm --filter @nova-store/web test
```

## 📚 Daha Fazla Bilgi

- [PROJE_PLANI.md](./PROJE_PLANI.md) - Detaylı proje planı
- [SETUP.md](./SETUP.md) - Kurulum dokümantasyonu
- [apps/mobile/README.md](./apps/mobile/README.md) - Mobil app dökümanı
- [ADMIN_KULLANIM.md](./ADMIN_KULLANIM.md) - Admin panel kullanımı

## 🆘 Destek

Sorun yaşıyorsanız:
1. Önce bu dökümanı kontrol edin
2. GitHub Issues'da arama yapın
3. Yeni issue açın

## 📄 Lisans

MIT License - Detaylar için LICENSE dosyasına bakın
