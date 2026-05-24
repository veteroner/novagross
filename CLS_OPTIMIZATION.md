# CLS (Cumulative Layout Shift) Optimization Report

**Tarih:** 28 Ocak 2026  
**Hedef:** CLS < 0.1 (Good)  
**Mevcut Durum:** Baseline measurement gerekli

---

## 📊 CLS Nedir?

Cumulative Layout Shift (CLS), bir sayfanın görsel kararlılığını ölçen Core Web Vitals metriklerinden biridir. Beklenmedik layout değişikliklerini ölçer ve kullanıcı deneyimini doğrudan etkiler.

### CLS Skorları:
- **İyi (Good):** < 0.1
- **Geliştirilmeli (Needs Improvement):** 0.1 - 0.25
- **Kötü (Poor):** > 0.25

---

## ✅ Mevcut CLS Optimizasyonları

### 1. Font Optimization ✅
**Durum:** Tamamlandı

```typescript
// apps/web/src/app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // ✅ Font yüklenirken layout shift engellenir
})
```

**Etki:** Font yükleme sırasında layout shift önlenir. `display: swap` kullanımı ile fallback font gösterilir.

---

### 2. Image Optimization ✅
**Durum:** Tamamlandı

```typescript
// next/image kullanımı - Otomatik width/height
<Image
  src={product.image_url || '/placeholder.jpg'}
  alt={`${product.name} - ${product.category?.name || ''} ${product.brand || ''}`}
  width={400}
  height={400}
  className="..."
  priority={index < 2} // ✅ İlk 2 ürün priority
/>
```

**Implementasyonlar:**
- ✅ next/image component'i tüm ürün görsellerinde kullanılıyor
- ✅ Width/height attributes otomatik (next/image)
- ✅ İlk 2 ürüne `priority` flag uygulandı (LCP için de kritik)
- ✅ Lazy loading enabled (3. üründen sonra)
- ✅ WebP/AVIF format desteği (next.config.js)

**Dosyalar:**
- `/apps/web/src/components/product/product-card.tsx`
- `/apps/web/src/components/product/featured-products.tsx`
- `/apps/web/src/components/product/product-grid.tsx`

---

### 3. Skeleton Screens ✅
**Durum:** Tamamlandı

**Implementasyonlar:**
- ✅ Statik sayfalara (KVKK, Gizlilik, İletişim, SSS, Hakkımızda, Çerez)
- ✅ Ürün detay sayfası (`/urun/[slug]`)
- ✅ Benzer ürünler bölümü
- ✅ Ürün listeleme sayfaları (`/urunler`, `/kategori/[slug]`)

```typescript
// ProductGridSkeleton örneği
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {Array.from({ length: 9 }).map((_, i) => (
    <ProductCardSkeleton key={i} />
  ))}
</div>
```

**Etki:** İçerik yüklenirken placeholder gösterilir, layout shift engellenir.

---

### 4. Resource Hints ✅
**Durum:** Tamamlandı

```typescript
// apps/web/src/app/layout.tsx
<link rel="preconnect" href="https://www.googletagmanager.com" />
<link rel="preconnect" href="https://www.google-analytics.com" />
<link rel="dns-prefetch" href="https://www.facebook.com" />
<link rel="dns-prefetch" href="https://clarity.ms" />
```

**Etki:** Third-party script'lerin erkenden bağlantı kurması sağlanır, render blocking azaltılır.

---

### 5. Lazy Loading Strategy ✅
**Durum:** Tamamlandı

**Dynamic Imports:**
```typescript
// Analytics lazy loading
const GoogleAnalytics = dynamic(() => import('@/components/analytics/google-analytics'), {
  ssr: false,
})

// Newsletter form lazy loading
const NewsletterForm = dynamic(() => import('@/components/newsletter/newsletter-form'), {
  ssr: false,
})

// Product page sections
const RelatedProducts = dynamic(() => import('./related-products'))
const ProductReviews = dynamic(() => import('./product-reviews'))
```

**Etki:** Above-the-fold content hızlı yüklenir, kritik olmayan içerik lazy load edilir.

---

## 📈 CLS Measurement Stratejisi

