# 🔴 ACMASIZ EKSİKLİK RAPORU — Admin & Satıcı Panelleri

> Tarih: 22 Şubat 2026  
> Durum: Kritik eksikler — marketplace ödeme ve satıcı yönetimi işlevsiz

---

## 📊 ÖZET TABLO

| Öncelik | Açıklama | Etki |
|---------|----------|------|
| 🔴 P0 | Satıcı profil sayfası yok — IBAN girecek yer yok | Satıcılar para çekemez, iyzico kaydı yapılamaz |
| 🔴 P0 | Resim yükleme sessizce başarısız oluyor | Satıcılar ürün görseli ekleyemiyor |
| 🔴 P0 | Satıcı para çekme sayfası yok | Satıcılar kazançlarını çekemez |
| 🟠 P1 | Satıcı başvuru formu eksik alanlar | Belge yüklenemiyor, company_name toplanmıyor |
| 🟠 P1 | Banka bilgileri admin_notes'a string olarak yazılıyor | Yapısal veri kaybı |
| 🟠 P1 | iyzico sub-merchant otomatik kayıt yok | Her yeni satıcı için manuel script çalıştırmak gerekiyor |
| 🟠 P1 | Admin panelinde satıcı detay sayfası yok | IBAN/banka bilgisi görülemiyor |
| 🟡 P2 | Storage policy çok açık | Bir satıcı diğerinin resimlerini silebilir |
| 🟡 P2 | Ürün silme storage temizliği yok | Silinen ürün resimleri storage'da kalır |
| 🟡 P2 | /satici-sozlesmesi sayfası yok | Kayıt formundan 404'e link |
| 🟡 P2 | Kuponlar/Yorumlar sayfaları stub | Admin panelinde işlevsiz sayfalar |
| ⚪ P3 | Resim yükleme hata bildirimi yok | Başarısız upload kullanıcıya gösterilmiyor |
| ⚪ P3 | Müşteriler sayfası — max 100, pagination yok | Ölçeklenemez |
| ⚪ P3 | Admin ayarları 4/5 disabled | Kargo, email, site, güvenlik ayarları yok |

---

## 🔴 P0 — KRİTİK (Sistemi Kırıyor)

### 1. Satıcı Profil/Mağaza Ayarları Sayfası YOK

**Ne yok:** `/seller/profile` rotasına link var ama sayfa dosyası yok → 404.  
**Satıcı şunları yapamıyor:**
- IBAN girmek/güncellemek
- Banka bilgilerini düzenlemek
- Mağaza adını, açıklamasını değiştirmek
- Vergi bilgilerini güncellemek
- Logo/banner yüklemek
- İletişim bilgilerini düzenlemek

**Gerekli dosya:** `novastoreadmin-standalone/src/app/(seller)/seller/profile/page.tsx`  
**Alanlar:**
- Mağaza bilgileri: ad, açıklama, logo, banner
- İletişim: email, telefon, adres, şehir
- Banka: banka adı, IBAN, hesap sahibi
- Vergi: vergi no, vergi dairesi, şirket adı
- iyzico durumu: sub-merchant kaydı var mı (salt okunur)

---

### 2. Resim Yükleme Sessizce Başarısız Oluyor

**Belirti:** Satıcı ürün eklerken resim seçtiğinde hiçbir hata görmüyor ama resim yüklenmiyor.

**Kök nedenler:**
1. Upload hatası sadece `console.error` ile loglanıyor — **kullanıcıya bildirim yok**
2. Upload sıralı (sequential) — yavaş ve tek bir hata tüm akışı bozuyor
3. **Hata handling kodu:**
   ```ts
   if (error) { console.error('Failed to upload image:', error); continue; }
   ```
   `continue` ile atlanıyor, kullanıcı resim eklenmiş sanıyor.

