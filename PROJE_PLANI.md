# Nova Store - E-Ticaret Projesi Kapsamlı Planı

## 📋 İçindekiler

1. [Proje Özeti](#1-proje-özeti)
2. [Teknoloji Stack](#2-teknoloji-stack)
3. [Veritabanı Tasarımı](#3-veritabanı-tasarımı)
4. [Backend Mimarisi (Supabase)](#4-backend-mimarisi-supabase)
5. [Web Uygulaması (Next.js)](#5-web-uygulaması-nextjs)
6. [Mobil Uygulama (React Native)](#6-mobil-uygulama-react-native)
7. [Kullanıcı Modülleri](#7-kullanıcı-modülleri)
8. [Admin Panel](#8-admin-panel)
9. [Ödeme Sistemleri](#9-ödeme-sistemleri)
10. [Kargo Entegrasyonları](#10-kargo-entegrasyonları)
11. [SEO ve Performans](#11-seo-ve-performans)
12. [Güvenlik](#12-güvenlik)
13. [Deployment](#13-deployment)
14. [Maliyet Analizi](#14-maliyet-analizi)
15. [Zaman Çizelgesi](#15-zaman-çizelgesi)

---

## 1. Proje Özeti

### 1.1 Vizyon
Nova Store, modern ve kullanıcı dostu bir e-ticaret platformu olarak tasarlanmıştır. Hem web hem de mobil platformlarda kesintisiz alışveriş deneyimi sunmayı hedefler.

### 1.2 Temel Özellikler

| Özellik | Açıklama |
|---------|----------|
| 🛒 **Çok Kanallı Satış** | Web, iOS ve Android üzerinden satış |
| 👤 **Kullanıcı Yönetimi** | Kayıt, giriş, profil yönetimi, adres defteri |
| 📦 **Ürün Yönetimi** | Kategori, varyant, stok, fiyatlandırma |
| 💳 **Ödeme** | Kredi kartı, havale, kapıda ödeme |
| 🚚 **Kargo** | Çoklu kargo entegrasyonu, takip |
| 📊 **Raporlama** | Satış, stok, müşteri analizleri |
| 🔔 **Bildirimler** | Push, e-posta, SMS bildirimleri |
| ⭐ **Değerlendirme** | Ürün yorumları ve puanlama |
| ❤️ **Favoriler** | Favori ürünler listesi |
| 🎫 **Kuponlar** | İndirim kuponu sistemi |

### 1.3 Hedef Kitle
- B2C (İşletmeden Tüketiciye) satış modeli
- Türkiye geneli müşteri tabanı
- 18-55 yaş arası online alışveriş yapan kullanıcılar

### 1.4 Proje Kapsamı

```
┌─────────────────────────────────────────────────────────────┐
│                     NOVA STORE EKOSİSTEMİ                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Web App    │  │  iOS App     │  │ Android App  │       │
│  │  (Next.js)   │  │(React Native)│  │(React Native)│       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │   Supabase  │                          │
│                    │   Backend   │                          │
│                    └──────┬──────┘                          │
│                           │                                  │
│         ┌─────────────────┼─────────────────┐               │
│         │                 │                 │                │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐        │
│  │  PostgreSQL │  │   Storage   │  │    Auth     │        │
│  │  Database   │  │   (Files)   │  │   System    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Harici Entegrasyonlar                   │    │
│  │  • Ödeme: iyzico, PayTR, Stripe                     │    │
│  │  • Kargo: Yurtiçi, Aras, MNG, PTT                   │    │
│  │  • SMS: Netgsm, İletimerkezi                        │    │
│  │  • E-posta: Resend, SendGrid                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Teknoloji Stack

### 2.1 Frontend Teknolojileri

#### Web Uygulaması
```
Framework:        Next.js 14 (App Router)
Dil:              TypeScript
Styling:          Tailwind CSS + shadcn/ui
State Management: Zustand
Form Handling:    React Hook Form + Zod
HTTP Client:      TanStack Query + Supabase Client
Animasyonlar:     Framer Motion
Icons:            Lucide React
```

#### Mobil Uygulama
```
Framework:        React Native CLI (Bare Workflow)
Dil:              TypeScript
Navigation:       React Navigation v6
Styling:          NativeWind (Tailwind for RN)
State Management: Zustand
HTTP Client:      TanStack Query + Supabase Client
Push Notifications: Firebase Cloud Messaging (FCM) + APNs
iOS:              Xcode ile App Store deployment
Android:          Android Studio ile Google Play deployment
```

### 2.2 Backend Teknolojileri (Supabase)

```
Veritabanı:       PostgreSQL 15
Authentication:   Supabase Auth (Email, Google, Apple)
Storage:          Supabase Storage (Ürün görselleri)
Realtime:         Supabase Realtime (Canlı bildirimler)
Edge Functions:   Deno (Serverless functions)
Row Level Security: Aktif (Veri güvenliği)
```

### 2.3 Üçüncü Parti Servisler

| Kategori | Servis | Kullanım Amacı |
|----------|--------|----------------|
| Hosting (Web) | Vercel | Next.js deployment, Edge functions |
| Ödeme | iyzico | Türkiye'de kredi kartı ödemeleri |
| Ödeme (Yedek) | PayTR | Alternatif ödeme altyapısı |
| Kargo | Yurtiçi Kargo API | Kargo takibi, etiket oluşturma |
| Kargo | Aras Kargo API | Alternatif kargo seçeneği |
| SMS | Netgsm | OTP, sipariş bildirimleri |
| E-posta | Resend | Transactional e-postalar |
| Analytics | Google Analytics 4 | Kullanıcı davranış analizi |
| Error Tracking | Sentry | Hata izleme ve raporlama |
| CDN | Cloudflare | Görsel optimizasyonu, güvenlik |

### 2.4 Geliştirme Araçları

```
Paket Yöneticisi: pnpm (Monorepo)
Monorepo:         Turborepo
Linting:          ESLint + Prettier
Git Hooks:        Husky + lint-staged
Testing:          Vitest + Testing Library
E2E Testing:      Playwright
CI/CD:            GitHub Actions
```

### 2.5 Proje Yapısı (Monorepo)

```
nova-store/
├── apps/
│   ├── web/                    # Next.js web uygulaması
│   │   ├── app/                # App Router sayfaları
│   │   ├── components/         # UI bileşenleri
│   │   ├── lib/                # Utility fonksiyonlar
│   │   └── styles/             # Global stiller
│   │
│   ├── mobile/                 # React Native CLI uygulaması
│   │   ├── src/                # Kaynak kodları
│   │   ├── components/         # Mobil UI bileşenleri
│   │   └── utils/              # Yardımcı fonksiyonlar
│   │
│   └── admin/                  # Admin panel (Next.js)
│       ├── app/                # Admin sayfaları
│       └── components/         # Admin UI bileşenleri
│
├── packages/
│   ├── ui/                     # Paylaşılan UI bileşenleri
│   ├── database/               # Supabase client & tipler
│   ├── config/                 # Paylaşılan konfigürasyonlar
│   └── utils/                  # Ortak utility fonksiyonlar
│
├── supabase/
│   ├── migrations/             # Veritabanı migrasyonları
│   ├── functions/              # Edge Functions
│   └── seed.sql                # Test verileri
│
├── turbo.json                  # Turborepo config
├── package.json                # Root package.json
└── pnpm-workspace.yaml         # Workspace config
```

---

## 3. Veritabanı Tasarımı

### 3.1 ER Diyagramı (Entity Relationship)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │    profiles     │       │   addresses     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──────▶│ id (PK, FK)     │◀──────│ id (PK)         │
│ email           │       │ first_name      │       │ user_id (FK)    │
│ created_at      │       │ last_name       │       │ title           │
│ ...             │       │ phone           │       │ full_address    │
└─────────────────┘       │ avatar_url      │       │ city            │
                          │ birth_date      │       │ district        │
                          └─────────────────┘       │ postal_code     │
                                                    │ is_default      │
                                                    └─────────────────┘
                                    │
                                    │
                          ┌─────────▼─────────┐
                          │      orders       │
                          ├───────────────────┤
                          │ id (PK)           │
                          │ user_id (FK)      │──────────────────────┐
                          │ order_number      │                      │
                          │ status            │                      │
                          │ total_amount      │                      │
                          │ shipping_address  │                      │
                          │ billing_address   │                      │
                          │ payment_method    │                      │
                          │ shipping_method   │                      │
                          │ notes             │                      │
                          │ created_at        │                      │
                          └─────────┬─────────┘                      │
                                    │                                │
                          ┌─────────▼─────────┐                      │
                          │   order_items     │                      │
                          ├───────────────────┤                      │
                          │ id (PK)           │                      │
                          │ order_id (FK)     │                      │
                          │ product_id (FK)   │─────┐                │
                          │ variant_id (FK)   │     │                │
                          │ quantity          │     │                │
                          │ unit_price        │     │                │
                          │ total_price       │     │                │
                          └───────────────────┘     │                │
                                                    │                │
┌─────────────────┐       ┌─────────────────┐      │                │
│   categories    │       │    products     │◀─────┘                │
├─────────────────┤       ├─────────────────┤                       │
│ id (PK)         │◀──────│ id (PK)         │                       │
│ name            │       │ category_id(FK) │                       │
│ slug            │       │ name            │                       │
│ description     │       │ slug            │                       │
│ image_url       │       │ description     │                       │
│ parent_id (FK)  │───┐   │ base_price      │                       │
│ sort_order      │   │   │ compare_price   │                       │
│ is_active       │   │   │ sku             │                       │
└─────────────────┘   │   │ is_active       │                       │
         ▲            │   │ is_featured     │                       │
         └────────────┘   │ meta_title      │                       │
                          │ meta_description│                       │
                          └────────┬────────┘                       │
                                   │                                │
              ┌────────────────────┼────────────────────┐           │
              │                    │                    │           │
    ┌─────────▼─────────┐ ┌───────▼───────┐ ┌─────────▼─────────┐  │
    │ product_variants  │ │product_images │ │   product_tags    │  │
    ├───────────────────┤ ├───────────────┤ ├───────────────────┤  │
    │ id (PK)           │ │ id (PK)       │ │ id (PK)           │  │
    │ product_id (FK)   │ │ product_id(FK)│ │ product_id (FK)   │  │
    │ name              │ │ image_url     │ │ tag_id (FK)       │──┼──┐
    │ sku               │ │ alt_text      │ └───────────────────┘  │  │
    │ price             │ │ sort_order    │                        │  │
    │ stock_quantity    │ │ is_primary    │ ┌───────────────────┐  │  │
    │ attributes (JSON) │ └───────────────┘ │      tags         │  │  │
    │ is_active         │                   ├───────────────────┤  │  │
    └───────────────────┘                   │ id (PK)           │◀─┼──┘
                                            │ name              │  │
    ┌───────────────────┐                   │ slug              │  │
    │     reviews       │                   └───────────────────┘  │
    ├───────────────────┤                                          │
    │ id (PK)           │                   ┌───────────────────┐  │
    │ product_id (FK)   │                   │    favorites      │  │
    │ user_id (FK)      │───────────────────├───────────────────┤  │
    │ rating            │                   │ id (PK)           │  │
    │ title             │                   │ user_id (FK)      │◀─┘
    │ comment           │                   │ product_id (FK)   │
    │ is_approved       │                   │ created_at        │
    │ created_at        │                   └───────────────────┘
    └───────────────────┘
                          
    ┌───────────────────┐       ┌───────────────────┐
    │      carts        │       │    cart_items     │
    ├───────────────────┤       ├───────────────────┤
    │ id (PK)           │◀──────│ id (PK)           │
    │ user_id (FK)      │       │ cart_id (FK)      │
    │ session_id        │       │ product_id (FK)   │
    │ created_at        │       │ variant_id (FK)   │
    │ updated_at        │       │ quantity          │
    └───────────────────┘       └───────────────────┘

    ┌───────────────────┐       ┌───────────────────┐
    │     coupons       │       │  coupon_usages    │
    ├───────────────────┤       ├───────────────────┤
    │ id (PK)           │◀──────│ id (PK)           │
    │ code              │       │ coupon_id (FK)    │
    │ type              │       │ user_id (FK)      │
    │ value             │       │ order_id (FK)     │
    │ min_order_amount  │       │ used_at           │
    │ max_uses          │       └───────────────────┘
    │ uses_per_user     │
    │ starts_at         │
    │ expires_at        │
    │ is_active         │
    └───────────────────┘
```

### 3.2 Tablo Detayları

#### 3.2.1 Kullanıcı Tabloları

```sql
-- Profil tablosu (Supabase Auth users tablosunu genişletir)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url TEXT,
    birth_date DATE,
    gender VARCHAR(10),
    newsletter_subscribed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adres tablosu
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(50) NOT NULL,           -- "Ev", "İş" vb.
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    neighborhood VARCHAR(100),
    full_address TEXT NOT NULL,
    postal_code VARCHAR(10),
    is_default BOOLEAN DEFAULT false,
    address_type VARCHAR(20) DEFAULT 'both', -- 'shipping', 'billing', 'both'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.2.2 Ürün Tabloları

```sql
-- Kategoriler (Hiyerarşik)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    meta_title VARCHAR(200),
    meta_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ürünler
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    base_price DECIMAL(10,2) NOT NULL,
    compare_price DECIMAL(10,2),           -- İndirimli fiyat için karşılaştırma
    cost_price DECIMAL(10,2),              -- Maliyet (admin için)
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100),
    weight DECIMAL(10,3),                  -- kg cinsinden
    dimensions JSONB,                      -- {"length": 10, "width": 5, "height": 3}
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    requires_shipping BOOLEAN DEFAULT true,
    tax_class VARCHAR(50) DEFAULT 'standard',
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    allow_backorder BOOLEAN DEFAULT false,
    meta_title VARCHAR(200),
    meta_description TEXT,
    view_count INTEGER DEFAULT 0,
    sold_count INTEGER DEFAULT 0,
    avg_rating DECIMAL(2,1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ürün Varyantları (Beden, Renk vb.)
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,            -- "Kırmızı - XL"
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    price DECIMAL(10,2),                   -- null ise base_price kullanılır
    compare_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    weight DECIMAL(10,3),
    attributes JSONB NOT NULL,             -- {"color": "red", "size": "XL"}
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ürün Görselleri
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    alt_text VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ürün Özellikleri (Spesifikasyonlar)
CREATE TABLE product_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    attribute_name VARCHAR(100) NOT NULL,  -- "Malzeme", "Garanti Süresi"
    attribute_value TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);
```

#### 3.2.3 Sipariş Tabloları

```sql
-- Sipariş durumları enum
CREATE TYPE order_status AS ENUM (
    'pending',           -- Beklemede
    'confirmed',         -- Onaylandı
    'processing',        -- Hazırlanıyor
    'shipped',           -- Kargoya verildi
    'delivered',         -- Teslim edildi
    'cancelled',         -- İptal edildi
    'refunded',          -- İade edildi
    'partially_refunded' -- Kısmi iade
);

-- Ödeme durumları enum
CREATE TYPE payment_status AS ENUM (
    'pending',           -- Beklemede
    'paid',              -- Ödendi
    'failed',            -- Başarısız
    'refunded',          -- İade edildi
    'partially_refunded' -- Kısmi iade
);

-- Siparişler
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    status order_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    
    -- Fiyatlandırma
    subtotal DECIMAL(10,2) NOT NULL,       -- Ara toplam
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Kupon
    coupon_id UUID REFERENCES coupons(id),
    coupon_code VARCHAR(50),
    
    -- Adresler (JSON olarak saklanır - değişebilirlik için)
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    
    -- Ödeme bilgileri
    payment_method VARCHAR(50) NOT NULL,   -- 'credit_card', 'bank_transfer', 'cash_on_delivery'
    payment_provider VARCHAR(50),          -- 'iyzico', 'paytr'
    payment_id VARCHAR(100),               -- Ödeme sağlayıcı referans no
    
    -- Kargo bilgileri
    shipping_method VARCHAR(50),           -- 'yurtici', 'aras', 'mng'
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Diğer
    notes TEXT,                            -- Müşteri notu
    admin_notes TEXT,                      -- Admin notu
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sipariş kalemleri
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    
    -- Sipariş anındaki bilgiler (ürün değişse bile sabit kalır)
    product_name VARCHAR(255) NOT NULL,
    variant_name VARCHAR(100),
    sku VARCHAR(100),
    image_url TEXT,
    
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    
    -- İade durumu
    refunded_quantity INTEGER DEFAULT 0,
    refunded_amount DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sipariş geçmişi (durum değişiklikleri)
CREATE TABLE order_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    status order_status NOT NULL,
    note TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.2.4 Sepet Tabloları

```sql
-- Sepetler
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_id VARCHAR(100),               -- Misafir kullanıcılar için
    coupon_id UUID REFERENCES coupons(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT cart_user_or_session CHECK (
        (user_id IS NOT NULL AND session_id IS NULL) OR
        (user_id IS NULL AND session_id IS NOT NULL)
    )
);

-- Sepet öğeleri
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(cart_id, product_id, variant_id)
);
```

---

## 4. Backend Mimarisi (Supabase)

### 4.1 Supabase Proje Yapılandırması

#### 4.1.1 Ortam Değişkenleri

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Ödeme
IYZICO_API_KEY=sandbox-xxxxx
IYZICO_SECRET_KEY=sandbox-xxxxx
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com

# Kargo
YURTICI_API_USER=xxxxx
YURTICI_API_PASS=xxxxx
YURTICI_API_URL=https://ws.yurticikargo.com

# SMS
NETGSM_USERNAME=xxxxx
NETGSM_PASSWORD=xxxxx
NETGSM_HEADER=NOVASTORE

# Email
RESEND_API_KEY=re_xxxxx
```

### 4.2 Row Level Security (RLS) Politikaları

```sql
-- Profiller için RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi profillerini görebilir/düzenleyebilir
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Adresler için RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own addresses"
    ON addresses FOR ALL
    USING (auth.uid() = user_id);

-- Siparişler için RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
    ON orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Ürünler - Herkes görebilir
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
    ON products FOR SELECT
    USING (is_active = true);

-- Yorumlar için RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews"
    ON reviews FOR SELECT
    USING (is_approved = true);

CREATE POLICY "Users can create reviews"
    ON reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
    ON reviews FOR UPDATE
    USING (auth.uid() = user_id);

-- Favoriler için RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorites"
    ON favorites FOR ALL
    USING (auth.uid() = user_id);

-- Sepet için RLS
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cart"
    ON carts FOR ALL
    USING (auth.uid() = user_id OR session_id = current_setting('app.session_id', true));
```

### 4.3 Database Functions (Stored Procedures)

```sql
-- Sipariş numarası oluşturma
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    year_prefix TEXT;
    sequence_num INTEGER;
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 3) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM orders
    WHERE order_number LIKE year_prefix || '%';
    
    new_number := year_prefix || LPAD(sequence_num::TEXT, 8, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Stok güncelleme (sipariş sonrası)
CREATE OR REPLACE FUNCTION update_stock_after_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Varyant varsa varyant stokunu düşür
    IF NEW.variant_id IS NOT NULL THEN
        UPDATE product_variants
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.variant_id;
    ELSE
        -- Yoksa ana ürün stokunu düşür
        UPDATE products
        SET stock_quantity = stock_quantity - NEW.quantity,
            sold_count = sold_count + NEW.quantity
        WHERE id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_after_order();

-- Ürün puanı güncelleme
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET 
        avg_rating = (
            SELECT ROUND(AVG(rating)::numeric, 1)
            FROM reviews
            WHERE product_id = NEW.product_id AND is_approved = true
        ),
        review_count = (
            SELECT COUNT(*)
            FROM reviews
            WHERE product_id = NEW.product_id AND is_approved = true
        )
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rating
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW
    WHEN (NEW.is_approved = true)
    EXECUTE FUNCTION update_product_rating();

-- Sepeti siparişe dönüştürme
CREATE OR REPLACE FUNCTION convert_cart_to_order(
    p_cart_id UUID,
    p_shipping_address JSONB,
    p_billing_address JSONB,
    p_payment_method TEXT,
    p_shipping_method TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_user_id UUID;
    v_subtotal DECIMAL(10,2);
    v_shipping_cost DECIMAL(10,2);
    v_discount DECIMAL(10,2) := 0;
    v_coupon_id UUID;
    v_cart_item RECORD;
BEGIN
    -- Sepet bilgilerini al
    SELECT user_id, coupon_id INTO v_user_id, v_coupon_id
    FROM carts WHERE id = p_cart_id;
    
    -- Ara toplamı hesapla
    SELECT SUM(
        COALESCE(pv.price, p.base_price) * ci.quantity
    ) INTO v_subtotal
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN product_variants pv ON pv.id = ci.variant_id
    WHERE ci.cart_id = p_cart_id;
    
    -- Kargo ücretini belirle
    v_shipping_cost := CASE 
        WHEN v_subtotal >= 500 THEN 0 
        ELSE 29.90 
    END;
    
    -- Kupon indirimi hesapla
    IF v_coupon_id IS NOT NULL THEN
        SELECT CASE 
            WHEN c.type = 'percentage' THEN v_subtotal * c.value / 100
            WHEN c.type = 'fixed' THEN c.value
            ELSE 0
        END INTO v_discount
        FROM coupons c WHERE c.id = v_coupon_id;
    END IF;
    
    -- Sipariş oluştur
    INSERT INTO orders (
        user_id, order_number, status, payment_status,
        subtotal, shipping_cost, discount_amount, total_amount,
        shipping_address, billing_address,
        payment_method, shipping_method, coupon_id, notes
    ) VALUES (
        v_user_id, generate_order_number(), 'pending', 'pending',
        v_subtotal, v_shipping_cost, v_discount, 
        v_subtotal + v_shipping_cost - v_discount,
        p_shipping_address, p_billing_address,
        p_payment_method, p_shipping_method, v_coupon_id, p_notes
    ) RETURNING id INTO v_order_id;
    
    -- Sepet öğelerini sipariş kalemlerine aktar
    FOR v_cart_item IN
        SELECT 
            ci.product_id, ci.variant_id, ci.quantity,
            p.name as product_name, pv.name as variant_name,
            COALESCE(pv.sku, p.sku) as sku,
            (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image_url,
            COALESCE(pv.price, p.base_price) as unit_price
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        LEFT JOIN product_variants pv ON pv.id = ci.variant_id
        WHERE ci.cart_id = p_cart_id
    LOOP
        INSERT INTO order_items (
            order_id, product_id, variant_id,
            product_name, variant_name, sku, image_url,
            quantity, unit_price, total_price
        ) VALUES (
            v_order_id, v_cart_item.product_id, v_cart_item.variant_id,
            v_cart_item.product_name, v_cart_item.variant_name,
            v_cart_item.sku, v_cart_item.image_url,
            v_cart_item.quantity, v_cart_item.unit_price,
            v_cart_item.unit_price * v_cart_item.quantity
        );
    END LOOP;
    
    -- Sepeti temizle
    DELETE FROM cart_items WHERE cart_id = p_cart_id;
    DELETE FROM carts WHERE id = p_cart_id;
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;
```

### 4.4 Edge Functions

#### 4.4.1 Ödeme İşleme (iyzico)

```typescript
// supabase/functions/process-payment/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Iyzipay from 'https://esm.sh/iyzipay'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, cardToken, installment } = await req.json()

    // Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Sipariş bilgilerini al
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', orderId)
      .single()

    if (orderError) throw orderError

    // iyzico payment request
    const iyzipay = new Iyzipay({
      apiKey: Deno.env.get('IYZICO_API_KEY'),
      secretKey: Deno.env.get('IYZICO_SECRET_KEY'),
      uri: Deno.env.get('IYZICO_BASE_URL')
    })

    const paymentRequest = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: order.order_number,
      price: order.total_amount.toString(),
      paidPrice: order.total_amount.toString(),
      currency: Iyzipay.CURRENCY.TRY,
      installment: installment || 1,
      paymentCard: {
        cardToken: cardToken,
        cardUserKey: order.user_id
      },
      buyer: {
        id: order.user_id,
        name: order.shipping_address.first_name,
        surname: order.shipping_address.last_name,
        email: order.shipping_address.email,
        identityNumber: '11111111111',
        registrationAddress: order.shipping_address.full_address,
        city: order.shipping_address.city,
        country: 'Turkey'
      },
      shippingAddress: {
        contactName: `${order.shipping_address.first_name} ${order.shipping_address.last_name}`,
        city: order.shipping_address.city,
        country: 'Turkey',
        address: order.shipping_address.full_address
      },
      billingAddress: {
        contactName: `${order.billing_address.first_name} ${order.billing_address.last_name}`,
        city: order.billing_address.city,
        country: 'Turkey',
        address: order.billing_address.full_address
      },
      basketItems: order.order_items.map((item: any, index: number) => ({
        id: item.id,
        name: item.product_name,
        category1: 'Genel',
        itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
        price: item.total_price.toString()
      }))
    }

    // Ödeme yap
    const result = await new Promise((resolve, reject) => {
      iyzipay.payment.create(paymentRequest, (err: any, result: any) => {
        if (err) reject(err)
        else resolve(result)
      })
    })

    // Sonucu işle
    if ((result as any).status === 'success') {
      // Siparişi güncelle
      await supabaseClient
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'confirmed',
          payment_id: (result as any).paymentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      return new Response(
        JSON.stringify({ success: true, paymentId: (result as any).paymentId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error((result as any).errorMessage)
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

#### 4.4.2 E-posta Gönderimi

```typescript
// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from 'https://esm.sh/resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, template, data } = await req.json()

    let subject = ''
    let html = ''

    switch (template) {
      case 'order_confirmation':
        subject = `Siparişiniz Alındı - #${data.orderNumber}`
        html = generateOrderConfirmationEmail(data)
        break
      case 'order_shipped':
        subject = `Siparişiniz Kargoya Verildi - #${data.orderNumber}`
        html = generateShippedEmail(data)
        break
      case 'welcome':
        subject = 'Nova Store\'a Hoş Geldiniz!'
        html = generateWelcomeEmail(data)
        break
      case 'password_reset':
        subject = 'Şifre Sıfırlama Talebi'
        html = generatePasswordResetEmail(data)
        break
    }

    const result = await resend.emails.send({
      from: 'Nova Store <noreply@novastore.com>',
      to: [to],
      subject,
      html
    })

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateOrderConfirmationEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .order-details { background: #f5f5f5; padding: 15px; margin: 20px 0; }
        .item { border-bottom: 1px solid #ddd; padding: 10px 0; }
        .total { font-weight: bold; font-size: 18px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Siparişiniz Alındı!</h1>
        </div>
        <div class="content">
          <p>Merhaba ${data.customerName},</p>
          <p>Siparişiniz başarıyla oluşturuldu. Sipariş detaylarınız aşağıdadır:</p>
          
          <div class="order-details">
            <p><strong>Sipariş No:</strong> #${data.orderNumber}</p>
            <p><strong>Tarih:</strong> ${data.orderDate}</p>
          </div>
          
          <h3>Sipariş Kalemleri</h3>
          ${data.items.map((item: any) => `
            <div class="item">
              <p><strong>${item.name}</strong> x ${item.quantity}</p>
              <p>${item.price} TL</p>
            </div>
          `).join('')}
          
          <div class="order-details">
            <p>Ara Toplam: ${data.subtotal} TL</p>
            <p>Kargo: ${data.shipping} TL</p>
            ${data.discount > 0 ? `<p>İndirim: -${data.discount} TL</p>` : ''}
            <p class="total">Toplam: ${data.total} TL</p>
          </div>
          
          <p>Siparişinizi hesabınızdan takip edebilirsiniz.</p>
        </div>
        <div class="footer">
          <p>Bu e-posta Nova Store tarafından gönderilmiştir.</p>
        </div>
      </div>
    </body>
    </html>
  `
}
```

### 4.5 Realtime Subscriptions

```typescript
// Realtime kullanım örnekleri

// Sipariş durumu takibi
const subscribeToOrderUpdates = (orderId: string, callback: (status: string) => void) => {
  return supabase
    .channel(`order-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      },
      (payload) => {
        callback(payload.new.status)
      }
    )
    .subscribe()
}

// Stok değişikliği bildirimi (Admin için)
const subscribeToLowStock = (callback: (product: any) => void) => {
  return supabase
    .channel('low-stock')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
        filter: 'stock_quantity=lte.low_stock_threshold'
      },
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe()
}

// Yeni sipariş bildirimi (Admin için)
const subscribeToNewOrders = (callback: (order: any) => void) => {
  return supabase
    .channel('new-orders')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders'
      },
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe()
}
```

### 4.6 Storage Bucket Yapılandırması

```sql
-- Storage buckets oluşturma
INSERT INTO storage.buckets (id, name, public) VALUES
  ('products', 'products', true),      -- Ürün görselleri (public)
  ('avatars', 'avatars', true),        -- Profil fotoğrafları (public)
  ('categories', 'categories', true),   -- Kategori görselleri (public)
  ('invoices', 'invoices', false);      -- Faturalar (private)

-- Storage politikaları
-- Ürün görselleri - herkes okuyabilir
CREATE POLICY "Public product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

-- Admin ürün görseli yükleyebilir
CREATE POLICY "Admin can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'products' AND
    auth.jwt() ->> 'role' = 'admin'
  );

-- Kullanıcılar kendi avatarını yükleyebilir
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 5. Web Uygulaması (Next.js)

### 5.1 Proje Kurulumu

```bash
# Monorepo kurulumu
pnpm create turbo@latest nova-store --example with-tailwind

# Web uygulaması bağımlılıkları
cd apps/web
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add @tanstack/react-query zustand
pnpm add react-hook-form @hookform/resolvers zod
pnpm add framer-motion lucide-react
pnpm add -D @types/node
```

### 5.2 Sayfa Yapısı (App Router)

```
apps/web/app/
├── (auth)/                         # Auth layout grubu
│   ├── giris/                      # /giris
│   │   └── page.tsx
│   ├── kayit/                      # /kayit
│   │   └── page.tsx
│   ├── sifremi-unuttum/            # /sifremi-unuttum
│   │   └── page.tsx
│   └── layout.tsx                  # Auth layout
│
├── (shop)/                         # Mağaza layout grubu
│   ├── page.tsx                    # Ana sayfa
│   ├── urunler/                    # /urunler
│   │   ├── page.tsx                # Ürün listesi
│   │   └── [slug]/                 # /urunler/[slug]
│   │       └── page.tsx            # Ürün detay
│   ├── kategori/                   # /kategori
│   │   └── [slug]/                 # /kategori/[slug]
│   │       └── page.tsx
│   ├── arama/                      # /arama
│   │   └── page.tsx
│   ├── sepet/                      # /sepet
│   │   └── page.tsx
│   ├── odeme/                      # /odeme
│   │   ├── page.tsx                # Checkout
│   │   └── basarili/               # /odeme/basarili
│   │       └── page.tsx
│   └── layout.tsx                  # Shop layout (header, footer)
│
├── (account)/                      # Hesap layout grubu
│   ├── hesabim/                    # /hesabim
│   │   ├── page.tsx                # Dashboard
│   │   ├── siparislerim/           # /hesabim/siparislerim
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── adreslerim/             # /hesabim/adreslerim
│   │   │   └── page.tsx
│   │   ├── favorilerim/            # /hesabim/favorilerim
│   │   │   └── page.tsx
│   │   ├── degerlendirmelerim/     # /hesabim/degerlendirmelerim
│   │   │   └── page.tsx
│   │   └── ayarlar/                # /hesabim/ayarlar
│   │       └── page.tsx
│   └── layout.tsx                  # Account layout (sidebar)
│
├── (static)/                       # Statik sayfalar
│   ├── hakkimizda/
│   │   └── page.tsx
│   ├── iletisim/
│   │   └── page.tsx
│   ├── gizlilik-politikasi/
│   │   └── page.tsx
│   ├── kullanim-kosullari/
│   │   └── page.tsx
│   ├── iade-politikasi/
│   │   └── page.tsx
│   └── sss/
│       └── page.tsx
│
├── api/                            # API Routes
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts
│   ├── payment/
│   │   ├── create/
│   │   │   └── route.ts
│   │   └── webhook/
│   │       └── route.ts
│   └── revalidate/
│       └── route.ts
│
├── sitemap.ts                      # Dinamik sitemap
├── robots.ts                       # robots.txt
├── layout.tsx                      # Root layout
├── loading.tsx                     # Global loading
├── error.tsx                       # Global error
└── not-found.tsx                   # 404 sayfası
```

### 5.3 Temel Bileşenler

#### 5.3.1 Layout Bileşenleri

```typescript
// components/layout/Header.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ShoppingCart, Heart, User, Menu, X } from 'lucide-react'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const { items } = useCartStore()
  const { user, isAuthenticated } = useAuthStore()

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/arama?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Üst Bar */}
      <div className="bg-gray-900 text-white text-sm py-2">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <span>🚚 500 TL üzeri siparişlerde ücretsiz kargo!</span>
          <div className="flex gap-4">
            <Link href="/iletisim">Yardım</Link>
            <Link href="/siparis-takip">Sipariş Takip</Link>
          </div>
        </div>
      </div>

      {/* Ana Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-primary">
            Nova Store
          </Link>

          {/* Arama */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:flex">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Ürün ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <Search className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </form>

          {/* Sağ İkonlar */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/hesabim" className="flex items-center gap-2">
                <User className="w-6 h-6" />
                <span className="hidden md:inline">{user?.first_name}</span>
              </Link>
            ) : (
              <Link href="/giris" className="flex items-center gap-2">
                <User className="w-6 h-6" />
                <span className="hidden md:inline">Giriş Yap</span>
              </Link>
            )}

            <Link href="/hesabim/favorilerim" className="relative">
              <Heart className="w-6 h-6" />
            </Link>

            <Link href="/sepet" className="relative">
              <ShoppingCart className="w-6 h-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Mobil Menü Butonu */}
            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Kategori Menüsü */}
        <nav className="hidden md:flex items-center gap-6 mt-4 py-2 border-t">
          <Link href="/kategori/elektronik" className="hover:text-primary">
            Elektronik
          </Link>
          <Link href="/kategori/moda" className="hover:text-primary">
            Moda
          </Link>
          <Link href="/kategori/ev-yasam" className="hover:text-primary">
            Ev & Yaşam
          </Link>
          <Link href="/kategori/spor" className="hover:text-primary">
            Spor
          </Link>
          <Link href="/kategori/kozmetik" className="hover:text-primary">
            Kozmetik
          </Link>
          <Link href="/urunler?indirimli=true" className="text-red-500 font-semibold">
            🔥 İndirimler
          </Link>
        </nav>
      </div>

      {/* Mobil Menü */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Ürün ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-full"
              />
            </form>
            <Link href="/kategori/elektronik">Elektronik</Link>
            <Link href="/kategori/moda">Moda</Link>
            <Link href="/kategori/ev-yasam">Ev & Yaşam</Link>
            <Link href="/kategori/spor">Spor</Link>
            <Link href="/kategori/kozmetik">Kozmetik</Link>
          </nav>
        </div>
      )}
    </header>
  )
}
```

#### 5.3.2 Ürün Kartı

```typescript
// components/product/ProductCard.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/stores/cart'
import { useFavoriteStore } from '@/stores/favorite'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore()
  const { toggleFavorite, isFavorite } = useFavoriteStore()

  const discountPercentage = product.compare_price
    ? Math.round((1 - product.base_price / product.compare_price) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow overflow-hidden"
    >
      {/* Görsel */}
      <div className="relative aspect-square overflow-hidden">
        <Link href={`/urunler/${product.slug}`}>
          <Image
            src={product.images[0]?.image_url || '/placeholder.jpg'}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>

        {/* Rozetler */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discountPercentage > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
              %{discountPercentage} İndirim
            </span>
          )}
          {product.is_new && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
              Yeni
            </span>
          )}
          {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
            <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded">
              Son {product.stock_quantity} Adet
            </span>
          )}
        </div>

        {/* Favori Butonu */}
        <button
          onClick={() => toggleFavorite(product.id)}
          className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
        >
          <Heart
            className={`w-5 h-5 ${
              isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'
            }`}
          />
        </button>

        {/* Hızlı Sepete Ekle */}
        <button
          onClick={() => addItem(product)}
          disabled={product.stock_quantity === 0}
          className="absolute bottom-0 left-0 right-0 bg-primary text-white py-2 opacity-0 group-hover:opacity-100 transition-opacity disabled:bg-gray-400"
        >
          {product.stock_quantity === 0 ? 'Tükendi' : 'Sepete Ekle'}
        </button>
      </div>

      {/* Bilgiler */}
      <div className="p-4">
        {/* Kategori */}
        <Link
          href={`/kategori/${product.category?.slug}`}
          className="text-xs text-gray-500 hover:text-primary"
        >
          {product.category?.name}
        </Link>

        {/* Ürün Adı */}
        <Link href={`/urunler/${product.slug}`}>
          <h3 className="font-medium mt-1 line-clamp-2 hover:text-primary">
            {product.name}
          </h3>
        </Link>

        {/* Puan */}
        {product.review_count > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{product.avg_rating}</span>
            <span className="text-xs text-gray-500">
              ({product.review_count} değerlendirme)
            </span>
          </div>
        )}

        {/* Fiyat */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-lg font-bold text-primary">
            {formatPrice(product.base_price)}
          </span>
          {product.compare_price && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.compare_price)}
            </span>
          )}
        </div>

        {/* Kargo Bilgisi */}
        {product.base_price >= 500 && (
          <span className="text-xs text-green-600 mt-1 block">
            ✓ Ücretsiz Kargo
          </span>
        )}
      </div>
    </motion.div>
  )
}
```

### 5.4 State Management (Zustand)

```typescript
// stores/cart.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, ProductVariant } from '@/types'

interface CartItem {
  product: Product
  variant?: ProductVariant
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void
  clearCart: () => void
  getSubtotal: () => number
  getShippingCost: () => number
  getTotal: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, variant, quantity = 1) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) =>
              item.product.id === product.id &&
              item.variant?.id === variant?.id
          )

          if (existingIndex > -1) {
            const newItems = [...state.items]
            newItems[existingIndex].quantity += quantity
            return { items: newItems }
          }

          return { items: [...state.items, { product, variant, quantity }] }
        })
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (item) =>
              !(item.product.id === productId && item.variant?.id === variantId)
          ),
        }))
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId && item.variant?.id === variantId
              ? { ...item, quantity }
              : item
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          const price = item.variant?.price ?? item.product.base_price
          return sum + price * item.quantity
        }, 0)
      },

      getShippingCost: () => {
        const subtotal = get().getSubtotal()
        return subtotal >= 500 ? 0 : 29.90
      },

      getTotal: () => {
        return get().getSubtotal() + get().getShippingCost()
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)
```

```typescript
// stores/auth.ts
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Profile } from '@/types'

interface AuthStore {
  user: Profile | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, data: Partial<Profile>) => Promise<void>
  signOut: () => Promise<void>
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    set({ user: profile, isAuthenticated: true })
  },

  signUp: async (email, password, profileData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        ...profileData,
      })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, isAuthenticated: false })
  },

  loadUser: async () => {
    set({ isLoading: true })
    
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      set({ user: profile, isAuthenticated: true })
    }

    set({ isLoading: false })
  },
}))
```

### 5.5 Data Fetching (TanStack Query + Supabase)

```typescript
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Product, ProductFilters } from '@/types'

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          variants:product_variants(*)
        `)
        .eq('is_active', true)

      if (filters?.category) {
        query = query.eq('category_id', filters.category)
      }

      if (filters?.minPrice) {
        query = query.gte('base_price', filters.minPrice)
      }

      if (filters?.maxPrice) {
        query = query.lte('base_price', filters.maxPrice)
      }

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      if (filters?.sortBy) {
        const [column, direction] = filters.sortBy.split(':')
        query = query.order(column, { ascending: direction === 'asc' })
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Product[]
    },
  })
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          brand:brands(*),
          images:product_images(*),
          variants:product_variants(*),
          attributes:product_attributes(*),
          reviews:reviews(*, profile:profiles(first_name, last_name, avatar_url))
        `)
        .eq('slug', slug)
        .single()

      if (error) throw error

      // Görüntülenme sayısını artır
      await supabase
        .from('products')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id)

      return data as Product
    },
    enabled: !!slug,
  })
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*)
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .limit(8)

      if (error) throw error
      return data as Product[]
    },
  })
}
```

### 5.6 Checkout Akışı

```typescript
// app/(shop)/odeme/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { AddressForm } from '@/components/checkout/AddressForm'
import { PaymentForm } from '@/components/checkout/PaymentForm'
import { OrderSummary } from '@/components/checkout/OrderSummary'

const steps = ['Adres', 'Ödeme', 'Onay']

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [shippingAddress, setShippingAddress] = useState(null)
  const [billingAddress, setBillingAddress] = useState(null)
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const router = useRouter()
  const { items, getSubtotal, getShippingCost, getTotal, clearCart } = useCartStore()
  const { user, isAuthenticated } = useAuthStore()

  // Sepet boşsa yönlendir
  if (items.length === 0) {
    router.push('/sepet')
    return null
  }

  const handleAddressSubmit = (shipping: any, billing: any) => {
    setShippingAddress(shipping)
    setBillingAddress(sameAsBilling ? shipping : billing)
    setCurrentStep(1)
  }

  const handlePayment = async (paymentData: any) => {
    setIsProcessing(true)

    try {
      // 1. Sipariş oluştur
      const { data: order, error: orderError } = await supabase.rpc(
        'convert_cart_to_order',
        {
          p_cart_id: await getOrCreateCartId(),
          p_shipping_address: shippingAddress,
          p_billing_address: billingAddress,
          p_payment_method: paymentData.method,
          p_shipping_method: 'yurtici',
          p_notes: paymentData.notes
        }
      )

      if (orderError) throw orderError

      // 2. Ödeme işlemi (Kredi kartı ise)
      if (paymentData.method === 'credit_card') {
        const response = await fetch('/api/payment/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order,
            cardToken: paymentData.cardToken,
            installment: paymentData.installment
          })
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error)
        }
      }

      // 3. Sepeti temizle ve yönlendir
      clearCart()
      router.push(`/odeme/basarili?order=${order}`)

    } catch (error: any) {
      console.error('Payment error:', error)
      alert(error.message || 'Ödeme işlemi başarısız oldu')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Adımlar */}
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                index <= currentStep
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index + 1}
            </div>
            <span className="ml-2 font-medium">{step}</span>
            {index < steps.length - 1 && (
              <div
                className={`w-20 h-1 mx-4 ${
                  index < currentStep ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Sol Panel - Formlar */}
        <div className="lg:col-span-2">
          {currentStep === 0 && (
            <AddressForm
              user={user}
              sameAsBilling={sameAsBilling}
              onSameAsBillingChange={setSameAsBilling}
              onSubmit={handleAddressSubmit}
            />
          )}

          {currentStep === 1 && (
            <PaymentForm
              onSubmit={handlePayment}
              onBack={() => setCurrentStep(0)}
              isProcessing={isProcessing}
              total={getTotal()}
            />
          )}
        </div>

        {/* Sağ Panel - Sipariş Özeti */}
        <div className="lg:col-span-1">
          <OrderSummary
            items={items}
            subtotal={getSubtotal()}
            shipping={getShippingCost()}
            total={getTotal()}
          />
        </div>
      </div>
    </div>
  )
}
```

---

## 6. Mobil Uygulama (React Native CLI)

### 6.1 Proje Kurulumu

```bash
# React Native CLI projesi oluşturma
npx react-native@latest init NovaStoreMobile --template react-native-template-typescript

# apps/mobile klasörüne taşıma
mv NovaStoreMobile/* apps/mobile/

# Bağımlılıklar
cd apps/mobile
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage
npm install react-native-keychain  # Güvenli depolama için
npm install @react-native-firebase/app @react-native-firebase/messaging  # Push notifications
npm install react-native-fast-image  # Görsel optimizasyonu
npm install react-native-camera  # Barkod okuma için
npm install nativewind
npm install react-native-reanimated

# Navigation
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# iOS için
cd ios && pod install && cd ..

# Android için
# android/build.gradle ve android/app/build.gradle yapılandırması gerekli
```

### 6.2 Store Deployment

#### iOS (App Store)
```bash
# Xcode ile build
xcodebuild -workspace ios/NovaStoreMobile.xcworkspace -scheme NovaStoreMobile -configuration Release

# Veya Xcode GUI ile:
# 1. Product > Archive
# 2. Distribute App > App Store Connect
# 3. Upload
```

#### Android (Google Play)
```bash
# Release APK/AAB oluşturma
cd android
./gradlew bundleRelease

# APK için
./gradlew assembleRelease

# Çıktı: android/app/build/outputs/bundle/release/app-release.aab
```

### 6.3 Uygulama Yapısı (React Native CLI)

```
apps/mobile/
├── src/
│   ├── screens/                     # Ekranlar
│   │   ├── tabs/                    # Tab ekranları
│   │   │   ├── HomeScreen.tsx       # Ana sayfa
│   │   │   ├── CategoriesScreen.tsx # Kategoriler
│   │   │   ├── CartScreen.tsx       # Sepet
│   │   │   ├── FavoritesScreen.tsx  # Favoriler
│   │   │   └── ProfileScreen.tsx    # Profil
│   │   │
│   │   ├── auth/                    # Auth ekranları
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   │
│   │   ├── ProductDetailScreen.tsx  # Ürün detay
│   │   ├── CategoryScreen.tsx       # Kategori ürünleri
│   │   ├── SearchScreen.tsx         # Arama
│   │   │
│   │   ├── checkout/
│   │   │   ├── AddressScreen.tsx    # Adres seçimi
│   │   │   ├── PaymentScreen.tsx    # Ödeme
│   │   │   └── SuccessScreen.tsx    # Başarılı
│   │   │
│   │   └── orders/
│   │       ├── OrdersScreen.tsx     # Sipariş listesi
│   │       └── OrderDetailScreen.tsx # Sipariş detay
│   │
│   ├── components/
│   │   ├── ui/                      # Temel UI bileşenleri
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── ...
│   │   ├── product/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductList.tsx
│   │   │   └── ProductGallery.tsx
│   │   ├── cart/
│   │   │   ├── CartItem.tsx
│   │   │   └── CartSummary.tsx
│   │   └── common/
│   │       ├── Header.tsx
│   │       ├── Loading.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── navigation/
│   │   ├── RootNavigator.tsx        # Ana navigator
│   │   ├── TabNavigator.tsx         # Bottom tabs
│   │   └── AuthNavigator.tsx        # Auth stack
│   │
│   ├── hooks/
│   │   ├── useProducts.ts
│   │   ├── useAuth.ts
│   │   ├── useCart.ts
│   │   └── usePushNotifications.ts
│   │
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── cartStore.ts
│   │   └── favoriteStore.ts
│   │
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── firebase.ts              # FCM için
│   │   └── api.ts
│   │
│   └── utils/
│       ├── helpers.ts
│       └── constants.ts
│
├── ios/                             # iOS native kod
│   ├── NovaStoreMobile.xcworkspace
│   └── Podfile
│
├── android/                         # Android native kod
│   ├── app/
│   │   └── build.gradle
│   └── build.gradle
│
├── App.tsx                          # Ana giriş
├── index.js                         # Entry point
├── metro.config.js
├── babel.config.js
└── package.json
```

### 6.4 Temel Bileşenler

#### 6.4.1 Tab Navigator Layout

```typescript
// src/navigation/TabNavigator.tsx
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Home, Grid3X3, ShoppingCart, Heart, User } from 'lucide-react-native'
import { View, Text } from 'react-native'
import { useCartStore } from '../stores/cartStore'

import HomeScreen from '../screens/tabs/HomeScreen'
import CategoriesScreen from '../screens/tabs/CategoriesScreen'
import CartScreen from '../screens/tabs/CartScreen'
import FavoritesScreen from '../screens/tabs/FavoritesScreen'
import ProfileScreen from '../screens/tabs/ProfileScreen'

const Tab = createBottomTabNavigator()

export default function TabNavigator() {
  const cartItemCount = useCartStore((state) => 
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  )

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          title: 'Kategoriler',
          tabBarIcon: ({ color, size }) => <Grid3X3 size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          title: 'Sepet',
          tabBarIcon: ({ color, size }) => (
            <View>
              <ShoppingCart size={size} color={color} />
              {cartItemCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -8, backgroundColor: '#ef4444', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                    {cartItemCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Favoriler',
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  )
}
```

#### 6.4.2 Ana Sayfa

```typescript
// src/screens/tabs/HomeScreen.tsx
import React, { useState, useCallback } from 'react'
import { View, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'

import { SearchBar } from '../../components/common/SearchBar'
import { Banner } from '../../components/home/Banner'
import { CategorySlider } from '../../components/home/CategorySlider'
import { ProductSection } from '../../components/home/ProductSection'
import { useFeaturedProducts, useNewProducts, useDiscountedProducts } from '../../hooks/useProducts'
import { useCategories } from '../../hooks/useCategories'

export default function HomeScreen() {
  const navigation = useNavigation()
  const [refreshing, setRefreshing] = useState(false)

  const { data: featuredProducts, refetch: refetchFeatured } = useFeaturedProducts()
  const { data: newProducts, refetch: refetchNew } = useNewProducts()
  const { data: discountedProducts, refetch: refetchDiscounted } = useDiscountedProducts()
  const { data: categories, refetch: refetchCategories } = useCategories()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      refetchFeatured(),
      refetchNew(),
      refetchDiscounted(),
      refetchCategories(),
    ])
    setRefreshing(false)
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Arama */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <SearchBar
            placeholder="Ürün ara..."
            onPress={() => navigation.navigate('Search' as never)}
          />
        </View>

        {/* Banner Slider */}
        <Banner />

        {/* Kategoriler */}
        <CategorySlider
          categories={categories || []}
          onCategoryPress={(slug) => navigation.navigate('Category' as never, { slug } as never)}
        />

        {/* Öne Çıkan Ürünler */}
        <ProductSection
          title="Öne Çıkan Ürünler"
          products={featuredProducts || []}
          onSeeAll={() => navigation.navigate('Products' as never, { featured: true } as never)}
        />

        {/* Yeni Ürünler */}
        <ProductSection
          title="Yeni Gelenler"
          products={newProducts || []}
          onSeeAll={() => navigation.navigate('Products' as never, { new: true } as never)}
        />

        {/* İndirimli Ürünler */}
        <ProductSection
          title="🔥 İndirimli Ürünler"
          products={discountedProducts || []}
          onSeeAll={() => navigation.navigate('Products' as never, { discounted: true } as never)}
          highlightColor="#ef4444"
        />
      </ScrollView>
    </SafeAreaView>
  )
}
```

#### 6.4.3 Ürün Kartı (Mobil)

```typescript
// src/components/product/ProductCard.tsx
import React from 'react'
import { View, Text, Pressable, Dimensions } from 'react-native'
import FastImage from 'react-native-fast-image'
import { useNavigation } from '@react-navigation/native'
import { Heart, Star } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { formatPrice } from '../../utils/helpers'
import { useFavoriteStore } from '../../stores/favoriteStore'
import { useCartStore } from '../../stores/cartStore'
import type { Product } from '../../types'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 48) / 2

interface ProductCardProps {
  product: Product
  index?: number
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const navigation = useNavigation()
  const { toggleFavorite, isFavorite } = useFavoriteStore()
  const { addItem } = useCartStore()

  const discountPercentage = product.compare_price
    ? Math.round((1 - product.base_price / product.compare_price) * 100)
    : 0

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={{ width: CARD_WIDTH }}
    >
      <Pressable
        onPress={() => navigation.navigate('ProductDetail' as never, { slug: product.slug } as never)}
        style={{ backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', shadowOpacity: 0.1, shadowRadius: 4 }}
      >
        {/* Görsel */}
        <View style={{ position: 'relative' }}>
          <FastImage
            source={{ uri: product.images[0]?.image_url }}
            style={{ width: CARD_WIDTH, height: CARD_WIDTH }}
            resizeMode={FastImage.resizeMode.cover}
          />

          {/* Rozetler */}
          <View style={{ position: 'absolute', top: 8, left: 8, gap: 4 }}>
            {discountPercentage > 0 && (
              <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                  %{discountPercentage}
                </Text>
              </View>
            )}
            {product.is_new && (
              <View style={{ backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Yeni</Text>
              </View>
            )}
          </View>

          {/* Favori Butonu */}
          <Pressable
            onPress={() => toggleFavorite(product.id)}
            style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, backgroundColor: 'white', borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.2, shadowRadius: 4 }}
          >
            <Heart
              size={18}
              color={isFavorite(product.id) ? '#ef4444' : '#9ca3af'}
              fill={isFavorite(product.id) ? '#ef4444' : 'none'}
            />
          </Pressable>
        </View>

        {/* Bilgiler */}
        <View className="p-3">
          <Text
            className="text-gray-500 text-xs"
            numberOfLines={1}
          >
            {product.category?.name}
          </Text>

          <Text
            className="font-medium mt-1"
            numberOfLines={2}
          >
            {product.name}
          </Text>

          {/* Puan */}
          {product.review_count > 0 && (
            <View className="flex-row items-center mt-1">
              <Star size={12} color="#facc15" fill="#facc15" />
              <Text className="text-xs ml-1 font-medium">
                {product.avg_rating}
              </Text>
              <Text className="text-xs text-gray-400 ml-1">
                ({product.review_count})
              </Text>
            </View>
          )}

          {/* Fiyat */}
          <View className="flex-row items-center mt-2">
            <Text className="text-primary font-bold text-lg">
              {formatPrice(product.base_price)}
            </Text>
            {product.compare_price && (
              <Text className="text-gray-400 text-sm line-through ml-2">
                {formatPrice(product.compare_price)}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}
```

### 6.5 Push Notifications (Firebase Cloud Messaging)

```typescript
// src/services/firebase.ts
import messaging from '@react-native-firebase/messaging'
import { Platform, PermissionsAndroid } from 'react-native'
import { supabase } from './supabase'

// Foreground notification handler
messaging().onMessage(async remoteMessage => {
  console.log('Foreground notification:', remoteMessage)
  // Local notification göstermek için react-native-notifee kullanılabilir
})

// Background notification handler (index.js'de de tanımlanmalı)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background notification:', remoteMessage)
})

export async function requestNotificationPermission() {
  if (Platform.OS === 'android') {
    // Android 13+ için permission gerekli
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      )
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Notification permission denied')
        return null
      }
    }
  }

  // iOS için permission iste
  const authStatus = await messaging().requestPermission()
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL

  if (!enabled) {
    console.log('Notification permission denied')
    return null
  }

  // FCM token al
  const token = await messaging().getToken()
  return token
}

export async function savePushToken(userId: string, token: string) {
  const { error } = await supabase
    .from('push_tokens')
    .upsert({
      user_id: userId,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,platform'
    })

  if (error) {
    console.error('Error saving push token:', error)
  }
}

// Token yenilendiğinde
messaging().onTokenRefresh(async (token) => {
  // Yeni token'ı kaydet
  console.log('FCM token refreshed:', token)
})
```

```typescript
// src/hooks/usePushNotifications.ts
import { useEffect, useState } from 'react'
import messaging from '@react-native-firebase/messaging'
import { useAuthStore } from '../stores/authStore'
import { requestNotificationPermission, savePushToken } from '../services/firebase'

export function usePushNotifications() {
  const [fcmToken, setFcmToken] = useState<string | undefined>()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    const initNotifications = async () => {
      const token = await requestNotificationPermission()
      if (token) {
        setFcmToken(token)
        
        // Token'ı veritabanına kaydet
        if (isAuthenticated && user) {
          await savePushToken(user.id, token)
        }
      }
    }

    initNotifications()

    // Notification tıklama handler
    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      handleNotificationNavigation(remoteMessage.data)
    })

    // App kapalıyken gelen notification ile açıldığında
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          handleNotificationNavigation(remoteMessage.data)
        }
      })

    return unsubscribe
  }, [isAuthenticated, user])

  return { fcmToken }
}