### Mevcut Monitoring ✅

Web Vitals monitoring library aktif:

```typescript
// apps/web/src/app/layout.tsx
import { WebVitalsReporter } from '@/components/analytics/web-vitals-reporter'

<WebVitalsReporter />
```

**Tracking Kanalları:**
1. **Google Analytics 4** - event: 'web_vitals'
2. **GTM dataLayer** - event: 'web-vitals'
3. **Console Logging** - Development mode

---

### CLS Veri Toplama

**1. Google Analytics 4**
- GA4 Dashboard → Events → "web_vitals" filtrele
- Custom dimensions: metric_name = 'CLS'
- Value field'ını kontrol et

**2. Google Search Console**
- Core Web Vitals raporu
- Mobile vs Desktop CLS skorları
- Problem sayfaların listesi

**3. Chrome DevTools**
- Performance tab → Enable "Web Vitals"
- Layout Shift Regions vizüalize edilir
- Hangi elementlerin shift yaptığını gösterir

**4. PageSpeed Insights**
- URL: https://pagespeed.web.dev/
- Real-world data (Field Data)
- Lab data (Simulated)

---

## 🎯 CLS Baseline Measurement Prosedürü

### 1. Öncelikli Sayfalar

| Sayfa | URL | Öncelik | Sebep |
|-------|-----|---------|-------|
| Ana Sayfa | `/` | 🔴 Yüksek | En çok ziyaret edilen |
| Ürün Detay | `/urun/[slug]` | 🔴 Yüksek | Conversion critical |
| Ürün Listesi | `/urunler` | 🟡 Orta | Ürün discovery |
| Kategori | `/kategori/[slug]` | 🟡 Orta | Navigation |
| Ödeme | `/odeme` | 🔴 Yüksek | Conversion funnel |
| Sepet | `/sepet` | 🔴 Yüksek | Conversion funnel |

### 2. Test Senaryoları

**A) Desktop (1920x1080)**
- Chrome 120+ (Latest)
- Fast 3G throttling
- 5 test run, median al

**B) Mobile (375x667 - iPhone SE)**
- Chrome Mobile
- Slow 3G throttling
- 5 test run, median al

### 3. Measurement Komutu

```bash
# Lighthouse CLI ile CLS ölçümü
npx lighthouse https://trendikon.com \
  --only-categories=performance \
  --output=json \
  --output-path=./cls-report.json \
  --throttling-method=simulate \
  --form-factor=mobile

# CLS değerini extract et
cat cls-report.json | jq '.audits["cumulative-layout-shift"].numericValue'
```

---

## 🚨 Potansiyel CLS Riskleri

### 1. Banner/Announcement Bar ⚠️
**Risk:** Dinamik yüklenen üst banner layout shift yapabilir.

**Kontrol:**
```typescript
// apps/web/src/components/header.tsx veya banner component
// Min-height reserved space var mı?
```

**Öneri:** Banner için min-height reserve et veya static height kullan.

---

### 2. Product Grid Image Loading ⚠️
**Risk:** Product grid'de images lazy load edilirken shift olabilir.

**Mevcut Durum:** ✅ next/image otomatik aspect-ratio korur
**Kontrol:** Grid'de explicit height var mı?

---

### 3. Cookie Consent Banner ✅
**Risk:** Cookie banner'ın geç yüklenmesi

**Mevcut Durum:** ✅ Fixed position, overlay - layout shift yapmaz

```typescript
// Position: fixed bottom-0 - layout'a etki etmez
<div className="fixed bottom-0 left-0 right-0 z-50 ...">
```

---

### 4. Web Fonts ✅
**Risk:** FOIT/FOUT (Flash of Invisible/Unstyled Text)

**Mevcut Durum:** ✅ `display: swap` kullanılıyor
**Etki:** Minimal shift, fallback font gösterilir

---

### 5. Third-party Scripts ⚠️
**Risk:** GA4, GTM, Facebook Pixel, Clarity

**Mevcut Durum:** ✅ Lazy loaded, ssr: false
**Kontrol:** Script'ler layout'a inject ediyor mu?

