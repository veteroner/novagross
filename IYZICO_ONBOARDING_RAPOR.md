# iyzico Onboarding İnceleme Raporu

**Tarih:** 4 Şubat 2026  
**Durum:** İnceleme Tamamlanamadı - Siteniz yapım aşamasında  

---

## 📋 iyzico'dan Gelen Geri Bildirim

iyzico başvurunuz tarafından incelenmiş ve aşağıdaki gereksinimler bildirilmiştir:

### 🔴 Kritik Gereksinimler

1. **Demo Alanlarını Düzenleme**
   - Mevcut demo içerikleri kaldırılmalı
   - Gerçek ürün ve verilerle değiştirilmeli

2. **Banner/Slider Yapılandırması**
   - Banner (slider) alanları bir ürün veya kategori sayfasına yönlendirmeli
   - Tıklanabilir ve işlevsel olmalı

3. **Boş Kategorilerin Yönetimi**
   - Ürün içermeyen kategoriler pasif yapılmalı veya kaldırılmalı
   - VEYA bu kategorilere ürün eklenmeli

4. **Ürün Gereksinimleri**
   - Tüm kategorilerde satışa hazır ürünler bulunmalı
   - Her ürünün fiyatı, görseli olmalı
   - "Satın Al" / "Sepete Ekle" fonksiyonları çalışır durumda olmalı

---

## ✅ Yapılanlar

### 1. Kategori Yönetimi
- ✅ Ürün olmayan kategoriler pasif hale getirildi
- ✅ Admin panelinden kategori durumları güncellendi

---

## ❌ Devam Eden Sorunlar

### 1. Banner/Slider Sorunu
**Problem:** Banner değişmedi, hala statik içerik gösteriyor

**Mevcut Durum:**
- `apps/web/src/components/home/hero-banner.tsx` dosyası statik HTML içeriyor
- Banner'da dinamik ürün/kategori linkleri yok
- Slider işlevselliği bulunmuyor

**Kod Analizi:**
```tsx
// Mevcut Banner (Statik)
<section className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
  <div className="container py-20">
    <div className="max-w-2xl">
      <h1 className="text-4xl md:text-5xl font-bold mb-4">
        Yeni Sezon Ürünleri
      </h1>
      <p className="text-lg md:text-xl opacity-90 mb-8">
        En yeni trendler ve en kaliteli ürünler şimdi Trendikon'da.
        %50'ye varan indirimlerle alışverişin keyfini çıkarın!
      </p>
      <div className="flex gap-4">
        <Button asChild size="lg" variant="secondary">
          <Link href="/urunler">Alışverişe Başla</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/kampanyalar">Kampanyalar</Link>
        </Button>
      </div>
    </div>
  </div>
</section>
```

**Gerekli Değişiklikler:**
- [ ] Dinamik banner sistemi oluşturulmalı
- [ ] Admin panelinden banner yönetimi eklenmeliCevap</ [ ] Banner'lar belirli ürün/kategorilere yönlendirmeli
- [ ] Slider/carousel işlevselliği eklenmeli (birden fazla banner varsa)

---

### 2. Demo İçerik Sorunları

**Tespit Edilen Demo Dosyalar:**
- `/Volumes/LaCie/nova_store/supabase/seed-demo-data.sql` - Demo ürünler
- `/Volumes/LaCie/nova_store/add-demo-products.sql` - Demo veriler
- `/Volumes/LaCie/nova_store/check-demo-data.sql` - Demo kontrol

**Durum:**
- Veritabanında hala demo ürünler olabilir
- Placeholder görseller kullanılıyor olabilir
- Test kategorileri aktif durumda olabilir

**Gerekli Aksiyon:**
```sql
-- Demo verileri kontrol etmek için:
SELECT 
    c.name as kategori,
    c.is_active,
    COUNT(p.id) as urun_sayisi,
    COUNT(CASE WHEN p.is_active = true THEN 1 END) as aktif_urun
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name, c.is_active
ORDER BY c.name;
```

---

### 3. Ürün Durumu

**Kontrol Edilmesi Gerekenler:**
- [ ] Tüm aktif kategorilerde en az 1 ürün var mı?
- [ ] Ürünlerin gerçek fiyatları var mı?
- [ ] Ürün görselleri placeholder değil, gerçek mi?
- [ ] "Sepete Ekle" butonu tüm ürünlerde çalışıyor mu?
- [ ] Stok bilgileri doğru mu?

**Kontrol SQL:**
```sql
-- Ürün eksik kategorileri bul
SELECT 
    c.id,
    c.name,
    c.slug,
    COUNT(p.id) as urun_sayisi
FROM categories c
LEFT JOIN products p ON (p.category_id = c.id AND p.is_active = true)
WHERE c.is_active = true
GROUP BY c.id, c.name, c.slug
HAVING COUNT(p.id) = 0;

-- Görseli olmayan ürünler
SELECT 
    p.id,
    p.name,
    COUNT(pi.id) as gorsel_sayisi
FROM products p
LEFT JOIN product_images pi ON pi.product_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name
HAVING COUNT(pi.id) = 0;
```

---

