# İyzico Ödeme Sistemi Entegrasyonu - Gereksinimler Planı

**Tarih:** 27 Ocak 2026  
**Durum:** Devam Ediyor

## 📋 İyzico Tarafından Talep Edilen Kriterler

### ✅ Tamamlananlar

- [x] Hakkımızda Sayfası
- [x] SSL Sertifikası (Site HTTPS ile çalışıyor)
- [x] Teslimat ve İade Şartları
- [x] Gizlilik Sözleşmesi
- [x] Mesafeli Satış Sözleşmesi
- [x] Visa ve MasterCard Logoları
- [x] iyzico ile Ödeme Logosu

---

## ✅ TAMAMLANAN İŞLEMLER

### 1. Hakkımızda Sayfası ✅
**Dosya:** `/apps/web/src/app/hakkimizda/page.tsx`

**Tamamlanan:**
- ✅ Sayfa mevcut ve içerik tamamlandı
- ✅ Şirket bilgileri eklendi (Teknova/Trendikon)
- ✅ Misyon ve vizyon mevcut
- ✅ İletişim bilgileri eklendi
- ✅ Şirket yasal bilgileri bölümü eklendi (Vergi no, Mersis no, vb.)

---

### 2. SSL Sertifikası ✅
Site zaten HTTPS ile çalışıyor. Netlify otomatik SSL sağlıyor.

---

### 3. Teslimat ve İade Şartları ✅
**Dosya:** `/apps/web/src/app/iade-degisim/page.tsx`

**Tamamlanan:**
- ✅ İade sayfası mevcut ve detaylı
- ✅ Teslimat şartları eklendi:
  - Teslimat süreleri (1-3 iş günü kargo + 1-7 gün teslimat)
  - Kargo firmaları (Aras, Yurtiçi, MNG, PTT)
  - Teslimat bölgeleri (Tüm Türkiye)
  - Kargo ücretleri (500 TL üzeri ücretsiz)
  - Kargo takibi bilgileri
  - Teslimat şartları

---

### 4. Gizlilik Sözleşmesi ✅
**Dosya:** `/apps/web/src/app/gizlilik-politikasi/page.tsx`

**Tamamlanan:**
- ✅ Sayfa mevcut ve detaylı
- ✅ İyzico ödeme güvenliği maddesi eklendi
- ✅ PCI-DSS Level 1 sertifikası bilgisi eklendi
- ✅ 256-bit SSL şifreleme açıklaması eklendi
- ✅ Üçüncü taraf hizmet sağlayıcılar bölümü eklendi (iyzico, kargo firmaları, vb.)
- ✅ KVKK uyumluluğu mevcut

---

### 5. Mesafeli Satış Sözleşmesi ✅
**Dosya:** `/apps/web/src/app/mesafeli-satis-sozlesmesi/page.tsx`

**Tamamlanan:**
- ✅ Yeni sayfa oluşturuldu
- ✅ 6502 sayılı TKHK uyumlu sözleşme metni hazırlandı
- ✅ Şirket bilgileri (Teknova) eklendi
- ✅ Cayma hakkı (14 gün) detaylandırıldı
- ✅ Ödeme şekilleri (Visa, MasterCard, Troy, iyzico) eklendi
- ✅ Teslimat koşulları eklendi
- ✅ İade/iptal prosedürleri eklendi
- ✅ Tüketici hakları belirtildi
- ✅ Uyuşmazlık çözümü (Tüketici Hakem Heyeti) eklendi

---

### 6. Visa ve MasterCard Logoları ✅
**Dosyalar:** 
- `/apps/web/public/images/payment/visa.png` ✅
- `/apps/web/public/images/payment/mastercard.png` ✅
- `/apps/web/public/images/payment/troy.png` ✅
- `/apps/web/src/components/layout/footer.tsx` ✅

**Tamamlanan:**
- ✅ Visa logosu indirildi ve eklendi
- ✅ MasterCard logosu indirildi ve eklendi
- ✅ Troy logosu indirildi ve eklendi
- ✅ Footer'daki placeholder'lar gerçek logolarla değiştirildi
- ✅ Next.js Image komponenti kullanıldı
- ✅ Logo boyutlandırma ve optimizasyon yapıldı

---

### 7. iyzico ile Ödeme Logosu ✅
**Dosyalar:**
- `/apps/web/public/images/payment/iyzico-logo.png` ✅
- `/apps/web/src/components/layout/footer.tsx` ✅

**Tamamlanan:**
- ✅ Logo paketinden uygun logo seçildi (Colored @2x)
- ✅ Public klasörüne kopyalandı
- ✅ Footer'a "iyzico ile Ödeme" logosu eklendi
- ✅ Logo boyutlandırma ve optimizasyon yapıldı

---

### 8. Footer Güncellemeleri ✅
**Dosya:** `/apps/web/src/components/layout/footer.tsx`

**Tamamlanan:**
- ✅ "Hakkımızda" linki eklendi (Müşteri Hizmetleri bölümüne)
- ✅ "Mesafeli Satış Sözleşmesi" linki eklendi (Yasal bölümüne)
- ✅ Ödeme logoları güncellendi (Visa, MasterCard, Troy, iyzico)
- ✅ Image komponenti ile logolar eklendi
- ✅ Responsive tasarım iyileştirildi

---

## 🎯 İyzico Başvurusu İçin Hazır Durumda

Tüm gereksinimler tamamlandı! İyzico entegrasyonu için gerekli tüm web sitesi kriterleri sağlanmıştır.

### ✅ Kontrol Listesi:
1. ✅ Hakkımızda Sayfası - Şirket bilgileri ile detaylı
2. ✅ SSL Sertifikası - Netlify otomatik SSL
3. ✅ Teslimat ve İade Şartları - Kapsamlı bilgilerle tamamlandı
4. ✅ Gizlilik Sözleşmesi - iyzico güvenlik bilgileri ile güncellendi
5. ✅ Mesafeli Satış Sözleşmesi - TKHK uyumlu şekilde oluşturuldu
6. ✅ Visa ve MasterCard Logoları - Footer'da görünür
7. ✅ iyzico ile Ödeme Logosu - Footer'da görünür

---

## 📊 İlerleme Durumu

- **Tamamlanan:** 7/7 (%100)
- **Devam Eden:** 0/7
- **Bekleyen:** 0/7

---

## 📝 Önemli Notlar

### Tamamlanmadan Önce Kontrol Edilmesi Gerekenler:
1. ⚠️ **Hakkımızda sayfasındaki bilgiler:** Vergi numarası, Mersis numarası, Ticaret Sicil No gibi alanlar `[...]` placeholder ile işaretlenmiştir. Gerçek bilgilerle değiştirilmelidir.
2. ⚠️ **Mesafeli Satış Sözleşmesi:** Şirket adresi ve telefon numarası placeholder'ları gerçek bilgilerle güncellenmelidir.
3. ✅ **SSL:** Netlify otomatik sağlıyor, ek işlem gerekmiyor.
4. ✅ **Logolar:** Tüm ödeme logoları eklendi ve çalışıyor.

### İyzico Başvurusu İçin:
- Tüm sayfalar erişilebilir durumda
- Footer'dan tüm yasal sayfalara link var
- Ödeme logoları görünür
- SSL aktif

---

**Son Güncelleme:** 27 Ocak 2026