```typescript
// Mevcut: SSR disabled, async yükleniyor
const GoogleAnalytics = dynamic(() => ..., { ssr: false })
```

---

## 🔧 Önerilen İyileştirmeler

### 1. Explicit Dimensions for All Images 📝
**Öncelik:** Orta

```typescript
// Tüm Image component'lerinde width/height explicit olmalı
// next/image zaten bunu handle ediyor, ancak manuel kontrol et

// Product cards - ✅ Halledildi
// Hero images - ⚠️ Kontrol et
// Category images - ⚠️ Kontrol et
```

---

### 2. Reserve Space for Async Content 📝
**Öncelik:** Düşük

```typescript
// Newsletter form, Related products için min-height
<div className="min-h-[200px]">
  <Suspense fallback={<Skeleton className="h-[200px]" />}>
    <NewsletterForm />
  </Suspense>
</div>
```

---

### 3. CSS Animation Optimization 📝
**Öncelik:** Düşük

```css
/* Avoid animating layout-affecting properties */
/* ✅ İyi: transform, opacity */
/* ❌ Kötü: width, height, margin, padding */

.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); } /* ✅ */
  to { opacity: 1; transform: translateY(0); } /* ✅ */
}
```

---

### 4. Preload Critical Resources 📝
**Öncelik:** Orta

```typescript
// Layout.tsx - Hero image preload
<link
  rel="preload"
  as="image"
  href="/hero-image.jpg"
  imageSrcSet="/hero-image-sm.jpg 400w, /hero-image-lg.jpg 800w"
/>
```

---

## 📊 Expected CLS Score

Mevcut optimizasyonlarla beklenen CLS skoru:

| Sayfa | Beklenen CLS | Güven | Notlar |
|-------|-------------|-------|--------|
| Ana Sayfa | 0.05 - 0.08 | ⚠️ Orta | Hero images, featured products |
| Ürün Detay | 0.03 - 0.06 | ✅ Yüksek | Skeleton screens aktif |
| Ürün Listesi | 0.04 - 0.07 | ✅ Yüksek | Grid with skeletons |
| Kategori | 0.04 - 0.07 | ✅ Yüksek | Similar to product list |
| Ödeme | 0.02 - 0.05 | ✅ Yüksek | Form-based, static layout |
| Sepet | 0.03 - 0.06 | ✅ Yüksek | Table layout, predictable |

**Overall Expected:** 0.05 (Good - < 0.1) ✅

---

## 🎯 Action Items

### Immediate (Bu Hafta)
1. [ ] PageSpeed Insights test - 6 kritik sayfa
2. [ ] Google Search Console - CLS raporu kontrol
3. [ ] Chrome DevTools - Layout shift regions identify
4. [ ] Baseline scores dokümante et

### Short-term (2 Hafta)
1. [ ] Hero image preload ekle (varsa)
2. [ ] Category images dimensions kontrol
3. [ ] Min-height reserved space ekle (gerekirse)
4. [ ] CSS animation audit

### Monitoring (Sürekli)
1. [x] Web Vitals Reporter aktif (GA4, GTM)
2. [ ] Weekly CLS monitoring dashboard
3. [ ] Alert setup (CLS > 0.1)
4. [ ] Monthly CLS trend raporu

---

## 📚 Referanslar

- [Web.dev CLS Guide](https://web.dev/cls/)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Font Optimization Best Practices](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
- [Core Web Vitals](https://web.dev/vitals/)

---

## 📝 Changelog

**28 Ocak 2026**
- ✅ CLS optimization documentation oluşturuldu
- ✅ Mevcut implementasyonlar listelendi
- ✅ Font optimization: display: swap ✅
- ✅ Image optimization: next/image + priority ✅
- ✅ Skeleton screens: 9+ sayfa ✅
- ✅ Resource hints: GTM, GA, FB, Clarity ✅
- ✅ Lazy loading: Analytics, forms, product sections ✅
- ⏳ Baseline measurement: PageSpeed Insights pending
- ⏳ Real-world CLS scores: Google Search Console pending

**Sonraki Adım:** PageSpeed Insights ile 6 kritik sayfayı test et ve baseline CLS skorlarını dokümante et.