function handleNotificationNavigation(data: any) {
  // Bildirim tipine göre yönlendirme
  switch (data?.type) {
    case 'order_shipped':
      // navigation.navigate('OrderDetail', { id: data.orderId })
      break
    case 'price_drop':
      // navigation.navigate('ProductDetail', { slug: data.productSlug })
      break
    case 'back_in_stock':
      // navigation.navigate('ProductDetail', { slug: data.productSlug })
      break
  }
}
```

### 6.6 Supabase Client (Mobil - Keychain ile)

```typescript
// src/services/supabase.ts
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as Keychain from 'react-native-keychain'
import type { Database } from '../types/database'

// React Native Keychain ile güvenli depolama
const KeychainStorageAdapter = {
  getItem: async (key: string) => {
    try {
      const credentials = await Keychain.getGenericPassword({ service: key })
      return credentials ? credentials.password : null
    } catch (error) {
      console.error('Keychain get error:', error)
      return null
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await Keychain.setGenericPassword('supabase', value, { service: key })
    } catch (error) {
      console.error('Keychain set error:', error)
    }
  },
  removeItem: async (key: string) => {
    try {
      await Keychain.resetGenericPassword({ service: key })
    } catch (error) {
      console.error('Keychain remove error:', error)
    }
  },
}

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,  // React Native CLI için env dosyasından
  process.env.SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: KeychainStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

