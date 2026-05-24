# Nova Store - Resend E-posta Sistemi Detaylı Plan

> **Oluşturulma Tarihi:** 15 Ocak 2026  
> **Versiyon:** 1.0  
> **Durum:** 🚧 Planlama Aşaması

---

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [E-posta Senaryoları](#e-posta-senaryoları)
   - [Kimlik Doğrulama & Güvenlik](#1-kimlik-doğrulama--güvenlik)
   - [Sipariş Yönetimi](#2-sipariş-yönetimi)
   - [Finansal İşlemler](#3-finansal-işlemler)
   - [Ürün Yönetimi](#4-ürün-yönetimi)
   - [Müşteri İletişimi](#5-müşteri-iletişimi)
   - [Admin & Sistem](#6-admin--sistem-bildirimleri)
3. [Teknik Mimari](#teknik-mimari)
4. [Veritabanı Tasarımı](#veritabanı-tasarımı)
5. [Uygulama Aşamaları](#uygulama-aşamaları)
6. [Test Stratejisi](#test-stratejisi)
7. [Güvenlik & Compliance](#güvenlik--compliance)
8. [Monitoring & Analytics](#monitoring--analytics)

---

## Genel Bakış

### Proje Hedefi
Nova Store e-ticaret platformu için kapsamlı, güvenli ve kullanıcı dostu e-posta bildirim sistemi.

### Teknik Stack
- **E-posta Servisi:** Resend
- **Şablon Motoru:** React Email
- **Queue Sistemi:** [Detaylandırılacak]
- **Framework:** Next.js 14 App Router
- **Database:** Supabase PostgreSQL

### Başarı Kriterleri
- [ ] %99.5+ teslimat oranı
- [ ] <2 saniye gönderim süresi
- [ ] %40+ açılma oranı
- [ ] Spam skorunda A+ rating
- [ ] GDPR/KVKK uyumluluğu

---

## E-posta Senaryoları

### 1. Kimlik Doğrulama & Güvenlik

Bu bölümdeki e-postalar **transactional** kategorisindedir ve kullanıcı güvenliği için kritik kabul edilir.

#### 1.1 Amaç
- Hesap ele geçirilmesi riskini azaltmak
- Hesap işlemlerini (şifre sıfırlama, 2FA) güvenli ve izlenebilir yapmak
- Kullanıcıya “ben değilim” senaryosu için hızlı aksiyon kanalı sağlamak

#### 1.2 Temel Prensipler
- **Bilgi sızdırmama:** Şifre sıfırlama isteklerinde “bu e-posta kayıtlı mı?” bilgisini açığa çıkarmayacağız.
- **Tek kullanımlık token:** Şifre sıfırlama ve OTP kodları tek kullanımlık olacak.
- **Kısa süreli geçerlilik:** Reset linki 15 dk, OTP kodu 5 dk gibi kısa TTL.
- **Rate limit:** IP + e-posta + kullanıcı bazında hız limiti; brute-force ve spam önleme.
- **Denetlenebilirlik:** Her kritik olay için audit log (kim, ne zaman, hangi IP/cihaz).
- **İşlemsel e-postalar için unsubscribe yok:** Pazarlama tercihleri ayrı yönetilir.

#### 1.3 E-posta Türleri (Şablonlar)

##### 1.3.1 Şifre Sıfırlama (Forgot Password)
- **Trigger:** Kullanıcı “Şifremi unuttum” formunu gönderir.
- **Recipient:** Kullanıcının e-posta adresi.
- **Kullanıcı deneyimi:** Her zaman aynı mesaj: “Eğer bu e-posta kayıtlıysa link gönderildi”.
- **TTL:** 15 dakika.
- **Subject (TR):** "Nova Store | Şifre sıfırlama bağlantısı"
- **İçerik:** Reset linki + güvenlik notu (IP/cihaz) + “ben değilim” yönlendirmesi.
- **Gerekli veri alanları (template payload):**
   - `resetUrl` (tek kullanımlık, imzalı)
   - `requestedAt`
   - `ipAddress` (opsiyonel)
   - `userAgent` / `deviceLabel` (opsiyonel)
   - `supportUrl` (opsiyonel)

##### 1.3.2 Şifre Değiştirildi (Password Changed)
- **Trigger:** Şifre başarıyla değiştirildi.
- **Recipient:** Kullanıcının e-posta adresi.
- **Subject (TR):** "Nova Store | Şifreniz değiştirildi"
- **İçerik:** Tarih/saat + cihaz bilgisi + “ben değilim” aksiyonu (hesabı kilitleme / destek).
- **Not:** Bu e-posta, şifre reset akışı tamamlandıktan sonra da gönderilir.

##### 1.3.3 E-posta Doğrulama (Email Verification)
- **Trigger:** Yeni kayıt, e-posta değişikliği.
- **Recipient:** Kullanıcının yeni e-posta adresi.
- **TTL:** 24 saat (veya 60 dk; karar teknik mimaride netleşecek).
- **Subject (TR):** "Nova Store | E-posta adresinizi doğrulayın"
- **İçerik:** Doğrulama linki + e-posta değişikliği ise önceki e-postaya ayrıca bilgilendirme.

##### 1.3.4 2FA (E-posta ile OTP)
> Not: 2FA için “Authenticator app” tercih edilecekse bu senaryo güncellenecek. Şimdilik e-posta OTP üzerinden planlanmıştır.

- **Trigger:** 2FA açık kullanıcı giriş yapar / kritik işlem yapar (örn. para çekme).
- **Recipient:** Kullanıcının e-posta adresi.
- **TTL:** 5 dakika.
- **Subject (TR):** "Nova Store | Doğrulama kodunuz"
- **İçerik:** 6 haneli kod + geçerlilik süresi + “ben değilim” yönlendirmesi.
- **Gerekli veri alanları:**
   - `otpCode`
   - `expiresInMinutes`
   - `ipAddress` (opsiyonel)
   - `deviceLabel` (opsiyonel)
   - `actionLabel` (örn. “Giriş”, “Para çekme onayı”)

##### 1.3.5 Yeni Cihazdan Giriş Uyarısı
- **Trigger:** Kullanıcı daha önce görülmeyen cihaz/tarayıcı ile giriş yapar.
- **Recipient:** Kullanıcının e-posta adresi.
- **Subject (TR):** "Nova Store | Yeni cihazdan giriş tespit edildi"
- **İçerik:** Cihaz/konum/IP + “bu ben değilim” aksiyonu (oturumları kapat, şifre değiştir, 2FA aç).

##### 1.3.6 Şüpheli Aktivite / Hesap Kilitleme
- **Trigger:** Çoklu başarısız giriş, brute-force sinyali, anomali tespiti.
- **Recipient:** Kullanıcının e-posta adresi.
- **Subject (TR):** "Nova Store | Hesabınız güvenlik nedeniyle korumaya alındı"
- **İçerik:** Neler oldu + kilit süresi + kilidi açma adımları + destek.

#### 1.4 Güvenlik Notları (Uygulama Kriterleri)
- Reset token ve OTP değerleri **veritabanında hash’lenmiş** saklanacak (düz metin saklama yok).
- Token doğrulama başarısızlıkları rate limit’e dahil edilecek.
- Tek kullanımlık token tüketildikten sonra anında invalid edilecek.
- Şifre sıfırlama linki; kullanıcı girişli oturum gerektirmeden çalışmalı, ancak **CSRF/Origin** kontrolleri ve tek kullanımlık token ile güvence altına alınmalı.

#### 1.5 Minimum Kabul Kriterleri (Done Definition)
- Şifre sıfırlama: kullanıcı enumeration açığı olmadan çalışır.
- 2FA OTP: TTL, retry limit ve lockout kuralları tanımlıdır.
- E-posta logları: en az `sent/failed` ve hata sebebi kaydedilir.
- Kritik e-postalarda: tarih/saat ve (varsa) cihaz/IP bilgisi bulunur.

### 2. Sipariş Yönetimi

Sipariş yaşam döngüsü boyunca hem alıcı hem satıcı tarafına otomatik bildirimler gönderilerek şeffaf bir deneyim sağlanır.

#### 2.1 Amaç
- Sipariş durumunu anlık bilgilendirme
- Satıcıya aksiyon hatırlatmaları (kargo hazırlama, teslimat)
- Alıcıya teslimat süreci takibi
- Müşteri memnuniyeti ve güven artışı

#### 2.2 E-posta Türleri

##### 2.2.1 Sipariş Onayı (Alıcı)
- **Trigger:** Ödeme başarılı, sipariş oluşturuldu.
- **Recipient:** Alıcının e-posta adresi.
- **Priority:** High (transactional)
- **Subject (TR):** "Nova Store | Siparişiniz alındı #{{orderNumber}}"
- **İçerik:**
  - Sipariş numarası ve tarihi
  - Ürün listesi (görsel, ad, adet, fiyat)
  - Toplam tutar (ürün + kargo + indirim)
  - Teslimat adresi
  - Ödeme yöntemi
  - Tahmini teslimat tarihi
  - Sipariş takip linki
  - İptal/İade politikası linki
  - Fatura (PDF ek veya indirme linki)
- **Gerekli veri alanları:**
  - `orderNumber`, `orderDate`, `items[]`, `totalAmount`, `shippingAddress`, `paymentMethod`, `estimatedDelivery`, `trackingUrl`, `invoiceUrl`

##### 2.2.2 Yeni Sipariş Bildirimi (Satıcı)
- **Trigger:** Sipariş oluşturuldu ve satıcıya atandı.
- **Recipient:** Satıcının e-posta adresi.
- **Priority:** High
- **Subject (TR):** "🔔 Yeni Sipariş! #{{orderNumber}}"
- **İçerik:**
  - Sipariş numarası ve tarihi
  - Ürün bilgileri (satıcının ürünleri)
  - Alıcı teslimat bilgisi (ad, adres - kişisel bilgi maskelenebilir)
  - Hazırlama süresi hatırlatması ("24 saat içinde hazırlanmalı")
  - Kargo etiketi oluşturma linki
  - Admin panel sipariş detay linki
- **Gerekli veri alanları:**
  - `orderNumber`, `orderDate`, `items[]`, `shippingInfo`, `preparationDeadline`, `shippingLabelUrl`, `adminOrderUrl`

##### 2.2.3 Sipariş Hazırlık Hatırlatması (Satıcı)
- **Trigger:** Sipariş oluşturulduktan 12 saat sonra hala "hazırlanıyor" durumundaysa.
- **Recipient:** Satıcının e-posta adresi.
- **Priority:** Medium
- **Subject (TR):** "⏰ Hatırlatma: Sipariş #{{orderNumber}} hazırlanmayı bekliyor"
- **İçerik:**
  - Sipariş numarası
  - Kalan süre
  - Geç kargo cezası/uyarısı (varsa)
  - Hızlı aksiyon linkleri

##### 2.2.4 Kargo Çıkışı (Alıcı)
- **Trigger:** Satıcı kargo bilgilerini girdi, sipariş "kargoda" durumuna geçti.
- **Recipient:** Alıcının e-posta adresi.
- **Priority:** Medium
- **Subject (TR):** "📦 Siparişiniz kargoya verildi #{{orderNumber}}"
- **İçerik:**
  - Kargo firması adı
  - Kargo takip numarası
  - Kargo firması takip linki (direkt)
  - Tahmini teslimat tarihi
  - Ürün özeti

##### 2.2.5 Kargo Güncellemeleri (Alıcı)
- **Trigger:** Kargo durumu değişti (dağıtımda, şubede, teslimat denemesi vs.).
- **Recipient:** Alıcının e-posta adresi.
- **Priority:** Low
- **Subject (TR):** "📍 Kargo güncelleme: {{statusLabel}}"
- **İçerik:**
  - Güncel durum
  - Son konum bilgisi
  - Tahmini teslimat
- **Not:** Spam önlemek için sadece kritik durumlarda gönderilecek (örn. teslimat denemesi başarısız, şubede bekliyor).

##### 2.2.6 Teslimat Tamamlandı (Alıcı)
- **Trigger:** Kargo "teslim edildi" durumuna geçti.
- **Recipient:** Alıcının e-posta adresi.
- **Priority:** Medium
- **Subject (TR):** "✅ Siparişiniz teslim edildi #{{orderNumber}}"
- **İçerik:**
  - Teslimat tarihi ve saati
  - Teslim alan kişi
  - Ürün değerlendirme daveti (1 tıkla yıldız verme)
  - İade/değişim süresi hatırlatması
  - Benzer ürün önerileri

##### 2.2.7 Sipariş İptali (Alıcı + Satıcı)
- **Trigger:** Sipariş iptal edildi (alıcı veya satıcı tarafından, veya admin).
- **Recipient:** Her iki taraf.
- **Priority:** High
- **Subject (TR):** "❌ Sipariş iptal edildi #{{orderNumber}}"
- **İçerik:**
  - İptal nedeni
  - İptal eden taraf
  - İade süreci (varsa)
  - İade tutarı ve tahmini iade zamanı
  - Alternatif ürün önerileri (alıcı için)

##### 2.2.8 İade/Değişim Talebi (Satıcı + Admin)
- **Trigger:** Alıcı iade/değişim talebi oluşturdu.
- **Recipient:** Satıcı + admin.
- **Priority:** High
- **Subject (TR):** "🔄 İade talebi: Sipariş #{{orderNumber}}"
- **İçerik:**
  - Talep nedeni
  - Alıcı açıklaması
  - Fotoğraflar (varsa)
  - Onay/red aksiyon linkleri
  - İade politikası hatırlatması

#### 2.3 Sipariş E-posta Akış Diyagramı
```
Ödeme Başarılı
    ↓
[Alıcı] Sipariş Onayı + Fatura
    ↓
[Satıcı] Yeni Sipariş Bildirimi
    ↓
[Satıcı] (12 saat sonra) Hatırlatma (opsiyonel)
    ↓
Satıcı Kargo Bilgisi Girdi
    ↓
[Alıcı] Kargo Çıkışı
    ↓
[Alıcı] Kargo Güncellemeleri (opsiyonel)
    ↓
Teslimat Tamamlandı
    ↓
[Alıcı] Teslimat Onayı + Değerlendirme Daveti
    ↓
(3 gün sonra) [Alıcı] Değerlendirme Hatırlatması
```

#### 2.4 Minimum Kabul Kriterleri
- Sipariş onayı e-postası 5 saniye içinde gönderilir.
- Satıcı bildirimi anında iletilir.
- Kargo takip numarası doğru link ile birleştirilir.
- Teslimat sonrası değerlendirme davet oranı %30+ olmalı.

### 3. Finansal İşlemler

Satıcı ödemeleri, para çekme talepleri ve finansal bildirimleri içerir.

#### 3.1 Amaç
- Satıcıya kazanç şeffaflığı sağlama
- Para çekme taleplerini takip
- Admin için finansal denetim

#### 3.2 E-posta Türleri

##### 3.2.1 Ödeme Alındı (Satıcı)
- **Trigger:** Sipariş tamamlandı ve satıcının kazancı hesabına eklendi.
- **Recipient:** Satıcı.
- **Subject (TR):** "💰 Ödeme alındı - Sipariş #{{orderNumber}}"
- **İçerik:**
  - Sipariş numarası
  - Ürün tutarı
  - Komisyon oranı ve tutarı
  - Net kazanç
  - Güncel bakiye
  - Para çekme sayfası linki

##### 3.2.2 Para Çekme Talebi Alındı (Satıcı)
- **Trigger:** Satıcı para çekme talebinde bulundu.
- **Recipient:** Satıcı.
- **Subject (TR):** "📋 Para çekme talebiniz alındı"
- **İçerik:**
  - Talep numarası
  - Talep tutarı
  - IBAN/Hesap bilgisi
  - Tahmini işlem süresi (örn. 3-5 iş günü)
  - Durum takip linki

##### 3.2.3 Para Çekme Talebi Onaylandı (Satıcı)
- **Trigger:** Admin talebi onayladı, transfer başlatıldı.
- **Recipient:** Satıcı.
- **Subject (TR):** "✅ Para çekme talebiniz onaylandı"
- **İçerik:**
  - Onay tarihi
  - Transfer edilecek tutar
  - IBAN son 4 hanesi
  - Tahmini hesaba geçiş tarihi

##### 3.2.4 Para Transferi Tamamlandı (Satıcı)
- **Trigger:** Transfer gerçekleşti.
- **Recipient:** Satıcı.
- **Subject (TR):** "💳 Para transferi tamamlandı"
- **İçerik:**
  - Transfer tarihi
  - Tutar
  - Dekont/referans numarası
  - Güncel bakiye

##### 3.2.5 Para Çekme Talebi Reddedildi (Satıcı)
- **Trigger:** Admin talebi reddetti.
- **Recipient:** Satıcı.
- **Subject (TR):** "❌ Para çekme talebiniz reddedildi"
- **İçerik:**
  - Red nedeni (detaylı açıklama)
  - Yapılması gerekenler
  - Destek iletişim
  - Yeni talep oluşturma linki

##### 3.2.6 Bekleyen Para Çekme Talepleri (Admin)
- **Trigger:** Günlük/haftalık scheduled email.
- **Recipient:** Admin/finans ekibi.
- **Subject (TR):** "💼 Bekleyen {{count}} para çekme talebi"
- **İçerik:**
  - Talep listesi (satıcı, tutar, tarih)
  - Toplam tutar
  - Onay sayfası linki
  - Acil talepler vurgusu

##### 3.2.7 Günlük/Haftalık Satış Raporu (Admin)
- **Trigger:** Scheduled (her gün 09:00 veya pazartesi 09:00).
- **Recipient:** Admin.
- **Subject (TR):** "📊 {{period}} Satış Raporu"
- **İçerik:**
  - Toplam sipariş sayısı
  - Toplam ciro
  - Komisyon geliri
  - En çok satan ürünler
  - En aktif satıcılar
  - Grafik/özet (link veya inline görsel)

#### 3.3 Minimum Kabul Kriterleri
- Para çekme taleplerinde tutar ve IBAN doğru eşleştirilir.
- Admin bildirimlerinde hassas veriler (full IBAN) gösterilmez.
- Raporlar zamanında (scheduled) gönderilir.

### 4. Ürün Yönetimi

Satıcı ürün onay süreci, stok yönetimi ve ürün durumu bildirimleri.

#### 4.1 Amaç
- Satıcıya ürün onay sürecinde şeffaflık
- Stok uyarıları ile satış kaybını önleme
- Admin için ürün moderasyonu kolaylaştırma

#### 4.2 E-posta Türleri

##### 4.2.1 Yeni Ürün Onay Bekliyor (Admin)
- **Trigger:** Satıcı yeni ürün ekledi.
- **Recipient:** Admin/moderatör.
- **Subject (TR):** "🆕 Yeni ürün onay bekliyor: {{productName}}"
- **İçerik:**
  - Satıcı bilgisi
  - Ürün adı, kategori, fiyat
  - Ürün görselleri (thumbnail)
  - Onay/red linki (direkt aksiyon)
  - Admin panel ürün detay linki

##### 4.2.2 Ürün Onaylandı (Satıcı)
- **Trigger:** Admin ürünü onayladı.
- **Recipient:** Satıcı.
- **Subject (TR):** "✅ Ürününüz yayınlandı: {{productName}}"
- **İçerik:**
  - Ürün adı ve görseli
  - Yayın tarihi
  - Ürün sayfası linki (storefront)
  - Stok/fiyat düzenleme linki
  - İlk satış ipuçları

##### 4.2.3 Ürün Reddedildi (Satıcı)
- **Trigger:** Admin ürünü reddetti.
- **Recipient:** Satıcı.
- **Subject (TR):** "❌ Ürününüz onaylanamadı: {{productName}}"
- **İçerik:**
  - Red nedeni (detaylı, yapıcı)
  - Düzeltme önerileri
  - Ürün politikası linki
  - Düzenleme ve yeniden gönderme linki

##### 4.2.4 Stok Azaldı Uyarısı (Satıcı)
- **Trigger:** Stok belirli eşik değerine düştü (örn. ≤5).
- **Recipient:** Satıcı.
- **Subject (TR):** "📉 Stok azaldı: {{productName}}"
- **İçerik:**
  - Ürün adı ve görseli
  - Kalan stok miktarı
  - Son 7 gün satış hızı
  - Tahmini tükenme süresi
  - Stok ekleme linki
  - Otomatik stok kapatma uyarısı

##### 4.2.5 Stok Bitti (Satıcı)
- **Trigger:** Stok = 0, ürün otomatik pasife alındı.
- **Recipient:** Satıcı.
- **Subject (TR):** "🔴 Ürün stokta yok: {{productName}}"
- **İçerik:**
  - Ürün pasife alındı bildirimi
  - Son 30 gün satış istatistiği
  - Hızlı stok ekleme linki
  - Ürünü yeniden aktifleştirme talimatı

##### 4.2.6 Ürün Fiyat Değişikliği Onayı (Satıcı - Opsiyonel)
- **Trigger:** Satıcı fiyat değiştirdi.
- **Recipient:** Satıcı.
- **Subject (TR):** "💵 Fiyat güncellendi: {{productName}}"
- **İçerik:**
  - Eski fiyat
  - Yeni fiyat
  - Değişiklik tarihi
  - Not: Bu e-posta opsiyonel, ayarlarda kapatılabilir.

#### 4.3 Minimum Kabul Kriterleri
- Onay/red e-postaları 1 saat içinde gönderilir.
- Stok uyarıları gerçek zamanlıya yakın (5 dk içinde).
- Red nedenleri anlaşılır ve yapıcı olmalı.

### 5. Müşteri İletişimi

Pazarlama, promosyon ve müşteri bağlılığı odaklı e-postalar. **NOT:** Bu bölümdeki e-postalar için unsubscribe mekanizması zorunludur (GDPR/KVKK).

#### 5.1 Amaç
- Satışları artırmak
- Müşteri geri dönüşünü sağlamak
- Marka sadakati oluşturmak

#### 5.2 E-posta Türleri

##### 5.2.1 Hoş Geldiniz (Welcome Email)
- **Trigger:** Kullanıcı kaydı tamamlandı.
- **Recipient:** Yeni kullanıcı.
- **Subject (TR):** "🎉 Nova Store'a hoş geldiniz!"
- **İçerik:**
  - Karşılama mesajı
  - İlk alışverişe özel kupon (örn. %10 indirim)
  - Popüler kategoriler
  - Nasıl alışveriş yapılır (hızlı rehber)
  - Sosyal medya linkleri

##### 5.2.2 Kampanya Duyuruları
- **Trigger:** Manuel (admin tetikler) veya scheduled.
- **Recipient:** Abonelik tercihine göre kullanıcılar.
- **Subject (TR):** Kampanyaya özel (örn. "🔥 Kış İndirimi Başladı!")
- **İçerik:**
  - Kampanya detayları
  - İndirimli ürünler
  - Kupon kodu (varsa)
  - Geçerlilik süresi
  - CTA: "Alışverişe Başla"

##### 5.2.3 Doğum Günü İndirimi
- **Trigger:** Kullanıcının doğum günü (veya 1 hafta önce).
- **Recipient:** Doğum günü olan kullanıcı.
- **Subject (TR):** "🎂 Doğum gününüz kutlu olsun! Hediyemiz var"
- **İçerik:**
  - Kişiselleştirilmiş mesaj
  - Özel doğum günü kuponu
  - İlgi alanına göre ürün önerileri
  - Geçerlilik: 7-14 gün

##### 5.2.4 Sepet Hatırlatması (Abandoned Cart)
- **Trigger:** Kullanıcı sepete ürün ekledi ancak 24 saat içinde satın almadı.
- **Recipient:** Sepeti terk eden kullanıcı.
- **Subject (TR):** "🛒 Sepetinizde ürünler bekliyor!"
- **İçerik:**
  - Sepetteki ürünler (görsel + fiyat)
  - Fiyat değişikliği uyarısı (varsa)
  - Stok uyarısı (azalıyorsa)
  - Checkout linki
  - Opsiyonel: küçük indirim teşviki (%5)
- **Timing:**
  - 1. hatırlatma: 24 saat sonra
  - 2. hatırlatma: 72 saat sonra (indirim kuponu ile)

##### 5.2.5 Wishlist Ürün İndirime Girdi
- **Trigger:** Kullanıcının wishlist'indeki ürün indirime girdi.
- **Recipient:** İlgili kullanıcı.
- **Subject (TR):** "💝 Beğendiğiniz ürün indirimde!"
- **İçerik:**
  - Ürün adı ve görseli
  - Eski fiyat vs yeni fiyat
  - İndirim oranı
  - Hızlı satın alma linki
  - Stok durumu

##### 5.2.6 Önceki Siparişe Uygun Ürünler (Personalized Recommendations)
- **Trigger:** Sipariş teslim edildikten 7-14 gün sonra.
- **Recipient:** Sipariş veren kullanıcı.
- **Subject (TR):** "Bunları da beğenebilirsiniz 💡"
- **İçerik:**
  - Kişiselleştirilmiş ürün önerileri (AI/algoritma)
  - Önceki siparişle ilişkili kategoriler
  - Benzer ürünler
  - "Sizin için seçtik" mesajı

##### 5.2.7 Değerlendirme Davetiyesi
- **Trigger:** Sipariş teslim edildikten 3 gün sonra.
- **Recipient:** Sipariş sahibi.
- **Subject (TR):** "⭐ Deneyiminizi paylaşır mısınız?"
- **İçerik:**
  - Sipariş özeti
  - 1-tıkla yıldız verme (direkt link)
  - Yorum ekleme linki
  - Teşvik: "Yorum yapan ilk 100 kişiye %5 kupon"
  - Opsiyonel: ürün fotoğrafı ekleme daveti

##### 5.2.8 İnaktif Kullanıcı Geri Kazanma (Win-back)
- **Trigger:** Kullanıcı 30/60/90 gün boyunca giriş yapmadı.
- **Recipient:** İnaktif kullanıcı.
- **Subject (TR):** "Sizi özledik! 🎁 Özel teklifimiz var"
- **İçerik:**
  - "Neredesiniz?" mesajı
  - Özel geri dönüş kuponu (%15-20)
  - Yeni ürünler / trending items
  - Hesap silme bildirimi (90 gün sonra - opsiyonel)

##### 5.2.9 Anket Daveti
- **Trigger:** Manuel veya belirli aralıklarla.
- **Recipient:** Aktif kullanıcılar.
- **Subject (TR):** "Görüşünüz bizim için değerli 📋"
- **İçerik:**
  - Kısa anket linki (NPS, memnuniyet)
  - Tahmini süre (2-3 dakika)
  - Teşvik: anket doldurana %10 kupon

#### 5.3 E-posta Tercihleri (Unsubscribe Yönetimi)
- Kullanıcılar hangi e-posta türlerini almak istediklerini seçebilir:
  - ✅ Transactional (sipariş, güvenlik) → **kapatılamaz**
  - ☑ Kampanya ve promosyonlar
  - ☑ Kişiselleştirilmiş öneriler
  - ☑ Sepet hatırlatmaları
  - ☑ Wishlist bildirimleri
  - ☑ Anketler ve araştırmalar
- Her pazarlama e-postasında "Unsubscribe" linki zorunlu.
- Unsubscribe sonrası onay sayfası + tercihlerini değiştirme opsiyonu.

#### 5.4 Minimum Kabul Kriterleri
- Sepet hatırlatması %5+ dönüşüm oranı sağlamalı.
- Değerlendirme daveti %15+ tıklama oranı almalı.
- Unsubscribe işlemi tek tıkla çalışmalı (double opt-out yok).
- Tüm pazarlama e-postaları GDPR/KVKK uyumlu.

### 6. Admin & Sistem Bildirimleri

Sistem sağlığı, hata bildirimleri ve admin operasyonları için e-postalar.

#### 6.1 Amaç
- Kritik hataları hızlı tespit
- Sistem performansını izleme
- Admin ekibini bilgilendirme

#### 6.2 E-posta Türleri

##### 6.2.1 Kritik Hata Bildirimi
- **Trigger:** Production'da kritik hata (500, unhandled exception, database down).
- **Recipient:** Dev/ops ekibi.
- **Priority:** Critical
- **Subject (TR):** "🚨 [CRITICAL] {{errorType}} - {{service}}"
- **İçerik:**
  - Hata mesajı
  - Stack trace
  - İlgili request (URL, method, IP)
  - Zaman damgası
  - Log dosyası linki
  - Sentry/monitoring tool linki

##### 6.2.2 Ödeme Hatası Bildirimi
- **Trigger:** Ödeme işlemi başarısız (gateway hatası, network issue).
- **Recipient:** Admin + finans.
- **Subject (TR):** "💳 Ödeme hatası: Sipariş #{{orderNumber}}"
- **İçerik:**
  - Kullanıcı bilgisi (ID, e-posta)
  - Sipariş detayları
  - Hata kodu ve mesajı
  - Gateway response
  - Aksiyon önerisi

##### 6.2.3 Yüksek Sipariş Hacmi Uyarısı
- **Trigger:** Saatlik/günlük sipariş sayısı %200 arttı (ani trafik).
- **Recipient:** Admin + ops.
- **Subject (TR):** "📈 Yüksek sipariş hacmi tespit edildi"
- **İçerik:**
  - Güncel sipariş sayısı
  - Normal ortalama
  - Artış oranı
  - Sistem kaynak durumu (CPU, memory)
  - Scaling önerisi

##### 6.2.4 Stok Kritik Seviye (Global)
- **Trigger:** Toplamda X ürün stokta kalmadı.
- **Recipient:** Admin + satış ekibi.
- **Subject (TR):** "📦 {{count}} ürün stokta yok"
- **İçerik:**
  - Stokta olmayan popüler ürünler listesi
  - Satıcılara hatırlatma gönderildi mi?
  - Kategori bazında dağılım

##### 6.2.5 Şüpheli Kullanıcı Aktivitesi
- **Trigger:** Fraud detection (çoklu hesap, fake sipariş, kartlı işlem şüphesi).
- **Recipient:** Admin + güvenlik ekibi.
- **Subject (TR):** "⚠️ Şüpheli aktivite: {{activityType}}"
- **İçerik:**
  - Kullanıcı bilgisi
  - Şüpheli davranış türü
  - İlgili siparişler/işlemler
  - IP/cihaz bilgisi
  - Aksiyon önerileri (blok, inceleme)

##### 6.2.6 Haftalık/Aylık Sistem Sağlık Raporu
- **Trigger:** Scheduled (pazartesi 09:00, ayın ilk günü).
- **Recipient:** Admin + ops + management.
- **Subject (TR):** "🏥 {{period}} Sistem Sağlık Raporu"
- **İçerik:**
  - Uptime %
  - Ortalama response time
  - Hata oranı
  - E-posta teslimat oranı
  - Database performansı
  - Kullanıcı aktivitesi (DAU/MAU)
  - Öneriler ve aksiyonlar

##### 6.2.7 Bakım/Deployment Bildirimi
- **Trigger:** Manuel (deployment öncesi).
- **Recipient:** Admin + ekip.
- **Subject (TR):** "🔧 Planlı bakım: {{date}} {{time}}"
- **İçerik:**
  - Bakım tarihi ve saati
  - Tahmini süre
  - Etkilenecek servisler
  - Downtime var mı?
  - Rollback planı

##### 6.2.8 Yeni Kullanıcı Kaydı Özeti (Günlük)
- **Trigger:** Scheduled (her gün 09:00).
- **Recipient:** Admin.
- **Subject (TR):** "👥 Dün {{count}} yeni kullanıcı kaydoldu"
- **İçerik:**
  - Toplam yeni kullanıcı
  - Kaynak (organik, reklam, referral)
  - E-posta doğrulama oranı
  - İlk sipariş oranı

#### 6.3 Minimum Kabul Kriterleri
- Kritik hatalar 1 dakika içinde bildirilir.
- Sistem raporları zamanında (scheduled) gönderilir.
- False positive oranı %5'in altında tutulur.

---

## Teknik Mimari

### 3.1 Sistem Tasarımı

```
┌──────────────────────┐
│  Next.js App Router  │
│  (API Routes)        │
└───────┬──────────────┘
        │
        v
┌───────┴──────────────┐
│   EmailService      │
│   - sendEmail()    │
│   - queueEmail()   │
│   - renderTemplate │
└─────┬───────┬────────┘
      │       │
      v       v
  ┌───┴───┐ ┌─┴────────────┐
  │ Resend │ │ Supabase    │
  │  API   │ │ (Queue)     │
  └───────┘ │ email_queue │
              └─────────────┘
```

### 3.2 Klasör Yapısı

```
apps/admin/ (veya apps/web/)
├── src/
│   ├── lib/
│   │   ├── email/
│   │   │   ├── service.ts           # EmailService class
│   │   │   ├── queue.ts             # Queue yönetimi
│   │   │   ├── logger.ts            # E-posta loglama
│   │   │   ├── types.ts             # Type definitions
│   │   │   └── templates/
│   │   │       ├── base/
│   │   │       │   ├── layout.tsx       # Base layout (header/footer)
│   │   │       │   ├── components.tsx   # Reusable components
│   │   │       │   └── styles.ts        # Inline styles
│   │   │       ├── auth/
│   │   │       │   ├── password-reset.tsx
│   │   │       │   ├── password-changed.tsx
│   │   │       │   ├── otp-code.tsx
│   │   │       │   ├── new-device.tsx
│   │   │       │   └── email-verification.tsx
│   │   │       ├── orders/
│   │   │       │   ├── order-confirmation.tsx
│   │   │       │   ├── order-shipped.tsx
│   │   │       │   ├── order-delivered.tsx
│   │   │       │   ├── new-order-seller.tsx
│   │   │       │   └── order-reminder-seller.tsx
│   │   │       ├── finance/
│   │   │       │   ├── payment-received.tsx
│   │   │       │   ├── withdrawal-approved.tsx
│   │   │       │   └── withdrawal-completed.tsx
│   │   │       ├── products/
│   │   │       │   ├── product-approved.tsx
│   │   │       │   ├── product-rejected.tsx
│   │   │       │   └── stock-alert.tsx
│   │   │       ├── marketing/
│   │   │       │   ├── welcome.tsx
│   │   │       │   ├── abandoned-cart.tsx
│   │   │       │   ├── birthday.tsx
│   │   │       │   └── campaign.tsx
│   │   │       └── admin/
│   │   │           ├── critical-error.tsx
│   │   │           ├── daily-report.tsx
│   │   │           └── pending-withdrawals.tsx
│   │   └── supabase/
│   │       └── client.ts
│   └── app/
│       └── api/
│           ├── email/
│           │   ├── send/route.ts        # Manuel e-posta gönderme
│           │   ├── preview/route.ts     # Şablon önizleme
│           │   └── webhook/route.ts     # Resend webhooks
│           └── cron/
│               ├── process-email-queue/route.ts
│               ├── daily-reports/route.ts
│               └── abandoned-carts/route.ts
└── package.json
```

### 3.3 Core Service: `EmailService`

```typescript
// src/lib/email/service.ts
import { Resend } from 'resend';
import { createClient } from '../supabase/client';

export class EmailService {
  private resend: Resend;
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.supabase = createClient();
  }

  /**
   * Anında e-posta gönder (transactional için)
   */
  async sendEmail(params: SendEmailParams): Promise<SendResult> {
    try {
      // 1. Rate limit kontrolü
      await this.checkRateLimit(params.to);

      // 2. Şablonu render et
      const html = await this.renderTemplate(params.template, params.data);

      // 3. Resend ile gönder
      const result = await this.resend.emails.send({
        from: params.from || process.env.RESEND_FROM_EMAIL,
        to: params.to,
        subject: params.subject,
        html,
        reply_to: params.replyTo,
      });

      // 4. Logla
      await this.logEmail({
        recipient: params.to,
        template: params.template,
        status: 'sent',
        resend_id: result.id,
      });

      return { success: true, id: result.id };
    } catch (error) {
      await this.logEmail({
        recipient: params.to,
        template: params.template,
        status: 'failed',
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Kuyruk sistemine ekle (batch için)
   */
  async queueEmail(params: QueueEmailParams): Promise<void> {
    await this.supabase.from('email_queue').insert({
      recipient: params.to,
      template: params.template,
      data: params.data,
      subject: params.subject,
      priority: params.priority || 'medium',
      scheduled_at: params.scheduledAt || new Date(),
    });
  }

  /**
   * React Email şablonunu render et
   */
  private async renderTemplate(template: string, data: any): Promise<string> {
    const { render } = await import('@react-email/render');
    const TemplateComponent = await this.loadTemplate(template);
    return render(<TemplateComponent {...data} />);
  }

  /**
   * Rate limit kontrolü (spam önleme)
   */
  private async checkRateLimit(email: string): Promise<void> {
    const { count } = await this.supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .eq('recipient', email)
      .gte('sent_at', new Date(Date.now() - 60 * 60 * 1000)); // son 1 saat

    if (count > 10) {
      throw new Error('Rate limit exceeded');
    }
  }

  // ... diğer metodlar
}
```

### 3.4 Queue İşleme (Cron Job)

```typescript
// src/app/api/cron/process-email-queue/route.ts
import { NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/service';

export async function GET(request: Request) {
  // Vercel Cron auth
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const emailService = new EmailService();
  
  // Bekleyen e-postaları al (en yüksek öncelik)
  const { data: queue } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date())
    .order('priority', { ascending: false })
    .limit(50);

  let processed = 0;
  for (const item of queue) {
    try {
      await emailService.sendEmail({
        to: item.recipient,
        subject: item.subject,
        template: item.template,
        data: item.data,
      });

      // Başarılı - queue'dan sil
      await supabase.from('email_queue').delete().eq('id', item.id);
      processed++;
    } catch (error) {
      // Başarısız - retry count artır
      await supabase
        .from('email_queue')
        .update({ 
          retry_count: item.retry_count + 1,
          last_error: error.message,
          status: item.retry_count >= 3 ? 'failed' : 'pending',
        })
        .eq('id', item.id);
    }
  }

  return NextResponse.json({ processed });
}
```

### 3.5 React Email Şablon Örneği

```tsx
// src/lib/email/templates/orders/order-confirmation.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface OrderConfirmationProps {
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    image: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  trackingUrl: string;
}

export default function OrderConfirmation({
  orderNumber,
  orderDate,
  items,
  totalAmount,
  trackingUrl,
}: OrderConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>Siparişiniz alındı #{orderNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://novastore.com/logo.png"
            width="150"
            height="50"
            alt="Nova Store"
          />
          <Heading style={h1}>Siparişiniz alındı!</Heading>
          <Text style={text}>
            Teşekkürler! Siparişiniz başarıyla alındı ve işleme alındı.
          </Text>

          <Section style={orderInfo}>
            <Text><strong>Sipariş No:</strong> {orderNumber}</Text>
            <Text><strong>Tarih:</strong> {orderDate}</Text>
          </Section>

          {items.map((item, index) => (
            <Section key={index} style={itemSection}>
              <Img src={item.image} width="80" height="80" />
              <div>
                <Text>{item.name}</Text>
                <Text>Adet: {item.quantity} x {item.price} TL</Text>
              </div>
            </Section>
          ))}

          <Section style={total}>
            <Text><strong>Toplam:</strong> {totalAmount} TL</Text>
          </Section>

          <Link href={trackingUrl} style={button}>
            Siparişimi Takip Et
          </Link>

          <Text style={footer}>
            Sorularınız için: info@novastore.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: '#f6f9fc', fontFamily: 'Arial, sans-serif' };
const container = { margin: '0 auto', padding: '20px', maxWidth: '600px' };
// ... diğer stiller
```

### 3.6 Teknoloji Stack Detayı

| Katman | Teknoloji | Açıklama |
|--------|-----------|------------|
| **E-posta Servisi** | Resend | Transactional email API, yüksek deliverability |
| **Şablon** | React Email | TSX ile tip-safe e-posta şablonları |
| **Queue** | Supabase (PostgreSQL) | Native queue table, Realtime subs opsiyonel |
| **Cron Jobs** | Vercel Cron | Scheduled tasks (queue işleme, raporlar) |
| **Rate Limit** | Supabase RLS + App Logic | IP/user bazında hiz limiti |
| **Logging** | Supabase + Resend Webhooks | E-posta delivery tracking |
| **Monitoring** | Resend Dashboard + Custom | Açılma/tıklama/bounce metrikleri |

### 3.7 Environment Variables

```env
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=bildirim@novastore.com
RESEND_FROM_NAME="Nova Store"

# Webhook doğrulama
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Cron auth
CRON_SECRET=xxxxxxxxxxxxxxxxxxxxxxx

# Rate limits
EMAIL_RATE_LIMIT_HOURLY=10
EMAIL_RATE_LIMIT_DAILY=50

# Feature flags
ENABLE_EMAIL_QUEUE=true
ENABLE_MARKETING_EMAILS=true
```

---

## Veritabanı Tasarımı

### 4.1 Tablolar

#### 4.1.1 `email_logs`
Tüm gönderilen e-postaların kaydi.

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  resend_id TEXT, -- Resend email ID
  error TEXT,
  
  -- Metadata
  data JSONB, -- Şablona gönderilen data
  
  -- Tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  
  -- Analytics
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_template ON email_logs(template);
```

#### 4.1.2 `email_queue`
Gönderilmeyi bekleyen e-postalar.

```sql
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  data JSONB NOT NULL,
  
  -- Scheduling
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_queue_status_priority ON email_queue(status, priority DESC, scheduled_at);
CREATE INDEX idx_email_queue_scheduled ON email_queue(scheduled_at) WHERE status = 'pending';
```

#### 4.1.3 `email_preferences`
Kullanıcı e-posta tercihleri.

```sql
CREATE TABLE email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  
  -- Subscriptions (transactional her zaman true)
  marketing BOOLEAN DEFAULT true,
  product_updates BOOLEAN DEFAULT true,
  order_updates BOOLEAN DEFAULT true, -- cannot be disabled
  abandoned_cart BOOLEAN DEFAULT true,
  wishlist_alerts BOOLEAN DEFAULT true,
  review_requests BOOLEAN DEFAULT true,
  newsletters BOOLEAN DEFAULT false,
  
  -- Frequency
  frequency TEXT DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly')),
  
  -- Unsubscribe
  unsubscribed_all BOOLEAN DEFAULT false,
  unsubscribed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_prefs_user_id ON email_preferences(user_id);
CREATE INDEX idx_email_prefs_email ON email_preferences(email);
```

#### 4.1.4 `email_unsubscribes`
Unsubscribe logları (GDPR compliance).

```sql
CREATE TABLE email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT,
  category TEXT, -- 'marketing', 'newsletters' etc.
  user_agent TEXT,
  ip_address INET,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_unsubs_email ON email_unsubscribes(email);
```

#### 4.1.5 `email_templates_analytics`
Şablon performans metrikleri.

```sql
CREATE TABLE email_templates_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template TEXT NOT NULL,
  period DATE NOT NULL, -- daily aggregation
  
  -- Counts
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  
  -- Rates (calculated)
  open_rate DECIMAL(5,2),
  click_rate DECIMAL(5,2),
  bounce_rate DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(template, period)
);

CREATE INDEX idx_email_analytics_template ON email_templates_analytics(template, period DESC);
```

### 4.2 RLS Policies

```sql
-- email_logs: Kullanıcılar sadece kendi loglarını görebilir
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email logs"
  ON email_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON email_logs FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- email_preferences: Kullanıcılar sadece kendi tercihlerini yönetebilir
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON email_preferences FOR ALL
  USING (auth.uid() = user_id);

-- email_queue: Sadece service role erişebilir
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON email_queue FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

### 4.3 Functions & Triggers

#### 4.3.1 Otomatik Tercihleri Oluşturma

```sql
CREATE OR REPLACE FUNCTION create_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_preferences (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_email_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_email_preferences();
```

#### 4.3.2 Analytics Güncelleme

```sql
CREATE OR REPLACE FUNCTION update_email_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Günlük template analytics güncelle
  INSERT INTO email_templates_analytics (template, period, sent_count)
  VALUES (NEW.template, CURRENT_DATE, 1)
  ON CONFLICT (template, period) 
  DO UPDATE SET 
    sent_count = email_templates_analytics.sent_count + 1;
  
  -- Status değişikliğinde
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'opened' AND OLD.status != 'opened' THEN
      UPDATE email_templates_analytics
      SET opened_count = opened_count + 1
      WHERE template = NEW.template AND period = CURRENT_DATE;
    END IF;
    -- ... diğer statuslar için
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_email_log_analytics
  AFTER INSERT OR UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_analytics();
```

#### 4.3.3 Rate Limit Fonksiyonu

```sql
CREATE OR REPLACE FUNCTION check_email_rate_limit(
  p_recipient TEXT,
  p_limit_hourly INTEGER DEFAULT 10,
  p_limit_daily INTEGER DEFAULT 50
)
RETURNS BOOLEAN AS $$
DECLARE
  v_hourly_count INTEGER;
  v_daily_count INTEGER;
BEGIN
  -- Son 1 saat
  SELECT COUNT(*) INTO v_hourly_count
  FROM email_logs
  WHERE recipient = p_recipient
    AND sent_at >= NOW() - INTERVAL '1 hour';
  
  IF v_hourly_count >= p_limit_hourly THEN
    RETURN FALSE;
  END IF;
  
  -- Son 24 saat
  SELECT COUNT(*) INTO v_daily_count
  FROM email_logs
  WHERE recipient = p_recipient
    AND sent_at >= NOW() - INTERVAL '24 hours';
  
  IF v_daily_count >= p_limit_daily THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### 4.4 Migration Dosyası

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_email_system.sql

-- 1. Tables
-- (yukarıdaki CREATE TABLE ifadeleri)

-- 2. Indexes
-- (yukarıdaki CREATE INDEX ifadeleri)

-- 3. RLS Policies
-- (yukarıdaki POLICY ifadeleri)

-- 4. Functions & Triggers
-- (yukarıdaki CREATE FUNCTION ifadeleri)

-- 5. Initial data (opsiyonel)
INSERT INTO email_templates_analytics (template, period, sent_count)
SELECT 
  template,
  CURRENT_DATE,
  0
FROM (
  VALUES 
    ('auth/password-reset'),
    ('orders/order-confirmation'),
    ('marketing/welcome')
  -- ... diğer şablonlar
) AS t(template)
ON CONFLICT DO NOTHING;
```

### 4.5 Backup & Retention

```sql
-- Eski logları arşivleme (cron job ile çalıştırılacak)
CREATE TABLE email_logs_archive (
  LIKE email_logs INCLUDING ALL
);

-- 90 günden eski logları arşivle
CREATE OR REPLACE FUNCTION archive_old_email_logs()
RETURNS INTEGER AS $$
DECLARE
  v_archived_count INTEGER;
BEGIN
  WITH moved_rows AS (
    DELETE FROM email_logs
    WHERE sent_at < NOW() - INTERVAL '90 days'
    RETURNING *
  )
  INSERT INTO email_logs_archive
  SELECT * FROM moved_rows;
  
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Uygulama Aşamaları

### ✅ Aşama 0: Planlama
- [x] E-posta senaryoları belirleme
- [x] Teknik stack seçimi
- [ ] Detaylı dokümantasyon

### 🔴 Aşama 1: Altyapı Kurulumu (Kritik - 2-3 gün)
- [ ] Resend hesap oluşturma ve API key alma
- [ ] Resend SDK kurulumu
- [ ] React Email kurulumu
- [ ] Base email layout tasarımı
- [ ] Environment yapılandırması

### 🔴 Aşama 2: Kritik E-postalar (1 hafta)
- [ ] Şifre sıfırlama
- [ ] 2FA doğrulama kodları
- [ ] Sipariş onayı (alıcı)
- [ ] Yeni sipariş bildirimi (satıcı)

### 🟡 Aşama 3: İşlemsel E-postalar (2 hafta)
- [ ] Kargo bildirimleri
- [ ] Ürün onay/red
- [ ] Ödeme bildirimleri
- [ ] Güvenlik uyarıları

### 🟢 Aşama 4: Pazarlama & İleri Özellikler (3-4 hafta)
- [ ] Kampanya e-postaları
- [ ] Sepet hatırlatması
- [ ] Wishlist bildirimleri
- [ ] Değerlendirme davetleri

### 🔵 Aşama 5: Monitoring & Optimizasyon (Sürekli)
- [ ] Analytics dashboard
- [ ] A/B testing
- [ ] Performance optimization
- [ ] Deliverability monitoring

---

## Test Stratejisi

### 5.1 Test Katmanları

#### 5.1.1 Unit Tests

EmailService fonksiyonlarını izole test etme.

```typescript
// __tests__/lib/email/service.test.ts
import { EmailService } from '@/lib/email/service';
import { Resend } from 'resend';

jest.mock('resend');

describe('EmailService', () => {
  let emailService: EmailService;
  let mockResend: jest.Mocked<Resend>;

  beforeEach(() => {
    mockResend = new Resend() as jest.Mocked<Resend>;
    emailService = new EmailService();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      mockResend.emails.send.mockResolvedValue({ id: 'test-id' });

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        template: 'auth/password-reset',
        data: { resetUrl: 'https://...' },
      });

      expect(result.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalledTimes(1);
    });

    it('should throw on rate limit exceeded', async () => {
      // Mock: 11 e-posta son 1 saatte gönderilmiş
      jest.spyOn(emailService as any, 'checkRateLimit')
        .mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(
        emailService.sendEmail({
          to: 'spam@example.com',
          subject: 'Test',
          template: 'test',
          data: {},
        })
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('queueEmail', () => {
    it('should add email to queue', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ data: {}, error: null });
      jest.spyOn(emailService as any, 'supabase').mockReturnValue({
        from: () => ({ insert: mockInsert }),
      });

      await emailService.queueEmail({
        to: 'test@example.com',
        subject: 'Test',
        template: 'marketing/campaign',
        data: {},
        priority: 'low',
      });

      expect(mockInsert).toHaveBeenCalled();
    });
  });
});
```

#### 5.1.2 Integration Tests

Tam akış testleri (şablon render + gönderim).

```typescript
// __tests__/lib/email/integration.test.ts
import { EmailService } from '@/lib/email/service';
import { createClient } from '@/lib/supabase/client';

describe('Email Integration Tests', () => {
  let emailService: EmailService;

  beforeAll(() => {
    // Test Resend API key kullan
    process.env.RESEND_API_KEY = 'test_key';
    emailService = new EmailService();
  });

  it('should render and send order confirmation email', async () => {
    const result = await emailService.sendEmail({
      to: 'test@novastore.com',
      subject: 'Siparişiniz alındı #12345',
      template: 'orders/order-confirmation',
      data: {
        orderNumber: '12345',
        orderDate: '2026-01-15',
        items: [
          {
            name: 'Test Ürün',
            image: 'https://...',
            quantity: 2,
            price: 100,
          },
        ],
        totalAmount: 200,
        trackingUrl: 'https://...',
      },
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();

    // Log kaydını kontrol et
    const { data: log } = await createClient()
      .from('email_logs')
      .select('*')
      .eq('resend_id', result.id)
      .single();

    expect(log.status).toBe('sent');
    expect(log.template).toBe('orders/order-confirmation');
  });
});
```

#### 5.1.3 Template Preview Tests

Şablonların doğru render edildiğini doğrulama.

```typescript
// __tests__/lib/email/templates/preview.test.tsx
import { render } from '@react-email/render';
import OrderConfirmation from '@/lib/email/templates/orders/order-confirmation';

describe('Email Templates', () => {
  describe('OrderConfirmation', () => {
    it('should render with all props', () => {
      const html = render(
        <OrderConfirmation
          orderNumber="12345"
          orderDate="2026-01-15"
          items={[
            {
              name: 'Test Ürün',
              image: 'https://example.com/image.jpg',
              quantity: 2,
              price: 100,
            },
          ]}
          totalAmount={200}
          trackingUrl="https://novastore.com/track/12345"
        />
      );

      expect(html).toContain('Siparişiniz alındı');
      expect(html).toContain('12345');
      expect(html).toContain('Test Ürün');
      expect(html).toContain('200');
    });

    it('should include tracking link', () => {
      const html = render(
        <OrderConfirmation
          {...mockProps}
          trackingUrl="https://novastore.com/track/12345"
        />
      );

      expect(html).toContain('href="https://novastore.com/track/12345"');
    });
  });
});
```

### 5.2 E2E Tests (Playwright)

```typescript
// e2e/email-flows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Email Flows', () => {
  test('Password reset flow', async ({ page, context }) => {
    // 1. Şifre sıfırlama isteği
    await page.goto('/forgot-password');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // 2. E-posta gönderildi mesajı
    await expect(page.locator('text=E-posta gönderildi')).toBeVisible();

    // 3. Test inbox'ından e-postayı al (Mailhog/Mailtrap kullanarak)
    const emailContent = await getLatestEmail('test@example.com');
    expect(emailContent.subject).toContain('Şifre sıfırlama');

    // 4. Reset linkine tıkla
    const resetLink = extractLinkFromEmail(emailContent.html);
    await page.goto(resetLink);

    // 5. Yeni şifre belirle
    await page.fill('input[name="password"]', 'NewPassword123!');
    await page.fill('input[name="confirmPassword"]', 'NewPassword123!');
    await page.click('button[type="submit"]');

    // 6. Başarılı mesajı
    await expect(page.locator('text=Şifreniz değiştirildi')).toBeVisible();

    // 7. "Şifre değiştirildi" e-postası geldi mi?
    const confirmEmail = await getLatestEmail('test@example.com');
    expect(confirmEmail.subject).toContain('Şifreniz değiştirildi');
  });
});
```

### 5.3 Manuel Test Checklist

#### 5.3.1 Şablon Görsel Testleri

- [ ] **Desktop görünüm** (Outlook, Gmail, Apple Mail)
- [ ] **Mobile görünüm** (iOS Mail, Gmail App)
- [ ] **Dark mode** desteği
- [ ] **RTL dil** desteği (gelecek için)
- [ ] **Görsel yükleme** (tüm görseller görünüyor mu?)
- [ ] **Link çalışıyor mu?** (tracking, CTA, unsubscribe)
- [ ] **Spam testi** (Mail Tester, SpamAssassin)

#### 5.3.2 Fonksiyonel Testler

- [ ] E-posta doğru alıcıya gidiyor mu?
- [ ] Subject line doğru mu?
- [ ] Dinamik veriler doğru render ediliyor mu?
- [ ] Unsubscribe linki çalışıyor mu?
- [ ] Rate limit koruması aktif mi?
- [ ] Queue sistemi düzgün çalışıyor mu?
- [ ] Retry mekanizması çalışıyor mu?
- [ ] Webhook'lar doğru loglama yapıyor mu?

### 5.4 Test Araçları

| Araç | Amaç | Kullanım |
|------|------|----------|
| **Jest** | Unit/Integration tests | `pnpm test` |
| **Playwright** | E2E tests | `pnpm e2e` |
| **React Email Preview** | Şablon görsel kontrol | `pnpm email:dev` |
| **Mailtrap** | Test e-posta inbox | Development ortamı |
| **Mail Tester** | Spam skoru kontrolü | mail-tester.com |
| **Litmus** | Email client testleri | litmus.com (opsiyonel) |
| **K6** | Load testing | Yüksek hacim senaryoları |

### 5.5 Test Coverage Hedefleri

- **Unit Tests:** %80+ coverage
- **Integration Tests:** Tüm kritik akışlar (auth, orders, payments)
- **E2E Tests:** En az 10 temel senaryo
- **Visual Tests:** Her şablon için desktop + mobile

### 5.6 CI/CD Pipeline

```yaml
# .github/workflows/email-tests.yml
name: Email Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run unit tests
        run: pnpm test:email
      
      - name: Build email templates
        run: pnpm email:build
      
      - name: Run E2E tests
        run: pnpm e2e:email
        env:
          RESEND_API_KEY: ${{ secrets.RESEND_TEST_API_KEY }}
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Güvenlik & Compliance

### 6.1 GDPR/KVKK Uyumluluğu

#### 6.1.1 Veri Toplama & Saklama

**Toplanan Veriler:**
- E-posta adresi
- Gönderim zamanı
- Açılma/tıklama metrikleri
- IP adresi (opsiyonel, analytics için)
- User agent (cihaz bilgisi)

**Saklama Süreleri:**
- **Transactional emails:** 2 yıl (yasal zorunluluk)
- **Marketing emails:** 1 yıl veya unsubscribe edilene kadar
- **Analytics data:** 1 yıl, sonra anonim hale getirilir
- **Unsubscribe records:** Süresiz (compliance için)

**Kullanıcı Hakları:**
- ✅ **Erişim hakkı:** Kullanıcı kendi e-posta loglarını görebilir
- ✅ **Silme hakkı:** Hesap silindiğinde e-posta verileri de silinir
- ✅ **Taşınabilirlik:** E-posta geçmişi export edilebilir
- ✅ **İtiraz hakkı:** Marketing e-postalarından çıkma (unsubscribe)

```typescript
// API endpoint: GET /api/user/email-history
export async function GET(request: Request) {
  const userId = await getUserId(request);
  
  const { data } = await supabase
    .from('email_logs')
    .select('template, subject, sent_at, status')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false });
  
  return Response.json(data);
}

// API endpoint: DELETE /api/user/data
export async function DELETE(request: Request) {
  const userId = await getUserId(request);
  
  // Kullanıcı verilerini sil (GDPR Right to Erasure)
  await supabase.from('email_logs').delete().eq('user_id', userId);
  await supabase.from('email_preferences').delete().eq('user_id', userId);
  
  return Response.json({ success: true });
}
```

#### 6.1.2 Consent Management

**Double Opt-in (Yeni Kullanıcılar):**
```typescript
// Kayıt sonrası e-posta doğrulama zorunlu
async function handleNewUser(userId: string, email: string) {
  // 1. E-posta doğrulama linki gönder
  await emailService.sendEmail({
    to: email,
    template: 'auth/email-verification',
    subject: 'E-posta adresinizi doğrulayın',
    data: { verificationUrl: generateVerificationUrl(userId) },
  });
  
  // 2. Default preferences (marketing = false until consent)
  await supabase.from('email_preferences').insert({
    user_id: userId,
    email,
    marketing: false, // Kullanıcı açıkça onay verene kadar
    order_updates: true, // Transactional her zaman true
  });
}
```

**Marketing Consent:**
```typescript
// Kullanıcı tercih sayfasında marketing'i açtığında
async function updateMarketingConsent(userId: string, consent: boolean) {
  await supabase
    .from('email_preferences')
    .update({ 
      marketing: consent,
      updated_at: new Date(),
    })
    .eq('user_id', userId);
  
  // Log consent değişikliğini (audit trail)
  await supabase.from('consent_logs').insert({
    user_id: userId,
    consent_type: 'marketing_emails',
    granted: consent,
    ip_address: getClientIP(),
  });
}
```

#### 6.1.3 Unsubscribe Mekanizması

**Tek Tıkla Unsubscribe (RFC 8058):**
```typescript
// Her e-postada unsubscribe linki
const unsubscribeUrl = `https://novastore.com/unsubscribe?token=${signedToken}`;

// Resend headers
const headers = {
  'List-Unsubscribe': `<${unsubscribeUrl}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
};

// Unsubscribe endpoint
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const category = searchParams.get('category') || 'all';
  
  // Token doğrula
  const { userId, email } = verifyUnsubscribeToken(token);
  
  // Unsubscribe işlemi
  if (category === 'all') {
    await supabase
      .from('email_preferences')
      .update({ unsubscribed_all: true })
      .eq('user_id', userId);
  } else {
    await supabase
      .from('email_preferences')
      .update({ [category]: false })
      .eq('user_id', userId);
  }
  
  // Log
  await supabase.from('email_unsubscribes').insert({
    email,
    category,
    user_agent: request.headers.get('user-agent'),
  });
  
  // Onay sayfası göster
  return new Response(renderUnsubscribeConfirmation(category));
}
```

### 6.2 Güvenlik Best Practices

#### 6.2.1 Token Güvenliği

**Signed Tokens:**
```typescript
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function generateResetToken(userId: string): Promise<string> {
  return await new SignJWT({ userId, type: 'password-reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m') // 15 dakika
    .sign(secret);
}

export async function verifyResetToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    
    if (payload.type !== 'password-reset') {
      throw new Error('Invalid token type');
    }
    
    return { userId: payload.userId as string };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
```

**OTP Generation (2FA):**
```typescript
import crypto from 'crypto';

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function storeOTP(userId: string, otp: string) {
  const hashedOTP = await bcrypt.hash(otp, 10);
  
  await supabase.from('otp_codes').insert({
    user_id: userId,
    code_hash: hashedOTP,
    expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 dk
    attempts: 0,
  });
}

export async function verifyOTP(userId: string, otp: string): Promise<boolean> {
  const { data: record } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('user_id', userId)
    .eq('used', false)
    .gte('expires_at', new Date())
    .single();
  
  if (!record) return false;
  
  // Attempts kontrolü
  if (record.attempts >= 3) {
    throw new Error('Too many attempts');
  }
  
  const isValid = await bcrypt.compare(otp, record.code_hash);
  
  if (isValid) {
    // OTP'yi kullan
    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('id', record.id);
  } else {
    // Başarısız deneme
    await supabase
      .from('otp_codes')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id);
  }
  
  return isValid;
}
```

#### 6.2.2 Rate Limiting

**IP Bazlı Rate Limit:**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 e-posta/saat
});

export async function checkRateLimitByIP(ip: string) {
  const { success, remaining } = await ratelimit.limit(`email:${ip}`);
  
  if (!success) {
    throw new Error(`Rate limit exceeded. Try again later.`);
  }
  
  return remaining;
}
```

**Kullanıcı Bazlı Rate Limit:**
```typescript
// Supabase function kullanarak (yukarıda tanımlı)
const canSend = await checkEmailRateLimit(email, 10, 50);

if (!canSend) {
  throw new Error('Email rate limit exceeded');
}
```

#### 6.2.3 Content Security

**XSS Önleme:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeEmailContent(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'img', 'h1', 'h2', 'ul', 'li'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
  });
}
```

**CSRF Koruması:**
```typescript
// Password reset gibi kritik işlemlerde
export async function handlePasswordReset(token: string, newPassword: string) {
  // 1. Token doğrula
  const { userId } = await verifyResetToken(token);
  
  // 2. Token'ın daha önce kullanılıp kullanılmadığını kontrol et
  const { data: usedToken } = await supabase
    .from('used_tokens')
    .select('id')
    .eq('token_hash', hashToken(token))
    .single();
  
  if (usedToken) {
    throw new Error('Token already used');
  }
  
  // 3. Şifreyi değiştir
  await updatePassword(userId, newPassword);
  
  // 4. Token'ı kullanılmış olarak işaretle
  await supabase.from('used_tokens').insert({
    token_hash: hashToken(token),
    used_at: new Date(),
  });
}
```

### 6.3 Spam & Abuse Prevention

#### 6.3.1 Email Validation

```typescript
import { isEmail } from 'validator';

export async function validateEmail(email: string): Promise<boolean> {
  // 1. Format kontrolü
  if (!isEmail(email)) return false;
  
  // 2. Disposable email kontrolü
  const disposableDomains = ['tempmail.com', '10minutemail.com', /* ... */];
  const domain = email.split('@')[1];
  if (disposableDomains.includes(domain)) return false;
  
  // 3. MX record kontrolü (opsiyonel, external API)
  const hasMX = await checkMXRecord(domain);
  if (!hasMX) return false;
  
  return true;
}
```

#### 6.3.2 Honeypot & CAPTCHA

```typescript
// Honeypot field (bots için)
<input type="text" name="website" style={{ display: 'none' }} />

// Backend'de kontrol
if (formData.website) {
  // Bot tespit edildi, e-posta gönderme
  return Response.json({ error: 'Invalid submission' }, { status: 400 });
}

// reCAPTCHA v3 (yüksek riskli işlemlerde)
import { verifyRecaptcha } from '@/lib/recaptcha';

const score = await verifyRecaptcha(token);
if (score < 0.5) {
  throw new Error('Suspicious activity detected');
}
```

### 6.4 Monitoring & Alerts

```typescript
// Şüpheli aktivite tespiti
export async function detectSuspiciousActivity(userId: string) {
  const recentEmails = await supabase
    .from('email_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('sent_at', new Date(Date.now() - 10 * 60 * 1000)) // Son 10 dk
    .count();
  
  if (recentEmails.count > 5) {
    // Admin'e bildir
    await emailService.sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: '🚨 Suspicious email activity',
      template: 'admin/suspicious-activity',
      data: { userId, emailCount: recentEmails.count },
    });
    
    // Kullanıcıyı geçici olarak engelle
    await blockUser(userId, '10 minutes');
  }
}
```

### 6.5 Compliance Checklist

- [x] **GDPR Uyumlu:** Consent, right to erasure, data portability
- [x] **KVKK Uyumlu:** Açık rıza, veri saklama süreleri, bilgilendirme
- [x] **CAN-SPAM Act:** Unsubscribe linki, fiziksel adres, doğru subject
- [x] **CASL (Kanada):** Express consent, identification, unsubscribe
- [x] **TLS/SSL:** Tüm API iletişimi şifreli
- [x] **Data Encryption:** Hassas veriler (token, OTP) hash'li saklanır
- [x] **Audit Logging:** Tüm kritik işlemler loglanır
- [x] **Regular Security Audits:** 6 ayda bir güvenlik taraması

---

## Monitoring & Analytics

### 7.1 Metrikler & KPI'lar

#### 7.1.1 Temel Metrikler

| Metrik | Hedef | Kritik Eşik |
|--------|-------|-------------|
| **Deliverability Rate** | %99.5+ | <%95 → alarm |
| **Open Rate** | %40+ | <%20 → investigate |
| **Click-Through Rate (CTR)** | %15+ | <%5 → optimize |
| **Bounce Rate** | <%2 | >%5 → alarm |
| **Spam Complaint Rate** | <%0.1 | >%0.5 → critical |
| **Unsubscribe Rate** | <%1 | >%3 → review content |
| **Average Send Time** | <2 sec | >5 sec → performance issue |
| **Queue Processing Time** | <5 min | >15 min → scaling needed |

#### 7.1.2 Şablon Bazlı Analytics

```typescript
// Dashboard query
export async function getTemplateAnalytics(template: string, days: number = 30) {
  const { data } = await supabase
    .from('email_templates_analytics')
    .select('*')
    .eq('template', template)
    .gte('period', new Date(Date.now() - days * 24 * 60 * 60 * 1000))
    .order('period', { ascending: false });
  
  const totals = data.reduce((acc, row) => ({
    sent: acc.sent + row.sent_count,
    delivered: acc.delivered + row.delivered_count,
    opened: acc.opened + row.opened_count,
    clicked: acc.clicked + row.clicked_count,
    bounced: acc.bounced + row.bounced_count,
  }), { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 });
  
  return {
    template,
    period: `${days} days`,
    metrics: totals,
    openRate: (totals.opened / totals.delivered * 100).toFixed(2),
    clickRate: (totals.clicked / totals.delivered * 100).toFixed(2),
    bounceRate: (totals.bounced / totals.sent * 100).toFixed(2),
  };
}
```

### 7.2 Resend Webhooks

#### 7.2.1 Webhook Event Types

```typescript
// src/app/api/email/webhook/route.ts
import { Webhook } from 'svix';

type ResendWebhookEvent =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.complained'
  | 'email.bounced'
  | 'email.opened'
  | 'email.clicked';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('svix-signature');
  
  // Webhook doğrulama
  const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!);
  let event;
  
  try {
    event = wh.verify(body, {
      'svix-id': request.headers.get('svix-id')!,
      'svix-timestamp': request.headers.get('svix-timestamp')!,
      'svix-signature': signature!,
    });
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const { type, data } = event as { type: ResendWebhookEvent; data: any };
  
  // Event'e göre işlem
  switch (type) {
    case 'email.delivered':
      await handleDelivered(data);
      break;
    case 'email.opened':
      await handleOpened(data);
      break;
    case 'email.clicked':
      await handleClicked(data);
      break;
    case 'email.bounced':
      await handleBounced(data);
      break;
    case 'email.complained':
      await handleComplaint(data);
      break;
  }
  
  return Response.json({ received: true });
}

async function handleOpened(data: any) {
  await supabase
    .from('email_logs')
    .update({
      status: 'opened',
      opened_at: new Date(data.created_at),
    })
    .eq('resend_id', data.email_id);
}

async function handleBounced(data: any) {
  // Email bounce
  await supabase
    .from('email_logs')
    .update({
      status: 'bounced',
      bounced_at: new Date(),
      error: data.bounce?.diagnostic_code,
    })
    .eq('resend_id', data.email_id);
  
  // Eğer hard bounce ise, kullanıcıyı email listesinden çıkar
  if (data.bounce?.type === 'hard') {
    await supabase
      .from('email_preferences')
      .update({ bounced: true })
      .eq('email', data.to);
    
    // Admin'e bildir
    await notifyAdmin('Hard bounce', { email: data.to, reason: data.bounce.diagnostic_code });
  }
}

async function handleComplaint(data: any) {
  // Spam şikayeti
  await supabase
    .from('email_logs')
    .update({ status: 'complained' })
    .eq('resend_id', data.email_id);
  
  // Kullanıcıyı otomatik unsubscribe et
  await supabase
    .from('email_preferences')
    .update({ unsubscribed_all: true })
    .eq('email', data.from);
  
  // CRITICAL: Admin'e bildir
  await emailService.sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: '🚨 SPAM COMPLAINT',
    template: 'admin/spam-complaint',
    data: { email: data.from, template: data.template },
  });
}
```

### 7.3 Dashboard (Admin Panel)

#### 7.3.1 Real-time Stats Widget

```tsx
// src/app/(admin)/dashboard/email-stats.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EmailStats {
  today: {
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
  };
  trends: {
    sentChange: number;
    openRateChange: number;
  };
}

export function EmailStatsWidget() {
  const [stats, setStats] = useState<EmailStats | null>(null);
  
  useEffect(() => {
    fetch('/api/admin/email-stats')
      .then(res => res.json())
      .then(setStats);
  }, []);
  
  if (!stats) return <div>Loading...</div>;
  
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Gönderilen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.today.sent}</div>
          <p className="text-sm text-muted-foreground">
            {stats.trends.sentChange > 0 ? '↑' : '↓'} {Math.abs(stats.trends.sentChange)}% dün
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Açılma Oranı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {((stats.today.opened / stats.today.sent) * 100).toFixed(1)}%
          </div>
          <p className="text-sm text-muted-foreground">
            {stats.trends.openRateChange > 0 ? '↑' : '↓'} {Math.abs(stats.trends.openRateChange)}% dün
          </p>
        </CardContent>
      </Card>
      
      {/* ... diğer kartlar */}
    </div>
  );
}
```

#### 7.3.2 Template Performance Table

```tsx
// src/app/(admin)/email-analytics/page.tsx
export default async function EmailAnalyticsPage() {
  const templates = await getTemplateAnalytics(30);
  
  return (
    <div className="space-y-6">
      <h1>E-posta Analytics</h1>
      
      <DataTable
        columns={[
          { header: 'Şablon', accessorKey: 'template' },
          { header: 'Gönderilen', accessorKey: 'sent' },
          { header: 'Açılma %', accessorKey: 'openRate' },
          { header: 'Tıklama %', accessorKey: 'clickRate' },
          { header: 'Bounce %', accessorKey: 'bounceRate' },
        ]}
        data={templates}
      />
    </div>
  );
}
```

### 7.4 Alerting & Notifications

#### 7.4.1 Alert Rules

```typescript
// Cron job: her 15 dakikada bir çalışır
export async function checkEmailHealthMetrics() {
  const last15min = await getEmailMetrics(15);
  
  // 1. Bounce rate yüksek mi?
  if (last15min.bounceRate > 5) {
    await sendAlert({
      severity: 'critical',
      title: 'High Bounce Rate',
      message: `Bounce rate: ${last15min.bounceRate}% (threshold: 5%)`,
      metrics: last15min,
    });
  }
  
  // 2. Deliverability düşük mü?
  if (last15min.deliverabilityRate < 95) {
    await sendAlert({
      severity: 'warning',
      title: 'Low Deliverability',
      message: `Deliverability: ${last15min.deliverabilityRate}% (threshold: 95%)`,
      metrics: last15min,
    });
  }
  
  // 3. Queue çok mu uzun?
  const queueLength = await getQueueLength();
  if (queueLength > 1000) {
    await sendAlert({
      severity: 'warning',
      title: 'Long Email Queue',
      message: `${queueLength} emails pending (threshold: 1000)`,
    });
  }
  
  // 4. Resend API hatası var mı?
  const recentErrors = await getRecentErrors(15);
  if (recentErrors.length > 10) {
    await sendAlert({
      severity: 'critical',
      title: 'Multiple Resend API Errors',
      message: `${recentErrors.length} errors in last 15 minutes`,
      errors: recentErrors,
    });
  }
}
```

#### 7.4.2 Notification Channels

```typescript
// Alert gönderme
async function sendAlert(alert: Alert) {
  // 1. Admin e-posta
  await emailService.sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
    template: 'admin/alert',
    data: alert,
  });
  
  // 2. Slack (opsiyonel)
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 ${alert.title}`,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: alert.message },
          },
        ],
      }),
    });
  }
  
  // 3. Database log
  await supabase.from('system_alerts').insert(alert);
}
```

### 7.5 Reporting

#### 7.5.1 Otomatik Raporlar

```typescript
// Haftalık rapor (Her Pazartesi 09:00)
export async function sendWeeklyReport() {
  const lastWeek = await getEmailMetrics(7 * 24 * 60); // 7 gün
  
  const report = {
    period: 'Last 7 days',
    totalSent: lastWeek.sent,
    deliverabilityRate: lastWeek.deliverabilityRate,
    openRate: lastWeek.openRate,
    clickRate: lastWeek.clickRate,
    topTemplates: await getTopTemplates(7),
    issues: await getIssuesSummary(7),
  };
  
  await emailService.sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: '📊 Haftalık E-posta Raporu',
    template: 'admin/weekly-report',
    data: report,
  });
}
```

### 7.6 Logging

```typescript
// Winston logger setup
import winston from 'winston';

export const emailLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'email-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/email-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/email-combined.log' }),
  ],
});

// Kullanım
emailLogger.info('Email sent', {
  template: 'orders/order-confirmation',
  recipient: 'user@example.com',
  resendId: 're_xxx',
  duration: 234, // ms
});

emailLogger.error('Email send failed', {
  template: 'auth/password-reset',
  recipient: 'user@example.com',
  error: error.message,
  stack: error.stack,
});
```

---

## Değişiklik Geçmişi

| Tarih | Versiyon | Değişiklik | Yazar |
|-------|----------|------------|-------|
| 15.01.2026 | 1.0 | İlk iskelet oluşturuldu | - |
| 15.01.2026 | 2.0 | Tüm bölümler detaylandırıldı (Kimlik Doğrulama, Sipariş, Finansal, Ürün, Müşteri İletişimi, Admin/Sistem, Teknik Mimari, Veritabanı, Test, Güvenlik, Monitoring) | GitHub Copilot |