**Olası ek sebepler:**
- Storage bucket policy `is_seller = true` gerektiriyor — profilde flag yoksa reddedilir
- Dosya boyutu 5MB limiti — büyük dosyalarda sessiz hata
- MIME type uyumsuzluğu (sadece jpeg/png/webp/gif izinli)

**Düzeltme:**
- Toast/alert ile hata göster
- Dosya boyutu + tür kontrolü client-side yap (upload'dan önce)
- Upload progress bar ekle
- Paralel upload (Promise.all)

---

### 3. Satıcı Para Çekme Sayfası YOK

**Ne yok:** Seller panelinde para çekme talebi oluşturacak sayfa yok.  
**Mevcut durum:**
- `store_balance` tablosu var ✅
- `withdrawal_requests` tablosu var ✅
- Admin para çekme onay sayfası var (`/para-cekme`) ✅
- **Satıcı tarafı tamamen eksik** ❌

**Gerekli dosya:** `novastoreadmin-standalone/src/app/(seller)/seller/withdrawals/page.tsx`  
**İçermeli:**
- Mevcut bakiye gösterimi
- Çekilebilir bakiye
- Bekleyen/onaylanan/reddedilen talepler listesi
- Para çekme talep formu (tutar, IBAN onayı)

---

## 🟠 P1 — YÜKSEK (İş Akışını Kırıyor)

### 4. Satıcı Başvuru Formu Eksik Alanlar

**Mevcut form** (`apps/web/src/app/(main)/satici-ol/page.tsx`):

| Alan | Formda | DB'de | Admin UI'da |
|------|--------|-------|-------------|
| Mağaza adı | ✅ | ✅ | ✅ |
| Açıklama | ✅ | ✅ | ✅ |
| Yetkili adı | ✅ | — | — |
| Email/Telefon | ✅ | ✅ | ✅ |
| Adres/Şehir/İlçe | ✅ | ✅ | ✅ |
| Vergi no | ✅ | ✅ | ✅ |
| Banka adı | ✅ | ❌ (admin_notes'a) | ❌ |
| IBAN | ✅ | ❌ (admin_notes'a) | ❌ |
| Hesap no | ✅ | ❌ (admin_notes'a) | ❌ |
| **Şirket adı** | ❌ | ✅ (company_name) | ✅ |
| **Kimlik belgesi** | ❌ | ✅ (identity_document_url) | ✅ (link gösteriyor) |
| **Vergi levhası** | ❌ | ✅ (tax_certificate_url) | ✅ (link gösteriyor) |
| **Ticaret sicili** | ❌ | ✅ (business_license_url) | ✅ (link gösteriyor) |

**Sorunlar:**
- Banka bilgileri `admin_notes` string'ine yazılıyor → yapısal erişim yok
- Belge yükleme alanı hiç yok → admin "Kimlik belgesi" linkine tıklayınca boş
- `company_name` toplanmıyor → admin panelinde boş görünüyor

---

### 5. iyzico Alt Üye İşyeri Otomatik Kayıt Yok

**Mevcut durum:** Manuel `register-sub-merchants.js` script'i var ama:
- Yeni satıcı onaylandığında otomatik kayıt **yapılmıyor**
- Admin panelinde kayıt butonu **yok**
- Satıcı IBAN'ı olmadan kayıt **yapılamıyor**

**Gerekli:**
- Satıcı onaylandığında (approve endpoint) → otomatik iyzico sub-merchant kaydı
- IBAN/vergi bilgisi eksikse uyarı ver, kayıt yapılmasa bile devam et
- Admin panelinde "iyzico'ya Kaydet" butonu (manuel tetikleme)
- `stores.iyzico_sub_merchant_key` dolu/boş durumu gösterilmeli

---

### 6. Admin'de Satıcı Detay Sayfası Yok

**Mevcut:** `/saticilar` sadece liste — tıklayınca detay sayfası yok.  
**Admin göremez:**
- IBAN/banka bilgileri
- Vergi bilgileri detayı
- iyzico kayıt durumu
- Mağaza bakiyesi
- Satıcı istatistikleri (gelir, sipariş, ürün)
- Mağaza ayarlarını düzenleme

**Gerekli dosya:** `novastoreadmin-standalone/src/app/saticilar/[id]/page.tsx`

---

## 🟡 P2 — ORTA (Güvenlik ve UX)

### 7. Storage Policy Çok Açık

**Mevcut policy:**
```sql
INSERT: is_admin() OR (profiles.is_seller = true)
DELETE: is_admin() OR (profiles.is_seller = true)
```

**Sorun:** Herhangi bir satıcı, **başka bir satıcının** ürün resimlerini silebilir/üzerine yazabilir.

**Düzeltme:** Path-based ownership kontrolü ekle:
```sql
-- Satıcı sadece kendi store_id klasöründeki dosyaları yönetebilir
bucket_id = 'product-images' 
AND (storage.foldername(name))[1] IN (
  SELECT p.id::text FROM products p 
  JOIN stores s ON p.store_id = s.id 
  WHERE s.owner_id = auth.uid()
)
```

---

### 8. Silinen Ürün Resimleri Storage'da Kalıyor

Ürün silindiğinde veya düzenlenirken resim kaldırıldığında:
- `product_images` tablosundan satır siliniyor ✅
- Storage bucket'tan dosya **silinmiyor** ❌
- Zaman içinde orphan dosyalar birikir → maliyet artar

---

### 9. `/satici-sozlesmesi` Sayfası Yok

Satıcı başvuru formunda "Satıcı Sözleşmesi" linki var ama sayfa **404**.

---

### 10. Admin Kuponlar & Yorumlar Stub

- `/kuponlar` → "Planlanan özellikler" listesi, CRUD yok
- `/yorumlar` → "Planlanan özellikler" listesi, veri yok
- `store_reviews` tablosu DB'de var ama admin sayfası okumaz

---

## ⚪ P3 — DÜŞÜK (İyileştirme)

### 11. Müşteriler Sayfası Yetersiz
- Sabit 100 müşteri limiti, pagination yok
- Müşteri detay sayfası yok
- Aksiyon yok (engelle, sil, iletişim)

### 12. Admin Ayarları Çoğunluğu Disabled
- ✅ Komisyon ayarları çalışıyor
- ❌ Kargo ayarları → "Yakında"
- ❌ E-posta şablonları → "Yakında"
- ❌ Site ayarları → "Yakında"
- ❌ Güvenlik → "Yakında"

### 13. Seller Panel Navigasyonunda Eksik Linkler
- Satıcı paneli menüsünde "Para Çekme" / "Bakiye" linki yok
- "Profil/Mağaza Ayarları" linki var ama 404

---

## 🎯 ÖNCELİKLİ AKSİYON PLANI

### Faz 1 — Hemen (Ödeme akışını açmak için)
1. ✅ **Satıcı Profil Sayfası** — IBAN, banka, mağaza ayarları
2. ✅ **Resim yükleme düzeltme** — Hata gösterimi, client-side validasyon
3. ✅ **Satıcı başvuru formu** — Banka bilgilerini doğru kolonlara yaz, belge upload ekle

### Faz 2 — Kısa vadeli
4. **Para çekme sayfası** (satıcı)
5. **Satıcı detay sayfası** (admin)
6. **iyzico otomatik sub-merchant kaydı** (onay sırasında)
7. **Storage policy sıkılaştırma**

### Faz 3 — Orta vadeli
8. Kuponlar/Yorumlar CRUD
9. Satıcı sözleşmesi sayfası
10. Admin ayarları (kargo, email, site)
11. Müşteri yönetimi iyileştirme

---

> **Not:** Bu rapordaki P0 maddeleri çözülmeden marketplace ödeme sistemi pratikte çalışamaz.  
> Satıcılar IBAN giremez → iyzico sub-merchant kaydı geçersiz → ödemeler reddedilir.