---

## 7. Kullanıcı Modülleri

### 7.1 Kimlik Doğrulama (Authentication)

#### 7.1.1 Giriş Yöntemleri

| Yöntem | Açıklama | Platform |
|--------|----------|----------|
| E-posta/Şifre | Standart giriş | Web, Mobil |
| Google OAuth | Google ile giriş | Web, Mobil |
| Apple Sign In | Apple ile giriş | Mobil (iOS zorunlu) |
| Telefon (OTP) | SMS doğrulama | Web, Mobil |
| Magic Link | E-posta linki ile | Web |

#### 7.1.2 Kayıt Akışı

```
┌─────────────────────────────────────────────────────────────┐
│                     KAYIT AKIŞI                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Kullanıcı Bilgileri                                     │
│     ├─ Ad Soyad (zorunlu)                                  │
│     ├─ E-posta (zorunlu, benzersiz)                        │
│     ├─ Telefon (opsiyonel)                                 │
│     └─ Şifre (min 8 karakter, büyük/küçük harf, rakam)    │
│                                                             │
│  2. E-posta Doğrulama                                       │
│     └─ Doğrulama linki gönderimi                           │
│                                                             │
│  3. Hoş Geldin E-postası                                    │
│     └─ İlk sipariş indirimi kuponu                         │
│                                                             │
│  4. Profil Tamamlama (opsiyonel)                           │
│     ├─ Doğum tarihi                                        │
│     ├─ Cinsiyet                                            │
│     └─ Adres ekleme                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 7.1.3 Şifre Politikası

```typescript
// lib/validation.ts
import { z } from 'zod'

