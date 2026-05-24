# Trendikon - Setup Guide

## GitHub Repository Setup

Repository bulunamadı. Lütfen aşağıdaki adımları takip edin:

### 1. GitHub'da Yeni Repository Oluşturun

1. https://github.com/new adresine gidin
2. Repository name: `novastore`
3. Description: "Modern E-Commerce Platform - Next.js, React Native, Supabase"
4. **Public** veya **Private** seçin
5. **Initialize this repository with a README** seçeneğini **işaretlemeyin**
6. **Create repository** butonuna tıklayın

### 2. Yerel Projeyi GitHub'a Push Edin

Repository oluşturduktan sonra terminal'de:

```bash
cd /Volumes/LaCie/nova_store
git remote remove origin
git remote add origin https://github.com/veteroner/novastore.git
git branch -M main
git push -u origin main
```

## Supabase Setup

### 1. Supabase Project Oluşturun

1. https://supabase.com adresine gidin
2. Yeni proje oluşturun
3. Project URL ve anon key'i kopyalayın

### 2. Environment Variables

`apps/web/.env.local` dosyasını oluşturun:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# iyzico (Test)
IYZICO_API_KEY=your-iyzico-api-key
IYZICO_SECRET_KEY=your-iyzico-secret-key
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
```

### 3. Database Migration

Supabase SQL Editor'da migrations klasöründeki dosyaları sırayla çalıştırın:

```bash
supabase/migrations/20240101000000_initial_schema.sql
supabase/migrations/20240102000000_storage_policies.sql
```

### 4. Test Data (Opsiyonel)

```bash
supabase/seed.sql
```

## Installation

```bash
# Dependencies
pnpm install

# Run dev server
pnpm dev

# Web: http://localhost:3000
# Admin: http://localhost:3001
```

## Deployment

### Netlify (Web)
- Build command: `pnpm build:web`
- Publish directory: `apps/web/.next`

### Vercel (Alternative)
- Framework preset: Next.js
- Root directory: `apps/web`

## Current Status

✅ Tüm temel e-ticaret fonksiyonları çalışıyor
✅ Ödeme entegrasyonu (iyzico) tamamlandı
✅ Sipariş yönetimi aktif
✅ Kullanıcı yönetimi çalışıyor
⚠️ Supabase credentials güncellenmeli
⚠️ GitHub repository oluşturulmalı

