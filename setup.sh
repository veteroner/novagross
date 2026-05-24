#!/bin/bash

# Novagross - Otomatik Kurulum Scripti
# Bu script projeyi otomatik olarak kurar ve yapılandırır

set -e  # Hata durumunda dur

echo "🚀 Novagross Kurulum Başlıyor..."
echo ""

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Gerekli araçları kontrol et
echo "📋 Gerekli araçlar kontrol ediliyor..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js bulunamadı. Lütfen Node.js 18+ kurun.${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  pnpm bulunamadı. Yükleniyor...${NC}"
    npm install -g pnpm
fi

echo -e "${GREEN}✅ Tüm gerekli araçlar mevcut${NC}"
echo ""

# Root bağımlılıkları yükle
echo "📦 Root bağımlılıkları yükleniyor..."
pnpm install

# Environment dosyalarını oluştur
echo ""
echo "🔧 Environment dosyaları yapılandırılıyor..."

# Root .env
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Root .env dosyası oluşturuldu${NC}"
        echo -e "${YELLOW}⚠️  Lütfen .env dosyasını düzenleyip gerekli değerleri girin${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Root .env dosyası zaten mevcut${NC}"
fi

# Web .env
if [ ! -f apps/web/.env.local ]; then
    if [ -f apps/web/.env.example ]; then
        cp apps/web/.env.example apps/web/.env.local
        echo -e "${GREEN}✅ Web .env.local dosyası oluşturuldu${NC}"
    fi
fi

# Admin .env
if [ ! -f apps/admin/.env.local ]; then
    if [ -f .env.example ]; then
        cp .env.example apps/admin/.env.local
        echo -e "${GREEN}✅ Admin .env.local dosyası oluşturuldu${NC}"
    fi
fi

# Mobile .env
if [ ! -f apps/mobile/.env ]; then
    if [ -f apps/mobile/.env.example ]; then
        cp apps/mobile/.env.example apps/mobile/.env
        echo -e "${GREEN}✅ Mobile .env dosyası oluşturuldu${NC}"
    fi
fi

echo ""
echo "🏗️  Proje build ediliyor..."
pnpm build

echo ""
echo "✨ Kurulum tamamlandı!"
echo ""
echo "📝 Sonraki adımlar:"
echo ""
echo "1. Environment dosyalarını düzenleyin:"
echo "   - .env"
echo "   - apps/web/.env.local"
echo "   - apps/admin/.env.local"
echo "   - apps/mobile/.env"
echo ""
echo "2. Supabase'i yapılandırın:"
echo "   - Supabase project oluşturun"
echo "   - Migration dosyalarını çalıştırın: cd supabase && supabase db push"
echo ""
echo "3. Uygulamaları çalıştırın:"
echo "   - Web:    pnpm --filter @novagross/web dev"
echo "   - Admin:  pnpm --filter @novagross/admin dev"
echo "   - Mobile: cd apps/mobile && pnpm ios (veya pnpm android)"
echo ""
echo -e "${GREEN}Başarılar! 🎉${NC}"