export const passwordSchema = z
  .string()
  .min(8, 'Şifre en az 8 karakter olmalıdır')
  .regex(/[A-Z]/, 'En az bir büyük harf içermelidir')
  .regex(/[a-z]/, 'En az bir küçük harf içermelidir')
  .regex(/[0-9]/, 'En az bir rakam içermelidir')
  .regex(/[^A-Za-z0-9]/, 'En az bir özel karakter içermelidir')

export const registerSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  phone: z.string().optional(),
  password: passwordSchema,
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Kullanım koşullarını kabul etmelisiniz' })
  }),
  newsletterSubscribed: z.boolean().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword']
})
```

### 7.2 Profil Yönetimi

#### 7.2.1 Profil Sayfası Özellikleri

```
┌─────────────────────────────────────────────────────────────┐
│                     HESABIM PANELİ                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ Profil Resmi    │  │ Ad Soyad: Ahmet Yılmaz          │  │
│  │                 │  │ E-posta: ahmet@email.com        │  │
│  │   [Değiştir]    │  │ Telefon: 0532 XXX XX XX         │  │
│  └─────────────────┘  │ Üyelik: 15 Ocak 2024            │  │
│                       │ Toplam Sipariş: 12              │  │
│                       └─────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📦 Siparişlerim                                [→]  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 📍 Adreslerim                                  [→]  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ❤️ Favorilerim                                 [→]  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ⭐ Değerlendirmelerim                          [→]  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 🎫 Kuponlarım                                  [→]  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 🔔 Bildirim Ayarları                           [→]  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 🔒 Güvenlik                                    [→]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                    [ Çıkış Yap ]                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Adres Yönetimi

