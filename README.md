# 🛍️ Novagross - Modern E-Ticaret Platformu

<div align="center">

![Novagross](https://img.shields.io/badge/Novagross-6366f1?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

**Modern, ölçeklenebilir ve tam özellikli e-ticaret platformu**

</div>

---

## 📱 Platformlar

- **🌐 Web Uygulaması** - Next.js 14 ile responsive e-ticaret sitesi
- **⚙️ Admin Panel** - Ürün, sipariş ve kullanıcı yönetimi
- **🏪 Satıcı Paneli** - Çoklu satıcı (marketplace) yönetimi

## ✨ Özellikler

### Müşteri Özellikleri
- ✅ Kullanıcı kaydı ve girişi (Email, Google OAuth, OTP)
- ✅ Ürün arama ve filtreleme
- ✅ Kategori bazlı ürün listeleme
- ✅ Sepet yönetimi
- ✅ Favoriler
- ✅ Sipariş takibi
- ✅ Kredi kartı ile ödeme (iyzico)
- ✅ Kargo entegrasyonu (Yurtiçi Kargo)
- ✅ Kupon sistemi
- ✅ Ürün yorumları ve puanlama
- ✅ Adres defteri
- ✅ Sipariş geçmişi

### Admin Özellikleri
- ✅ Dashboard ve istatistikler
- ✅ Ürün/Kategori/Sipariş/Kullanıcı yönetimi
- ✅ Stok takibi ve raporlama
- ✅ Kupon yönetimi
- ✅ Satıcı başvuru onayları
- ✅ Marketplace komisyon yönetimi
- ✅ E-posta kampanyaları

### Satıcı Özellikleri
- ✅ Kendi mağaza panelinden ürün yönetimi
- ✅ Sipariş kabul/kargo işlemleri
- ✅ iyzico sub-merchant entegrasyonu
- ✅ Komisyon ve payout takibi

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js 18+
- pnpm 9
- Supabase hesabı (ücretsiz)

### Kurulum

```bash
# Repo'yu klonlayın
git clone https://github.com/veteroner/novagross.git
cd novagross

# Bağımlılıkları yükle
pnpm install

# Environment dosyalarını oluştur
cp .env.example .env.local
cp .env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local

# .env dosyalarını düzenleyip Supabase, iyzico ve Resend bilgilerinizi ekleyin
```

### Uygulamaları Çalıştır

```bash
# Web (localhost:3000)
pnpm dev:web

# Admin (localhost:3001)
pnpm dev:admin

# Satıcı paneli (localhost:3002)
pnpm dev:seller
```

## 📚 Dokümantasyon

- **[KURULUM.md](./KURULUM.md)** - Detaylı kurulum kılavuzu
- **[ENV_CHECKLIST.md](./ENV_CHECKLIST.md)** - Environment variables checklist
- **[SETUP.md](./SETUP.md)** - İlk kurulum adımları
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Supabase setup
- **[ADMIN_KULLANIM.md](./ADMIN_KULLANIM.md)** - Admin panel kullanım kılavuzu
- **[SATICI_PANEL_ERISIM.md](./SATICI_PANEL_ERISIM.md)** - Satıcı paneli kılavuzu

## 🛠️ Teknoloji Stack

### Frontend
- **Next.js 14** - React framework (App Router)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Zustand** - State management
- **TanStack Query** - Data fetching & caching

### Backend
- **Supabase** - Backend-as-a-Service
  - PostgreSQL - Database
  - Auth - Authentication
  - Storage - File storage
  - Realtime - Live updates
  - Row Level Security - Data güvenliği

### Entegrasyonlar
- **iyzico** - Ödeme altyapısı (marketplace + sub-merchant)
- **Resend** - E-posta servisi
- **Netgsm** - SMS servisi
- **Yurtiçi Kargo** - Kargo takibi
- **Sentry** - Error tracking

### Development
- **Turborepo** - Monorepo build system
- **pnpm** - Package manager
- **ESLint & Prettier** - Code quality

## 📁 Proje Yapısı

```
novagross/
├── apps/
│   ├── web/              # Next.js storefront (novagross.com)
│   ├── admin/            # Admin panel (admin.novagross.com)
│   └── seller/           # Satıcı paneli (seller.novagross.com)
├── packages/
│   ├── ui/               # Shared UI components
│   ├── database/         # Supabase client & types
│   └── utils/            # Utility functions
└── supabase/
    ├── migrations/       # Database migrations
    └── functions/        # Edge functions
```

## 🔧 Environment Variables

Tüm gerekli environment variables için [ENV_CHECKLIST.md](./ENV_CHECKLIST.md) dosyasına bakın.

### Minimum Gerekli Değişkenler

```env
# Supabase (Zorunlu)
NEXT_PUBLIC_SUPABASE_URL=https://yditeqzqqwqiywoaftfr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site
NEXT_PUBLIC_SITE_URL=https://novagross.com
NEXT_PUBLIC_SITE_NAME=Novagross
```

## 🚢 Deployment

### Netlify (Web & Admin & Seller)

Her uygulama ayrı bir Netlify site olarak deploy edilir:
- `novagross.com` → apps/web
- `admin.novagross.com` → apps/admin
- `seller.novagross.com` → apps/seller

Detaylı talimatlar için [DOMAIN_DEPLOYMENT_GUIDE.md](./DOMAIN_DEPLOYMENT_GUIDE.md).

## 📝 Lisans

MIT License

---

<div align="center">

**[Novagross](https://github.com/veteroner/novagross)** - Modern E-Ticaret Platformu

</div>