## 🎯 Yapılması Gereken Adımlar (Öncelik Sırasına Göre)

### Adım 1: Veritabanı Temizliği ve Kontrol
**Süre:** 30 dakika

```sql
-- 1. Demo verileri temizle
DELETE FROM product_images WHERE product_id IN (
  SELECT id FROM products WHERE name LIKE '%Demo%' OR description LIKE '%test%'
);
DELETE FROM products WHERE name LIKE '%Demo%' OR description LIKE '%test%';

-- 2. Ürün olmayan kategorileri pasif yap
UPDATE categories 
SET is_active = false 
WHERE id NOT IN (
  SELECT DISTINCT category_id 
  FROM products 
  WHERE is_active = true AND category_id IS NOT NULL
);

-- 3. Durumu kontrol et
SELECT 
    c.name,
    c.is_active,
    COUNT(p.id) as urun_sayisi
FROM categories c
LEFT JOIN products p ON (p.category_id = c.id AND p.is_active = true)
GROUP BY c.id, c.name, c.is_active
ORDER BY c.is_active DESC, c.name;
```

**Beklenen Sonuç:**
- Demo ürünler temizlenmiş olmalı
- Boş kategoriler pasif olmalı
- Sadece gerçek ürünleri olan kategoriler aktif olmalı

---

### Adım 2: Dinamik Banner Sistemi Oluşturma
**Süre:** 2-3 saat

**2.1. Veritabanı Tablosu Oluştur**
```sql
-- Banner yönetimi için tablo
CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_type VARCHAR(20) CHECK (link_type IN ('product', 'category', 'page', 'external')),
  link_value TEXT NOT NULL, -- product slug, category slug, veya URL
  button_text TEXT DEFAULT 'İncele',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS politikaları
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Banners are viewable by everyone"
  ON banners FOR SELECT
  USING (
    is_active = true 
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW())
  );

CREATE POLICY "Banners are manageable by admins"
  ON banners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**2.2. Banner Component'i Güncelle**

Yeni dosya: `apps/web/src/components/home/dynamic-banner.tsx`
```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@nova-store/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Banner {
  id: string
  title: string
  description: string | null
  image_url: string
  link_type: 'product' | 'category' | 'page' | 'external'
  link_value: string
  button_text: string
}