#### 7.3.1 Adres Formu

```typescript
// components/address/AddressForm.tsx
const addressSchema = z.object({
  title: z.string().min(1, 'Adres başlığı zorunludur'),
  firstName: z.string().min(2, 'Ad zorunludur'),
  lastName: z.string().min(2, 'Soyad zorunludur'),
  phone: z.string().regex(/^0[0-9]{10}$/, 'Geçerli bir telefon numarası giriniz'),
  city: z.string().min(1, 'İl seçiniz'),
  district: z.string().min(1, 'İlçe seçiniz'),
  neighborhood: z.string().optional(),
  fullAddress: z.string().min(10, 'Adres en az 10 karakter olmalıdır'),
  postalCode: z.string().optional(),
  addressType: z.enum(['shipping', 'billing', 'both']).default('both'),
  isDefault: z.boolean().default(false)
})
```

#### 7.3.2 İl/İlçe Verileri

```typescript
// data/turkey-locations.ts
export const cities = [
  { id: 1, name: 'Adana', plateCode: '01' },
  { id: 2, name: 'Adıyaman', plateCode: '02' },
  // ... 81 il
  { id: 34, name: 'İstanbul', plateCode: '34' },
  // ...
]

export const districts: Record<number, string[]> = {
  34: ['Kadıköy', 'Beşiktaş', 'Üsküdar', 'Şişli', 'Bakırköy', /*...*/],
  35: ['Konak', 'Karşıyaka', 'Bornova', 'Buca', /*...*/],
  // ...
}
```

### 7.4 Sipariş Takibi

#### 7.4.1 Sipariş Durumları

```
┌───────────────────────────────────────────────────────────────┐
│                    SİPARİŞ DURUMU TİMELİNE                    │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│    ✅ Sipariş Alındı          │ 15 Aralık 2025, 14:32        │
│    │                                                          │
│    ✅ Ödeme Onaylandı         │ 15 Aralık 2025, 14:33        │
│    │                                                          │
│    ✅ Hazırlanıyor            │ 15 Aralık 2025, 16:45        │
│    │                                                          │
│    ✅ Kargoya Verildi         │ 16 Aralık 2025, 10:20        │
│    │   Yurtiçi Kargo                                         │
│    │   Takip No: 1234567890                                  │
│    │                                                          │
│    ⏳ Taşınıyor               │ Tahmini: 18 Aralık 2025      │
│    │                                                          │
│    ○ Teslim Edildi                                           │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

#### 7.4.2 Sipariş Detay Sayfası

```typescript
// app/(account)/hesabim/siparislerim/[id]/page.tsx
interface OrderDetailProps {
  params: { id: string }
}

