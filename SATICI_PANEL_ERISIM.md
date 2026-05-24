# Satıcı Panel Erişim Rehberi

## 📍 Panel Adresi
**https://admin-trendikon.netlify.app/**

Hem adminler hem satıcılar bu URL'den giriş yapar.

---

## 🔐 Giriş ve Yönlendirme

### Kullanıcı Rolleri
Sistem 3 rol destekliyor (`profiles.role`):
- **admin** / **super_admin** → Admin paneline yönlendirilir (`/`)
- **customer** → Admin paneline alınmaz

Satıcı yetkisi **role ile değil**, `profiles.is_seller = true` alanı ile verilir:
- `is_seller = true` → Satıcı paneline yönlendirilir (`/seller/dashboard`)

### Giriş Akışı
1. Kullanıcı https://admin-trendikon.netlify.app/login sayfasından email/şifre ile giriş yapar
2. Sistem otomatik olarak kullanıcının `profiles.role` ve `profiles.is_seller` değerlerini kontrol eder
3. Yönlendirme:
  - **Satıcı (`is_seller=true`)** → `/seller/dashboard`
  - **Admin (`role=admin|super_admin`)** → `/` (ana dashboard)

---

## 🛡️ Güvenlik (Middleware)

### Erişim Kontrolleri
- **Kimlik doğrulaması**: Tüm sayfalar (login hariç) giriş gerektirir
- **Yetki kontrolü**:
  - Admin: `profiles.role IN ('admin','super_admin')`
  - Satıcı: `profiles.is_seller = true`
  - Diğer kullanıcılar → login'e yönlendirilir + hata mesajı
  
### Otomatik Yönlendirmeler
- **Satıcı** admin sayfalarına girmeye çalışırsa → `/seller/dashboard`'a yönlendirilir
- **Admin** satıcı sayfalarına girmeye çalışırsa → `/` (ana dashboard) yönlendirilir

---

## 📂 Satıcı Panel Sayfaları

Satıcılar için hazır sayfalar (`/seller/*` route grubu):

| Sayfa | URL | Açıklama |
|-------|-----|----------|
| **Ana Sayfa** | `/seller/dashboard` | Satıcı özet dashboard'u (istatistikler, son siparişler) |
| **Ürünler** | `/seller/products` | Satıcının ürün listesi (düzenle, ekle, sil) |
| **Siparişler** | `/seller/orders` | Satıcıya ait sipariş listesi |
| **Analizler** | `/seller/analytics` | Satış analizleri ve raporlar |

### Layout Özellikleri
- **Özel navigasyon**: Satıcı sayfaları için üst menü (admin sidebar gösterilmez)
- **Aktif sayfa vurgusu**: Mevcut sayfa yeşil renkle işaretli
- **Çıkış butonu**: Sağ üst köşede

---

## 💼 Admin Panel Sayfaları

Adminler için mevcut sayfalar (`/` route grubu):

- Ana Dashboard (`/`)
- Ürünler (`/urunler`)
- Onay Bekleyenler (`/urunler/onay-bekleyenler`)
- Siparişler (`/siparisler`)
- Kategoriler (`/kategoriler`)
- Müşteriler (`/musteriler`)
- **Satıcılar** (`/saticilar`) - Admin satıcı yönetimi
- **Satıcı Başvuruları** (`/saticilar/basvurular`) - Yeni satıcı onayı
- Para Çekme (`/para-cekme`)
- **Ödemeler** (`/odemeler`) - Haftalık payout batch
- Kuponlar, Yorumlar, Raporlar, Ayarlar...

---

## 🔧 Teknik Detaylar

### Dosya Yapısı
```
apps/admin/src/
├── middleware.ts              # Role tabanlı erişim kontrolü
├── app/
│   ├── (dashboard)/          # Admin route group (sidebar ile)
│   ├── (seller)/             # Satıcı route group (üst menü ile)
│   │   ├── layout.tsx        # Satıcı özel layout
│   │   └── seller/
│   │       ├── dashboard/
│   │       ├── products/
│   │       ├── orders/
│   │       └── analytics/
│   └── login/page.tsx        # Ortak login sayfası
└── components/layout/
    └── sidebar.tsx           # Admin sidebar (satıcıda gösterilmez)
```

### Middleware Kuralları
```typescript
// Admin (role) veya Satıcı (is_seller) izin verilir
if (role !== 'admin' && role !== 'super_admin' && !isSeller) {
  redirect('/login?error=unauthorized')
}

// Satıcı admin sayfalarına giremez
if (isSeller && role !== 'admin' && role !== 'super_admin' && !pathname.startsWith('/seller')) {
  redirect('/seller/dashboard')
}

// Admin satıcı sayfalarına giremez
if ((role === 'admin' || role === 'super_admin') && pathname.startsWith('/seller')) {
  redirect('/')
}
```

---

## ✅ Test Adımları

### Satıcı Hesabı Testi
1. Supabase'de bir kullanıcının `profiles.is_seller` değerini `true` yap
2. https://admin-trendikon.netlify.app/login adresinden giriş yap
3. Otomatik olarak `/seller/dashboard` sayfasına yönlendirilmeli
4. Üst menüde sadece satıcı linkleri (Ana Sayfa, Ürünler, Siparişler, Analizler) görünmeli
5. Admin sayfalarına (`/`, `/urunler`, vb.) manuel URL ile gitmeye çalış → `/seller/dashboard`'a dönmeli

### Admin Hesabı Testi
1. Supabase'de bir kullanıcının `profiles.role` değerini `admin` yap
2. Giriş yap → `/` (ana dashboard) gösterilmeli
3. Sol tarafta admin sidebar menüsü görünmeli
4. `/seller/dashboard` adresine gitmeye çalış → `/` (ana dashboard)'a dönmeli

---

## 🚀 Deployment Sonrası

Deploy edildiğinde satıcılar:
1. Başvuru yaptıklarında admin onaylar (`/saticilar/basvurular`)
2. Onay maili ile birlikte login linki alırlar
3. Aynı admin panel URL'inden (`https://admin-trendikon.netlify.app`) giriş yaparlar
4. Otomatik olarak kendi dashboard'larına yönlendirilirler

**Not**: Satıcı yetkisi `profiles.is_seller = true` ile verilir. `profiles.role` alanı DB constraint nedeniyle `seller` olamaz.

---

## 📝 Son Değişiklikler

- ✅ Middleware: Satıcılara erişim izni eklendi
- ✅ Login: Role tabanlı otomatik yönlendirme
- ✅ Satıcı Layout: Çıkış butonu + aktif sayfa vurgusu
- ✅ Admin Sidebar: Satıcılar için gizleme (role check)
- ✅ Route koruma: Satıcı/admin birbirinin sayfalarına giremez