export function DynamicBanner() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      const response = await fetch('/api/banners')
      const data = await response.json()
      setBanners(data || [])
    } catch (error) {
      console.error('Banner yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLinkHref = (banner: Banner) => {
    switch (banner.link_type) {
      case 'product':
        return `/urun/${banner.link_value}`
      case 'category':
        return `/kategori/${banner.link_value}`
      case 'external':
        return banner.link_value
      default:
        return banner.link_value
    }
  }

  if (loading) {
    return (
      <section className="relative bg-gray-200 animate-pulse">
        <div className="container h-[400px]" />
      </section>
    )
  }

  if (banners.length === 0) {
    // Fallback: Statik banner göster
    return <StaticBanner />
  }

  const currentBanner = banners[currentIndex]

  return (
    <section className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Banner İçeriği */}
      <div className="relative h-[400px] md:h-[500px]">
        <Image
          src={currentBanner.image_url}
          alt={currentBanner.title}
          fill
          className="object-cover opacity-40"
          priority
        />
        
        <div className="container relative h-full flex items-center">
          <div className="max-w-2xl z-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {currentBanner.title}
            </h1>
            {currentBanner.description && (
              <p className="text-lg md:text-xl opacity-90 mb-8">
                {currentBanner.description}
              </p>
            )}
            <Button asChild size="lg" variant="secondary">
              <Link href={getLinkHref(currentBanner)}>
                {currentBanner.button_text}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation - Birden fazla banner varsa */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
            aria-label="Önceki banner"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
            aria-label="Sonraki banner"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
                aria-label={`Banner ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

// Fallback statik banner
function StaticBanner() {
  return (
    <section className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container py-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Hoş Geldiniz
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-8">
            Kaliteli ürünler ve avantajlı fiyatlarla Trendikon'da alışverişin keyfini çıkarın!
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href="/urunler">Ürünleri İncele</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
```

**2.3. API Endpoint Oluştur**

Yeni dosya: `apps/web/src/app/api/banners/route.ts`
```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    
    if (error) throw error
    
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Banner fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }
}
```

**2.4. Ana Sayfada Kullan**

`apps/web/src/app/page.tsx` dosyasını güncelle:
```tsx
import { DynamicBanner } from '@/components/home/dynamic-banner'
// ... diğer importlar

export default function HomePage() {
  return (
    <>
      {/* Hero Banner - Dinamik */}
      <DynamicBanner />
      
      {/* ... geri kalan sayfa */}
    </>
  )
}
```

---

### Adım 3: Admin Panel - Banner Yönetimi
**Süre:** 2 saat

**3.1. Banner Yönetim Sayfası Oluştur**

Yeni dosya: `apps/admin/src/app/banners/page.tsx`
```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button, Card, Input } from '@nova-store/ui'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'

// ... Banner yönetim interface'i ve component'i
```

---

### Adım 4: Ürün Kontrolü ve Düzenleme
**Süre:** Ürün sayısına göre değişir

**Yapılacaklar:**
1. Her aktif kategoride minimum 3-5 ürün olmalı
2. Tüm ürünlerde:
   - Gerçek ürün görseli (placeholder değil)
   - Doğru fiyat bilgisi
   - Stok bilgisi
   - Detaylı açıklama
   - "Sepete Ekle" butonu çalışıyor olmalı

**Kontrol Checklist:**
```
[ ] Elektronik kategorisi - En az 5 ürün
[ ] Giyim kategorisi - En az 5 ürün
[ ] Ev & Yaşam kategorisi - En az 5 ürün
[ ] Diğer aktif kategoriler...
[ ] Tüm ürünlerde gerçek görseller
[ ] Tüm ürünlerde fiyat bilgisi
[ ] Sepete ekleme fonksiyonu test edildi
```

---

## 📊 iyzico Başvuru Öncesi Son Kontrol Listesi

### Teknik Kontroller
- [ ] Demo veriler tamamen temizlendi
- [ ] Boş kategoriler pasif yapıldı veya ürün eklendi
- [ ] Banner dinamik ve çalışıyor
- [ ] Banner'lar ürün/kategori sayfalarına yönlendiriyor
- [ ] Tüm ürünlerde "Sepete Ekle" çalışıyor
- [ ] Tüm ürünlerde gerçek görseller var
- [ ] Ödeme süreci test edildi

### İçerik Kontrolleri
- [ ] Hakkımızda sayfası dolduruldu
- [ ] İletişim bilgileri doğru
- [ ] Gizlilik politikası yayında
- [ ] Kullanım koşulları yayında
- [ ] İptal ve iade koşulları yayında
- [ ] Teslimat bilgileri yayında

### SEO ve Görünüm
- [ ] Favicon ayarlandı
- [ ] Meta açıklamaları eklendi
- [ ] Sosyal medya linkleri eklendi (varsa)
- [ ] Logo ve marka görselleri yüklendi

---

## 🚀 Önerilen Zaman Çizelgesi

| Adım | Süre | Sorumluluk |
|------|------|------------|
| Veritabanı temizliği | 30 dk | Geliştirici |
| Banner sistemi kurulumu | 3 saat | Geliştirici |
| Admin panel banner yönetimi | 2 saat | Geliştirici |
| Banner içerik hazırlama | 1 saat | İçerik / Tasarım |
| Ürün kontrolü ve düzenleme | 2-4 saat | İçerik Yöneticisi |
| Test ve kontrol | 1 saat | QA |
| **TOPLAM** | **9-11 saat** | |

---

## 💡 İpuçları

### Banner Görselleri İçin
- **Boyut:** 1920x600px (16:9 oranı önerilir)
- **Format:** JPG veya WebP (optimize edilmiş)
- **Dosya boyutu:** Maksimum 200KB
- **İçerik:** Ürün görseli veya kampanya bilgisi olmalı

### İlk Banner Önerileri
1. **Ana Banner:** "Yeni Sezon Ürünleri" → En çok satan kategori
2. **İkinci Banner:** "Kampanyalı Ürünler" → İndirimli ürünler sayfası
3. **Üçüncü Banner:** "Ücretsiz Kargo" → Sepet sayfası

---

## ✉️ iyzico'ya Tekrar Bildirim Mesajı (Taslak)

> Sayın iyzico Ekibi,
> 
> [TARIH] tarihinde başvurumuz hakkında aldığımız geri bildirimler doğrultusunda gerekli düzenlemeleri tamamladık:
> 
> 1. **Demo İçerikler:** Tüm demo ve test verileri kaldırıldı, gerçek ürünlerle değiştirildi.
> 
> 2. **Banner Sistemi:** Ana sayfadaki banner alanı dinamik hale getirildi ve aktif ürün kategorilerine yönlendiriyor. Ziyaretçiler banner'lara tıklayarak doğrudan ürün ve kategorilere ulaşabilmektedir.
> 
> 3. **Kategori Yönetimi:** Ürün içermeyen tüm kategoriler pasif duruma getirildi. Aktif kategorilerin tümünde satışa hazır ürünler bulunmaktadır.
> 
> 4. **Ürün Detayları:** Tüm ürünlerde fiyat bilgisi, ürün görselleri ve "Sepete Ekle" fonksiyonu aktif durumdadır.
> 
> Site artık tam olarak çalışır durumdadır ve yeniden incelemeye hazırdır.
> 
> Saygılarımızla,
> [İsim]
> [Site URL]

---

## 📎 Ek Kaynaklar

- **Banner Sistemi Kurulum:** Bu dokümandaki Adım 2
- **Admin Panel Kullanımı:** `ADMIN_KULLANIM.md`
- **Ürün Ekleme Rehberi:** Admin panel > Ürünler > Yeni Ürün
- **Kategori Yönetimi:** Admin panel > Kategoriler

---

**Not:** Bu rapor, iyzico başvurunuzun onaylanması için yapılması gereken tüm adımları içermektedir. Adımları sırasıyla tamamladıktan sonra, iyzico'ya tekrar bildirim yapmanız gerekmektedir.