export default async function OrderDetailPage({ params }: OrderDetailProps) {
  const order = await getOrder(params.id)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Sipariş Başlık */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold">Sipariş #{order.order_number}</h1>
            <p className="text-gray-500">
              {formatDate(order.created_at)}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {/* Sipariş Timeline */}
      <OrderTimeline orderId={order.id} status={order.status} />

      {/* Sipariş Kalemleri */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Sipariş Kalemleri</h2>
        <div className="divide-y">
          {order.items.map((item) => (
            <OrderItem key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* Fiyat Özeti */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">Ödeme Detayları</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Ara Toplam</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Kargo</span>
            <span>{formatPrice(order.shipping_cost)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>İndirim</span>
              <span>-{formatPrice(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Toplam</span>
            <span>{formatPrice(order.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Adresler */}
      <div className="grid md:grid-cols-2 gap-6">
        <AddressCard
          title="Teslimat Adresi"
          address={order.shipping_address}
        />
        <AddressCard
          title="Fatura Adresi"
          address={order.billing_address}
        />
      </div>

      {/* Aksiyonlar */}
      <div className="flex gap-4 mt-6">
        {order.status === 'delivered' && (
          <Button onClick={() => openReviewModal()}>
            Değerlendir
          </Button>
        )}
        {['pending', 'confirmed'].includes(order.status) && (
          <Button variant="outline" onClick={() => cancelOrder()}>
            Siparişi İptal Et
          </Button>
        )}
        {order.status === 'delivered' && (
          <Button variant="outline" onClick={() => requestReturn()}>
            İade Talebi
          </Button>
        )}
      </div>
    </div>
  )
}
```

### 7.5 Favori Sistemi

```typescript
// stores/favoriteStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

interface FavoriteStore {
  favorites: string[]
  isLoading: boolean
  toggleFavorite: (productId: string) => Promise<void>
  isFavorite: (productId: string) => boolean
  loadFavorites: (userId: string) => Promise<void>
  syncFavorites: (userId: string) => Promise<void>
}

export const useFavoriteStore = create<FavoriteStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      isLoading: false,

      isFavorite: (productId) => {
        return get().favorites.includes(productId)
      },

      toggleFavorite: async (productId) => {
        const { favorites } = get()
        const isFav = favorites.includes(productId)

        // Optimistic update
        set({
          favorites: isFav
            ? favorites.filter(id => id !== productId)
            : [...favorites, productId]
        })

        // Sunucuya kaydet (kullanıcı giriş yapmışsa)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          if (isFav) {
            await supabase
              .from('favorites')
              .delete()
              .eq('user_id', user.id)
              .eq('product_id', productId)
          } else {
            await supabase
              .from('favorites')
              .insert({ user_id: user.id, product_id: productId })
          }
        }
      },

      loadFavorites: async (userId) => {
        set({ isLoading: true })
        
        const { data } = await supabase
          .from('favorites')
          .select('product_id')
          .eq('user_id', userId)

        if (data) {
          set({ favorites: data.map(f => f.product_id) })
        }
        
        set({ isLoading: false })
      },

      syncFavorites: async (userId) => {
        // Yerel favorileri sunucuya senkronize et
        const { favorites } = get()
        
        for (const productId of favorites) {
          await supabase
            .from('favorites')
            .upsert({ user_id: userId, product_id: productId })
        }

        // Sunucudan güncel listeyi al
        await get().loadFavorites(userId)
      }
    }),
    {
      name: 'favorites-storage'
    }
  )
)
```

### 7.6 Ürün Değerlendirmeleri

#### 7.6.1 Değerlendirme Formu

```typescript
// components/review/ReviewForm.tsx
const reviewSchema = z.object({
  rating: z.number().min(1, 'Puan seçiniz').max(5),
  title: z.string().min(5, 'Başlık en az 5 karakter olmalıdır'),
  comment: z.string().min(20, 'Yorum en az 20 karakter olmalıdır'),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  recommendProduct: z.boolean()
})

export function ReviewForm({ productId, orderId, onSuccess }: ReviewFormProps) {
  const form = useForm({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      title: '',
      comment: '',
      pros: [],
      cons: [],
      recommendProduct: true
    }
  })

  const onSubmit = async (data: z.infer<typeof reviewSchema>) => {
    const { error } = await supabase
      .from('reviews')
      .insert({
        product_id: productId,
        order_id: orderId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        ...data,
        is_approved: false // Admin onayı bekleyecek
      })

    if (!error) {
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Yıldız Puanlama */}
      <div className="mb-6">
        <label className="block mb-2">Puanınız</label>
        <StarRating
          value={form.watch('rating')}
          onChange={(rating) => form.setValue('rating', rating)}
        />
      </div>

      {/* Başlık */}
      <Input
        label="Değerlendirme Başlığı"
        placeholder="Örn: Çok memnun kaldım!"
        {...form.register('title')}
        error={form.formState.errors.title?.message}
      />

      {/* Yorum */}
      <Textarea
        label="Yorumunuz"
        placeholder="Ürün hakkındaki düşüncelerinizi paylaşın..."
        rows={4}
        {...form.register('comment')}
        error={form.formState.errors.comment?.message}
      />

      {/* Artılar */}
      <TagInput
        label="Artıları (opsiyonel)"
        placeholder="Enter ile ekle"
        value={form.watch('pros') || []}
        onChange={(tags) => form.setValue('pros', tags)}
      />

      {/* Eksiler */}
      <TagInput
        label="Eksileri (opsiyonel)"
        placeholder="Enter ile ekle"
        value={form.watch('cons') || []}
        onChange={(tags) => form.setValue('cons', tags)}
      />

      {/* Tavsiye */}
      <Checkbox
        label="Bu ürünü tavsiye eder misiniz?"
        {...form.register('recommendProduct')}
      />

      <Button type="submit" isLoading={form.formState.isSubmitting}>
        Değerlendirmeyi Gönder
      </Button>
    </form>
  )
}
```

### 7.7 Kupon Sistemi

#### 7.7.1 Kupon Türleri

| Tür | Açıklama | Örnek |
|-----|----------|-------|
| `percentage` | Yüzdelik indirim | %10 indirim |
| `fixed` | Sabit tutar indirim | 50 TL indirim |
| `free_shipping` | Ücretsiz kargo | Kargo bedava |
| `buy_x_get_y` | X al Y öde | 3 al 2 öde |

#### 7.7.2 Kupon Uygulama

```typescript
// lib/coupon.ts
export async function applyCoupon(code: string, cartTotal: number, userId?: string) {
  // 1. Kuponu kontrol et
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single()

  if (error || !coupon) {
    return { success: false, error: 'Geçersiz kupon kodu' }
  }

  // 2. Tarih kontrolü
  const now = new Date()
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { success: false, error: 'Kupon henüz aktif değil' }
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return { success: false, error: 'Kupon süresi dolmuş' }
  }

  // 3. Minimum sepet tutarı kontrolü
  if (coupon.min_order_amount && cartTotal < coupon.min_order_amount) {
    return {
      success: false,
      error: `Minimum ${formatPrice(coupon.min_order_amount)} alışveriş yapmalısınız`
    }
  }

  // 4. Kullanım limiti kontrolü
  const { count: totalUses } = await supabase
    .from('coupon_usages')
    .select('*', { count: 'exact', head: true })
    .eq('coupon_id', coupon.id)

  if (coupon.max_uses && totalUses >= coupon.max_uses) {
    return { success: false, error: 'Kupon kullanım limiti dolmuş' }
  }

  // 5. Kullanıcı bazlı limit kontrolü
  if (userId && coupon.uses_per_user) {
    const { count: userUses } = await supabase
      .from('coupon_usages')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('user_id', userId)

    if (userUses >= coupon.uses_per_user) {
      return { success: false, error: 'Bu kuponu daha önce kullandınız' }
    }
  }

  // 6. İndirimi hesapla
  let discount = 0
  switch (coupon.type) {
    case 'percentage':
      discount = cartTotal * (coupon.value / 100)
      if (coupon.max_discount) {
        discount = Math.min(discount, coupon.max_discount)
      }
      break
    case 'fixed':
      discount = Math.min(coupon.value, cartTotal)
      break
    case 'free_shipping':
      discount = 29.90 // Kargo ücreti
      break
  }

  return {
    success: true,
    coupon,
    discount: Math.round(discount * 100) / 100
  }
}
```

---

## 8. Admin Panel

### 8.1 Admin Panel Yapısı

```
apps/admin/app/
├── (auth)/
│   ├── giris/
│   │   └── page.tsx
│   └── layout.tsx
│
├── (dashboard)/
│   ├── layout.tsx                    # Sidebar + Header
│   ├── page.tsx                      # Dashboard
│   │
│   ├── siparisler/
│   │   ├── page.tsx                  # Sipariş listesi
│   │   └── [id]/
│   │       └── page.tsx              # Sipariş detay
│   │
│   ├── urunler/
│   │   ├── page.tsx                  # Ürün listesi
│   │   ├── yeni/
│   │   │   └── page.tsx              # Yeni ürün
│   │   └── [id]/
│   │       └── page.tsx              # Ürün düzenleme
│   │
│   ├── kategoriler/
│   │   ├── page.tsx                  # Kategori listesi
│   │   └── [id]/
│   │       └── page.tsx              # Kategori düzenleme
│   │
│   ├── musteriler/
│   │   ├── page.tsx                  # Müşteri listesi
│   │   └── [id]/
│   │       └── page.tsx              # Müşteri detay
│   │
│   ├── kuponlar/
│   │   ├── page.tsx                  # Kupon listesi
│   │   └── [id]/
│   │       └── page.tsx
│   │
│   ├── degerlendirmeler/
│   │   └── page.tsx                  # Yorum onay/reddetme
│   │
│   ├── raporlar/
│   │   ├── satis/
│   │   │   └── page.tsx
│   │   ├── stok/
│   │   │   └── page.tsx
│   │   └── musteri/
│   │       └── page.tsx
│   │
│   └── ayarlar/
│       ├── genel/
│       │   └── page.tsx
│       ├── kargo/
│       │   └── page.tsx
│       ├── odeme/
│       │   └── page.tsx
│       └── kullanicilar/
│           └── page.tsx              # Admin kullanıcıları
```

### 8.2 Dashboard Metrikleri

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ADMIN DASHBOARD                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│  │   Bugün        │ │   Bu Hafta     │ │   Bu Ay        │ │   Bekleyen     │
│  │   ₺24,850      │ │   ₺142,300     │ │   ₺485,200     │ │   23 Sipariş   │
│  │   +12% ↑       │ │   +8% ↑        │ │   +15% ↑       │ │                │
│  └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
│                                                                      │
│  ┌─────────────────────────────────────────┐ ┌──────────────────────┐
│  │          Satış Grafiği (30 Gün)         │ │  En Çok Satanlar     │
│  │  ₺                                      │ │  1. Ürün A - 245     │
│  │  │    ╭─╮                               │ │  2. Ürün B - 189     │
│  │  │   ╱  ╲   ╭─────╮                     │ │  3. Ürün C - 156     │
│  │  │  ╱    ╲ ╱      ╲    ╭──╮             │ │  4. Ürün D - 134     │
│  │  │ ╱      ╳        ╲  ╱   ╲             │ │  5. Ürün E - 98      │
│  │  └─────────────────────────────         │ └──────────────────────┘
│  │    1   5   10   15   20   25   30       │
│  └─────────────────────────────────────────┘
│                                                                      │
│  ┌────────────────────────────┐ ┌────────────────────────────┐      │
│  │    Son Siparişler          │ │    Düşük Stok Uyarıları    │      │
│  ├────────────────────────────┤ ├────────────────────────────┤      │
│  │ #250034 - ₺1,250 - Bekliyor│ │ Ürün X - 3 adet kaldı      │      │
│  │ #250033 - ₺890 - Hazırlanıyor│ │ Ürün Y - 5 adet kaldı    │      │
│  │ #250032 - ₺2,100 - Kargoda │ │ Ürün Z - 2 adet kaldı      │      │
│  │ #250031 - ₺450 - Teslim    │ │                            │      │
│  └────────────────────────────┘ └────────────────────────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.3 Ürün Yönetimi

```typescript
// Ürün form şeması
const productSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3),
  description: z.string().optional(),
  category_id: z.string().uuid(),
  base_price: z.number().positive(),
  compare_price: z.number().optional(),
  sku: z.string().optional(),
  stock_quantity: z.number().int().min(0),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  images: z.array(z.object({
    url: z.string().url(),
    is_primary: z.boolean()
  })).min(1),
  variants: z.array(z.object({
    name: z.string(),
    sku: z.string(),
    price: z.number().optional(),
    stock_quantity: z.number().int(),
    attributes: z.record(z.string())
  })).optional()
})
```

### 8.4 Sipariş İşlemleri

```typescript
// Sipariş durumu güncelleme
async function updateOrderStatus(orderId: string, newStatus: string, note?: string) {
  // Veritabanı güncelle
  await supabase
    .from('orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId)

  // Geçmiş kaydı ekle
  await supabase
    .from('order_history')
    .insert({ order_id: orderId, status: newStatus, note })

  // Müşteriye bildirim gönder
  await sendOrderStatusNotification(orderId, newStatus)
}
```

### 8.5 Admin Yetkilendirme

```typescript
// Yetki rolleri
const roles = {
  super_admin: ['*'], // Tüm yetkiler
  admin: ['orders.*', 'products.*', 'customers.view', 'reports.view'],
  editor: ['products.*', 'categories.*'],
  support: ['orders.view', 'orders.update', 'customers.view']
}
```

---

## 9. Ödeme Sistemleri

### 9.1 Desteklenen Ödeme Yöntemleri

| Yöntem | Sağlayıcı | Komisyon | Özellikler |
|--------|-----------|----------|------------|
| Kredi/Banka Kartı | iyzico | %2.79 + 0.25₺ | Taksit, 3D Secure, Saklı Kart |
| Kredi/Banka Kartı | PayTR | %2.49 + 0.29₺ | Taksit, 3D Secure |
| Havale/EFT | Manuel | Ücretsiz | Otomatik onay yok |
| Kapıda Ödeme | - | 5-10₺ ek ücret | Nakit veya Kart |

### 9.2 iyzico Entegrasyonu

#### 9.2.1 Kart Kaydetme (Token)

```typescript
// lib/payment/iyzico.ts
import Iyzipay from 'iyzipay'

const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY!,
  secretKey: process.env.IYZICO_SECRET_KEY!,
  uri: process.env.IYZICO_BASE_URL!
})

// Kart token oluşturma
export async function createCardToken(cardData: CardData, userId: string) {
  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: `card_${Date.now()}`,
    cardUserKey: userId, // Supabase user id
    card: {
      cardAlias: cardData.alias,
      cardHolderName: cardData.holderName,
      cardNumber: cardData.number,
      expireMonth: cardData.expireMonth,
      expireYear: cardData.expireYear
    }
  }

  return new Promise((resolve, reject) => {
    iyzipay.card.create(request, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

// Kayıtlı kartları listeleme
export async function getSavedCards(userId: string) {
  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: `cards_${Date.now()}`,
    cardUserKey: userId
  }

  return new Promise((resolve, reject) => {
    iyzipay.cardList.retrieve(request, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}
```

#### 9.2.2 3D Secure Ödeme

```typescript
// 3D Secure başlatma
export async function initiate3DPayment(order: Order, cardData: any) {
  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: order.order_number,
    price: order.total_amount.toString(),
    paidPrice: order.total_amount.toString(),
    currency: Iyzipay.CURRENCY.TRY,
    installment: cardData.installment || 1,
    basketId: order.id,
    paymentChannel: Iyzipay.PAYMENT_CHANNEL.WEB,
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
    callbackUrl: `${process.env.NEXT_PUBLIC_URL}/api/payment/callback`,
    
    paymentCard: cardData.cardToken ? {
      cardToken: cardData.cardToken,
      cardUserKey: order.user_id
    } : {
      cardHolderName: cardData.holderName,
      cardNumber: cardData.number,
      expireMonth: cardData.expireMonth,
      expireYear: cardData.expireYear,
      cvc: cardData.cvc,
      registerCard: cardData.saveCard ? 1 : 0
    },

    buyer: {
      id: order.user_id,
      name: order.shipping_address.first_name,
      surname: order.shipping_address.last_name,
      gsmNumber: order.shipping_address.phone,
      email: order.user_email,
      identityNumber: '11111111111',
      registrationAddress: order.shipping_address.full_address,
      ip: order.ip_address,
      city: order.shipping_address.city,
      country: 'Turkey'
    },

    shippingAddress: {
      contactName: `${order.shipping_address.first_name} ${order.shipping_address.last_name}`,
      city: order.shipping_address.city,
      country: 'Turkey',
      address: order.shipping_address.full_address,
      zipCode: order.shipping_address.postal_code
    },

    billingAddress: {
      contactName: `${order.billing_address.first_name} ${order.billing_address.last_name}`,
      city: order.billing_address.city,
      country: 'Turkey',
      address: order.billing_address.full_address,
      zipCode: order.billing_address.postal_code
    },

    basketItems: order.items.map((item, index) => ({
      id: item.id,
      name: item.product_name.substring(0, 50),
      category1: 'Genel',
      itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
      price: item.total_price.toString()
    }))
  }

  return new Promise((resolve, reject) => {
    iyzipay.threedsInitialize.create(request, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

// 3D Callback işleme
export async function complete3DPayment(paymentId: string, conversationId: string) {
  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId,
    paymentId
  }

  return new Promise((resolve, reject) => {
    iyzipay.threedsPayment.create(request, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}
```

### 9.3 Taksit Seçenekleri

```typescript
// Taksit hesaplama
export async function getInstallmentOptions(binNumber: string, price: number) {
  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: `installment_${Date.now()}`,
    binNumber: binNumber.substring(0, 6),
    price: price.toString()
  }

  return new Promise((resolve, reject) => {
    iyzipay.installmentInfo.retrieve(request, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

// Örnek taksit tablosu
/*
┌─────────────┬────────────┬────────────┬─────────────┐
│ Taksit      │ Aylık      │ Toplam     │ Komisyon    │
├─────────────┼────────────┼────────────┼─────────────┤
│ Tek Çekim   │ 1.000 ₺    │ 1.000 ₺    │ %0          │
│ 2 Taksit    │ 508.50 ₺   │ 1.017 ₺    │ %1.7        │
│ 3 Taksit    │ 343.33 ₺   │ 1.030 ₺    │ %3.0        │
│ 6 Taksit    │ 175.00 ₺   │ 1.050 ₺    │ %5.0        │
│ 9 Taksit    │ 120.00 ₺   │ 1.080 ₺    │ %8.0        │
│ 12 Taksit   │ 93.33 ₺    │ 1.120 ₺    │ %12.0       │
└─────────────┴────────────┴────────────┴─────────────┘
*/
```

### 9.4 Havale/EFT ile Ödeme

```typescript
// Banka hesap bilgileri
const bankAccounts = [
  {
    bank: 'Garanti BBVA',
    branch: 'Kadıköy Şubesi',
    accountName: 'Nova Store Ticaret A.Ş.',
    iban: 'TR00 0000 0000 0000 0000 0000 00',
    currency: 'TRY'
  },
  {
    bank: 'İş Bankası',
    branch: 'Merkez Şubesi',
    accountName: 'Nova Store Ticaret A.Ş.',
    iban: 'TR00 0000 0000 0000 0000 0000 00',
    currency: 'TRY'
  }
]

// Havale bildirimi
async function submitBankTransferNotification(orderId: string, data: BankTransferData) {
  await supabase
    .from('bank_transfers')
    .insert({
      order_id: orderId,
      bank_name: data.bankName,
      sender_name: data.senderName,
      amount: data.amount,
      transfer_date: data.transferDate,
      reference_number: data.referenceNumber,
      status: 'pending' // Admin onayı bekliyor
    })

  // Admin'e bildirim
  await sendAdminNotification('new_bank_transfer', { orderId, amount: data.amount })
}
```

### 9.5 İade İşlemleri

```typescript
// İade talebi oluşturma
async function createRefundRequest(orderId: string, data: RefundData) {
  // 1. İade talebini kaydet
  const { data: refund } = await supabase
    .from('refunds')
    .insert({
      order_id: orderId,
      items: data.items,
      reason: data.reason,
      description: data.description,
      status: 'pending'
    })
    .select()
    .single()

  return refund
}

// İade onaylama (Admin)
async function approveRefund(refundId: string, adminNote?: string) {
  const { data: refund } = await supabase
    .from('refunds')
    .select('*, order:orders(*)')
    .eq('id', refundId)
    .single()

  // iyzico'dan iade
  if (refund.order.payment_provider === 'iyzico') {
    const refundResult = await iyzicoRefund(
      refund.order.payment_id,
      refund.amount
    )

    if (refundResult.status === 'success') {
      await supabase
        .from('refunds')
        .update({
          status: 'approved',
          refund_payment_id: refundResult.paymentId,
          processed_at: new Date().toISOString(),
          admin_note: adminNote
        })
        .eq('id', refundId)

      // Siparişi güncelle
      await supabase
        .from('orders')
        .update({
          payment_status: refund.is_full ? 'refunded' : 'partially_refunded'
        })
        .eq('id', refund.order_id)
    }
  }
}

// iyzico iade API
async function iyzicoRefund(paymentTransactionId: string, amount: number) {
  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: `refund_${Date.now()}`,
    paymentTransactionId,
    price: amount.toString(),
    currency: Iyzipay.CURRENCY.TRY
  }

  return new Promise((resolve, reject) => {
    iyzipay.refund.create(request, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}
```

---

## 10. Kargo Entegrasyonları

### 10.1 Desteklenen Kargo Firmaları

| Firma | API Desteği | Özellikler |
|-------|-------------|------------|
| Yurtiçi Kargo | ✅ | Etiket, takip, teslimat noktası |
| Aras Kargo | ✅ | Etiket, takip |
| MNG Kargo | ✅ | Etiket, takip |
| PTT Kargo | ✅ | Etiket, takip |
| Sürat Kargo | ✅ | Etiket, takip |

### 10.2 Yurtiçi Kargo Entegrasyonu

```typescript
// lib/shipping/yurtici.ts
import axios from 'axios'
import { parseStringPromise } from 'xml2js'

const YURTICI_API = {
  url: process.env.YURTICI_API_URL,
  user: process.env.YURTICI_API_USER,
  pass: process.env.YURTICI_API_PASS,
  customerCode: process.env.YURTICI_CUSTOMER_CODE
}

// Kargo etiketi oluşturma
export async function createShipment(order: Order): Promise<ShipmentResult> {
  const xml = `
    <?xml version="1.0" encoding="UTF-8"?>
    <ShippingOrderVO>
      <wsUserName>${YURTICI_API.user}</wsUserName>
      <wsPassword>${YURTICI_API.pass}</wsPassword>
      <userLanguage>TR</userLanguage>
      <ShippingOrderDetailVO>
        <cargoKey>${order.order_number}</cargoKey>
        <invoiceKey>${order.order_number}</invoiceKey>
        <receiverCustName>${order.shipping_address.first_name} ${order.shipping_address.last_name}</receiverCustName>
        <receiverAddress>${order.shipping_address.full_address}</receiverAddress>
        <cityName>${order.shipping_address.city}</cityName>
        <townName>${order.shipping_address.district}</townName>
        <receiverPhone1>${order.shipping_address.phone}</receiverPhone1>
        <desi>${calculateDesi(order.items)}</desi>
        <kg>${calculateWeight(order.items)}</kg>
        <cargoCount>1</cargoCount>
        <ttCollectionType>${order.payment_method === 'cash_on_delivery' ? '1' : '0'}</ttCollectionType>
        ${order.payment_method === 'cash_on_delivery' ? `<ttAmount>${order.total_amount}</ttAmount>` : ''}
      </ShippingOrderDetailVO>
    </ShippingOrderVO>
  `

  const response = await axios.post(`${YURTICI_API.url}/createShipment`, xml, {
    headers: { 'Content-Type': 'application/xml' }
  })

  const result = await parseStringPromise(response.data)
  
  return {
    success: result.shippingResultVO.outFlag === '0',
    trackingNumber: result.shippingResultVO.jobId,
    barcodeUrl: result.shippingResultVO.barcodeUrl
  }
}

// Kargo takibi
export async function trackShipment(trackingNumber: string): Promise<TrackingResult> {
  const xml = `
    <?xml version="1.0" encoding="UTF-8"?>
    <QueryShipmentVO>
      <wsUserName>${YURTICI_API.user}</wsUserName>
      <wsPassword>${YURTICI_API.pass}</wsPassword>
      <userLanguage>TR</userLanguage>
      <keys>${trackingNumber}</keys>
    </QueryShipmentVO>
  `

  const response = await axios.post(`${YURTICI_API.url}/queryShipment`, xml, {
    headers: { 'Content-Type': 'application/xml' }
  })

  const result = await parseStringPromise(response.data)
  
  return {
    status: mapYurticiStatus(result.shippingDeliveryDetailVO.operationCode),
    location: result.shippingDeliveryDetailVO.unitName,
    lastUpdate: result.shippingDeliveryDetailVO.operationDate,
    events: result.shippingDeliveryDetailVO.shippingDeliveryItemDetailVO?.map(mapEvent) || []
  }
}

// Desi hesaplama
function calculateDesi(items: OrderItem[]): number {
  // En × Boy × Yükseklik / 3000
  return items.reduce((total, item) => {
    const dims = item.dimensions || { length: 20, width: 15, height: 10 }
    const desi = (dims.length * dims.width * dims.height) / 3000
    return total + (desi * item.quantity)
  }, 0)
}

// Durum eşleme
function mapYurticiStatus(code: string): ShipmentStatus {
  const statusMap: Record<string, ShipmentStatus> = {
    '0': 'pending',
    '1': 'picked_up',
    '2': 'in_transit',
    '3': 'out_for_delivery',
    '4': 'delivered',
    '5': 'returned'
  }
  return statusMap[code] || 'unknown'
}
```

### 10.3 Kargo Ücreti Hesaplama

```typescript
// lib/shipping/calculator.ts
interface ShippingRate {
  carrier: string
  price: number
  estimatedDays: string
  features: string[]
}

export async function calculateShippingRates(
  destination: Address,
  items: CartItem[]
): Promise<ShippingRate[]> {
  const totalWeight = items.reduce((sum, item) => 
    sum + (item.product.weight || 0.5) * item.quantity, 0
  )
  const totalDesi = calculateTotalDesi(items)

  // Ücretsiz kargo kontrolü
  const subtotal = items.reduce((sum, item) => 
    sum + item.quantity * (item.variant?.price || item.product.base_price), 0
  )

  if (subtotal >= 500) {
    return [{
      carrier: 'yurtici',
      price: 0,
      estimatedDays: '1-3 iş günü',
      features: ['Ücretsiz Kargo', 'Kapıda Ödeme Seçeneği']
    }]
  }

  // Standart fiyatlandırma
  const rates: ShippingRate[] = [
    {
      carrier: 'yurtici',
      price: calculateYurticiRate(totalWeight, totalDesi, destination.city),
      estimatedDays: '1-3 iş günü',
      features: ['Kapıda Ödeme Seçeneği', 'Şubeden Teslim']
    },
    {
      carrier: 'aras',
      price: calculateArasRate(totalWeight, totalDesi, destination.city),
      estimatedDays: '2-4 iş günü',
      features: ['Ekonomik']
    }
  ]

  return rates.sort((a, b) => a.price - b.price)
}

// Yurtiçi fiyat hesaplama
function calculateYurticiRate(weight: number, desi: number, city: string): number {
  const chargeableWeight = Math.max(weight, desi)
  
  // Bölge bazlı fiyatlandırma
  const zone = getZone(city)
  const baseRate = zoneRates[zone] || 25
  
  // Kg başına ek ücret
  const extraWeight = Math.max(0, chargeableWeight - 1)
  const weightCharge = extraWeight * 3

  return baseRate + weightCharge
}

const zoneRates: Record<string, number> = {
  'zone1': 20, // İstanbul, Ankara, İzmir
  'zone2': 25, // Bursa, Antalya, Kocaeli
  'zone3': 30, // Diğer iller
  'zone4': 40  // Uzak iller
}
```

### 10.4 Kargo Takip Webhook

```typescript
// app/api/shipping/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  
  // İmza doğrulama
  const signature = req.headers.get('x-webhook-signature')
  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { tracking_number, status, event_date, location } = body

  // Siparişi bul
  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, status')
    .eq('tracking_number', tracking_number)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Kargo olayını kaydet
  await supabase
    .from('shipping_events')
    .insert({
      order_id: order.id,
      status,
      location,
      event_date
    })

  // Sipariş durumunu güncelle
  if (status === 'delivered' && order.status !== 'delivered') {
    await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: event_date
      })
      .eq('id', order.id)

    // Push bildirim gönder
    await sendPushNotification(order.user_id, {
      title: 'Siparişiniz Teslim Edildi! 📦',
      body: 'Siparişiniz başarıyla teslim edildi. İyi alışverişler!',
      data: { type: 'order_delivered', orderId: order.id }
    })
  }

  return NextResponse.json({ success: true })
}
```

---

## 11. SEO ve Performans

### 11.1 SEO Optimizasyonu

#### 11.1.1 Meta Tag Yönetimi

```typescript
// app/(shop)/urunler/[slug]/page.tsx
import { Metadata } from 'next'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug)

  return {
    title: product.meta_title || `${product.name} | Nova Store`,
    description: product.meta_description || product.short_description,
    keywords: product.tags?.join(', '),
    openGraph: {
      title: product.name,
      description: product.short_description,
      images: product.images.map(img => ({
        url: img.image_url,
        width: 800,
        height: 600,
        alt: img.alt_text || product.name
      })),
      type: 'product',
      locale: 'tr_TR'
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.short_description,
      images: [product.images[0]?.image_url]
    },
    alternates: {
      canonical: `https://novastore.com/urunler/${product.slug}`
    }
  }
}
```

#### 11.1.2 Structured Data (JSON-LD)

```typescript
// components/seo/ProductJsonLd.tsx
export function ProductJsonLd({ product }: { product: Product }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map(img => img.image_url),
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: product.brand?.name || 'Nova Store'
    },
    offers: {
      '@type': 'Offer',
      url: `https://novastore.com/urunler/${product.slug}`,
      priceCurrency: 'TRY',
      price: product.base_price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: product.stock_quantity > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Nova Store'
      }
    },
    aggregateRating: product.review_count > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.avg_rating,
      reviewCount: product.review_count
    } : undefined
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
```

#### 11.1.3 Dinamik Sitemap

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://novastore.com'

  // Statik sayfalar
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/urunler`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/hakkimizda`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/iletisim`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  // Kategoriler
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .eq('is_active', true)

  const categoryPages = categories?.map((cat) => ({
    url: `${baseUrl}/kategori/${cat.slug}`,
    lastModified: new Date(cat.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8
  })) || []

  // Ürünler
  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('is_active', true)

  const productPages = products?.map((prod) => ({
    url: `${baseUrl}/urunler/${prod.slug}`,
    lastModified: new Date(prod.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7
  })) || []

  return [...staticPages, ...categoryPages, ...productPages]
}
```

### 11.2 Performans Optimizasyonu

#### 11.2.1 Görsel Optimizasyonu

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['your-supabase-id.supabase.co'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}

// components/product/ProductImage.tsx
import Image from 'next/image'

export function ProductImage({ src, alt, priority = false }: ProductImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      priority={priority}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
      className="object-cover"
    />
  )
}
```

#### 11.2.2 Caching Stratejisi

```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache'

// Ürün listesi cache (5 dakika)
export const getCachedProducts = unstable_cache(
  async (filters: ProductFilters) => {
    return await fetchProducts(filters)
  },
  ['products'],
  { revalidate: 300, tags: ['products'] }
)

// Kategori cache (1 saat)
export const getCachedCategories = unstable_cache(
  async () => {
    return await fetchCategories()
  },
  ['categories'],
  { revalidate: 3600, tags: ['categories'] }
)

// Revalidate endpoint
// app/api/revalidate/route.ts
export async function POST(req: NextRequest) {
  const { tag, secret } = await req.json()

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  revalidateTag(tag)
  return NextResponse.json({ revalidated: true })
}
```

#### 11.2.3 Bundle Optimization

```typescript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
})
```

### 11.3 Core Web Vitals Hedefleri

| Metrik | Hedef | Açıklama |
|--------|-------|----------|
| LCP | < 2.5s | En büyük içerik boyama |
| FID | < 100ms | İlk giriş gecikmesi |
| CLS | < 0.1 | Kümülatif düzen kayması |
| TTFB | < 600ms | İlk bayt süresi |

---

## 12. Güvenlik

### 12.1 Kimlik Doğrulama Güvenliği

```typescript
// Supabase Auth yapılandırması
// supabase/config.toml
[auth]
site_url = "https://novastore.com"
additional_redirect_urls = ["https://novastore.com/auth/callback"]
jwt_expiry = 3600
enable_signup = true
enable_email_autoconfirm = false

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true

[auth.sms]
enable_signup = false
enable_confirmations = true

// Rate limiting
[auth.rate_limits]
email_sent = "5 per hour"
sms_sent = "3 per hour"
sign_in_attempts = "5 per 15 minutes"
```

### 12.2 API Güvenliği

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 istek/dakika
})

export async function middleware(req: NextRequest) {
  // Rate limiting
  const ip = req.ip ?? '127.0.0.1'
  const { success, limit, remaining } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'X-RateLimit-Limit': limit.toString(), 'X-RateLimit-Remaining': remaining.toString() } }
    )
  }

  // CSRF koruması
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers.get('origin')
    const host = req.headers.get('host')
    
    if (origin && !origin.includes(host!)) {
      return NextResponse.json({ error: 'CSRF attack detected' }, { status: 403 })
    }
  }

  return NextResponse.next()
}
```

### 12.3 Veri Güvenliği

```sql
-- Hassas veri şifreleme (PII)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Telefon numarası şifreleme
CREATE OR REPLACE FUNCTION encrypt_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    encrypt(
      phone::bytea,
      current_setting('app.encryption_key')::bytea,
      'aes'
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kredi kartı maskesi
CREATE OR REPLACE FUNCTION mask_card_number(card_number TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CONCAT(
    REPEAT('*', LENGTH(card_number) - 4),
    RIGHT(card_number, 4)
  );
END;
$$ LANGUAGE plpgsql;
```

### 12.4 Güvenlik Başlıkları

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https: blob:;
      font-src 'self';
      connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.iyzipay.com;
      frame-src https://www.google.com https://*.iyzipay.com;
    `.replace(/\n/g, '')
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ]
  }
}
```

---

## 13. Deployment

### 13.1 Vercel Deployment

#### 13.1.1 Proje Yapılandırması

```json
// vercel.json
{
  "buildCommand": "pnpm turbo build --filter=web",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["fra1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_key"
  },
  "crons": [
    {
      "path": "/api/cron/cleanup-carts",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/send-abandoned-cart-emails",
      "schedule": "0 10 * * *"
    }
  ]
}
```

#### 13.1.2 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build

  deploy-preview:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 13.2 Supabase Deployment

```bash
# Supabase CLI kurulumu
npm install -g supabase

# Projeyi bağla
supabase link --project-ref your-project-ref

# Migration oluştur
supabase migration new create_tables

# Migration'ları çalıştır
supabase db push

# Edge function deploy
supabase functions deploy process-payment
supabase functions deploy send-email
supabase functions deploy send-sms
```

### 13.3 Mobil Uygulama Deployment (Native)

#### iOS (App Store)
```bash
# 1. Xcode'da proje aç
open ios/NovaStoreMobile.xcworkspace

# 2. Signing & Capabilities ayarla
# - Apple Developer hesabı bağla
# - Bundle Identifier ayarla (com.yourcompany.novastore)
# - Signing Certificate seç

# 3. Archive oluştur
# Xcode > Product > Archive

# 4. App Store Connect'e yükle
# Xcode Organizer > Distribute App > App Store Connect > Upload

# VEYA Command Line ile:
xcodebuild -workspace ios/NovaStoreMobile.xcworkspace \
  -scheme NovaStoreMobile \
  -configuration Release \
  -archivePath build/NovaStoreMobile.xcarchive \
  archive

xcodebuild -exportArchive \
  -archivePath build/NovaStoreMobile.xcarchive \
  -exportOptionsPlist exportOptions.plist \
  -exportPath build/ipa
```

#### Android (Google Play)
```bash
# 1. Keystore oluştur (ilk kez)
keytool -genkeypair -v -storetype PKCS12 \
  -keystore novastore-release.keystore \
  -alias novastore \
  -keyalg RSA -keysize 2048 \
  -validity 10000

# 2. gradle.properties'e ekle
# MYAPP_UPLOAD_STORE_FILE=novastore-release.keystore
# MYAPP_UPLOAD_KEY_ALIAS=novastore
# MYAPP_UPLOAD_STORE_PASSWORD=****
# MYAPP_UPLOAD_KEY_PASSWORD=****

# 3. Release AAB oluştur
cd android
./gradlew bundleRelease

# Çıktı: android/app/build/outputs/bundle/release/app-release.aab

# 4. Google Play Console'a yükle
# https://play.google.com/console
# - Create app > Upload AAB
# - Store listing, pricing, content rating doldur
# - Review için gönder
```

#### Fastlane ile Otomatik Deployment (Opsiyonel)
```ruby
# ios/fastlane/Fastfile
platform :ios do
  desc "Push a new release build to the App Store"
  lane :release do
    build_app(
      workspace: "NovaStoreMobile.xcworkspace",
      scheme: "NovaStoreMobile",
      configuration: "Release"
    )
    upload_to_app_store(
      skip_screenshots: true,
      skip_metadata: true
    )
  end
end

# android/fastlane/Fastfile
platform :android do
  desc "Deploy a new version to Google Play"
  lane :release do
    gradle(
      task: "bundle",
      build_type: "Release"
    )
    upload_to_play_store(
      track: "production",
      aab: "app/build/outputs/bundle/release/app-release.aab"
    )
  end
end
```

```bash
# Fastlane ile deploy
cd ios && fastlane release
cd android && fastlane release
```

---

## 14. Maliyet Analizi

### 14.1 Aylık Tahmini Maliyetler

| Servis | Plan | Aylık Maliyet | Notlar |
|--------|------|---------------|--------|
| **Supabase** | Pro | $25 | 8GB DB, 100GB Storage |
| **Vercel** | Pro | $20 | Unlimited bandwidth |
| **Domain** | - | ~$15/yıl | .com domain |
| **iyzico** | - | %2.79 + 0.25₺ | İşlem başına |
| **Resend** | - | $0 - $20 | 3K email ücretsiz |
| **Netgsm** | - | ~$20 | SMS kredisi |
| **Sentry** | Team | $26 | Hata izleme |
| **Cloudflare** | Free | $0 | CDN, SSL |

### 14.2 Başlangıç Maliyeti

```
┌─────────────────────────────────────────────────────────────┐
│                  BAŞLANGIÇ MALİYETİ                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Geliştirme Maliyeti (Tahmini)                             │
│  ├─ Web Uygulaması:           ~₺80,000 - ₺150,000         │
│  ├─ Mobil Uygulama:           ~₺60,000 - ₺120,000         │
│  ├─ Admin Panel:              ~₺40,000 - ₺80,000          │
│  └─ Toplam:                   ~₺180,000 - ₺350,000        │
│                                                             │
│  Yıllık İşletme Maliyeti                                   │
│  ├─ Hosting & Servisler:      ~₺3,000/ay = ₺36,000/yıl   │
│  ├─ Ödeme Komisyonları:       Satışa bağlı (%2-3)        │
│  └─ SMS/Email:                ~₺500/ay = ₺6,000/yıl      │
│                                                             │
│  Apple Developer Account:      $99/yıl = ~₺3,500          │
│  Google Play Developer:        $25 (tek seferlik)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 14.3 Ölçekleme Maliyetleri

| Trafik Seviyesi | Supabase | Vercel | Toplam/Ay |
|-----------------|----------|--------|-----------|
| 10K ziyaretçi | Pro ($25) | Pro ($20) | ~$50 |
| 50K ziyaretçi | Pro ($25) | Pro ($20) | ~$60 |
| 100K ziyaretçi | Team ($599) | Enterprise | ~$800+ |
| 500K+ ziyaretçi | Enterprise | Enterprise | Özel fiyat |

---

## 15. Zaman Çizelgesi

### 15.1 Proje Fazları

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PROJE ZAMAN ÇİZELGESİ                        │
│                        (Toplam: 16-20 Hafta)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  FAZ 1: PLANLAMA & KURULUM (2 Hafta)                               │
│  ├─ Hafta 1: Proje planlaması, teknoloji kararları                 │
│  └─ Hafta 2: Supabase kurulumu, DB şeması, Monorepo setup          │
│                                                                     │
│  FAZ 2: TEMEL ALTYAPI (3 Hafta)                                    │
│  ├─ Hafta 3: Auth sistemi, kullanıcı yönetimi                      │
│  ├─ Hafta 4: Ürün modülü, kategori yönetimi                        │
│  └─ Hafta 5: Sepet sistemi, oturum yönetimi                        │
│                                                                     │
│  FAZ 3: E-TİCARET ÇEKİRDEK (4 Hafta)                               │
│  ├─ Hafta 6-7: Sipariş akışı, checkout                             │
│  ├─ Hafta 8: Ödeme entegrasyonu (iyzico)                           │
│  └─ Hafta 9: Kargo entegrasyonu, takip sistemi                     │
│                                                                     │
│  FAZ 4: KULLANICI DENEYİMİ (3 Hafta)                               │
│  ├─ Hafta 10: Arama, filtreleme, sıralama                          │
│  ├─ Hafta 11: Favoriler, değerlendirmeler, kuponlar                │
│  └─ Hafta 12: E-posta/SMS bildirimleri                             │
│                                                                     │
│  FAZ 5: ADMIN PANEL (2 Hafta)                                      │
│  ├─ Hafta 13: Sipariş yönetimi, ürün yönetimi                      │
│  └─ Hafta 14: Raporlar, dashboard, kullanıcı yönetimi              │
│                                                                     │
│  FAZ 6: MOBİL UYGULAMA (3 Hafta)                                   │
│  ├─ Hafta 15: React Native kurulum, ana ekranlar                   │
│  ├─ Hafta 16: Ürün, sepet, checkout akışları                       │
│  └─ Hafta 17: Push notifications, App Store hazırlık               │
│                                                                     │
│  FAZ 7: TEST & LANSMAN (2-3 Hafta)                                 │
│  ├─ Hafta 18: Test, bug fix, performans optimizasyonu              │
│  ├─ Hafta 19: UAT, beta test                                       │
│  └─ Hafta 20: Production deployment, lansman                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 15.2 Milestone'lar

| Milestone | Tarih | Teslimler |
|-----------|-------|-----------|
| M1: MVP Ready | Hafta 5 | Auth, ürün listesi, sepet |
| M2: Checkout Ready | Hafta 9 | Ödeme, kargo entegrasyonu |
| M3: Feature Complete | Hafta 14 | Tüm web özellikleri |
| M4: Mobile Ready | Hafta 17 | iOS/Android uygulamaları |
| M5: Launch | Hafta 20 | Production deployment |

### 15.3 Post-Launch Roadmap

```
┌─────────────────────────────────────────────────────────────┐
│                    LANSMAN SONRASI ROADMAP                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Q1 - 2026 (Optimizasyon)                                  │
│  ├─ A/B testing altyapısı                                  │
│  ├─ Gelişmiş analitik dashboard                            │
│  ├─ Chatbot / canlı destek entegrasyonu                    │
│  └─ Performans iyileştirmeleri                             │
│                                                             │
│  Q2 - 2026 (Genişleme)                                     │
│  ├─ Çoklu dil desteği                                      │
│  ├─ Çoklu para birimi                                      │
│  ├─ Marketplace özelliği (çoklu satıcı)                    │
│  └─ Loyalty (sadakat) programı                             │
│                                                             │
│  Q3 - 2026 (Entegrasyon)                                   │
│  ├─ ERP entegrasyonu                                       │
│  ├─ Muhasebe yazılımı entegrasyonu                         │
│  ├─ Pazaryeri entegrasyonları (Trendyol, HB)               │
│  └─ Toplu ürün aktarımı                                    │
│                                                             │
│  Q4 - 2026 (İnovasyon)                                     │
│  ├─ AI destekli ürün önerileri                             │
│  ├─ Görsel arama                                           │
│  ├─ AR ile ürün deneme                                     │
│  └─ Sesli asistan desteği                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📎 Ekler

### Ek A: Ortam Değişkenleri Şablonu

```env
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Site
NEXT_PUBLIC_SITE_URL=https://novastore.com
NEXT_PUBLIC_SITE_NAME=Nova Store

# Ödeme - iyzico
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_BASE_URL=https://api.iyzipay.com

# Kargo - Yurtiçi
YURTICI_API_URL=
YURTICI_API_USER=
YURTICI_API_PASS=
YURTICI_CUSTOMER_CODE=

# SMS - Netgsm
NETGSM_USERNAME=
NETGSM_PASSWORD=
NETGSM_HEADER=

# Email - Resend
RESEND_API_KEY=

# Analytics
NEXT_PUBLIC_GA_ID=

# Error Tracking
SENTRY_DSN=

# Cache Revalidation
REVALIDATE_SECRET=
```

### Ek B: Önerilen VS Code Eklentileri

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-azuretools.vscode-docker",
    "GitHub.copilot",
    "eamodio.gitlens"
  ]
}
```

---

## 📞 Destek ve İletişim

Bu plan hakkında sorularınız için:
- 📧 E-posta: destek@novastore.com
- 📱 Telefon: +90 XXX XXX XX XX

---

**Doküman Versiyonu:** 1.0  
**Son Güncelleme:** 7 Aralık 2025  
**Hazırlayan:** GitHub Copilot

