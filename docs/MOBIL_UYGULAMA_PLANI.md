# Novagross Mobil Uygulamaları — Plan

> Durum: taslak plan · Tarih: 2026-10-07
> Kapsam: **Novagross** (müşteri / mağaza uygulaması) ve **Novagross Satıcı** (satıcı paneli uygulaması) — iOS + Android, push bildirimli.

---

## 1. Hedef ve özet

| | Novagross (müşteri) | Novagross Satıcı |
|---|---|---|
| Kim kullanır | Alışveriş yapan kullanıcılar | Mağaza sahibi / yönetici / personel |
| Ana amaç | Keşfet → sepet → ödeme → sipariş takibi | Siparişi kaçırmadan hazırla → kargola → fatura yükle → hak edişi izle |
| En kritik bildirim | "Siparişiniz kargoya verildi / teslim edildi" | "Yeni sipariş" (anında, sesli) |
| Bugünkü karşılığı | `apps/web` (novagross.com) | `apps/seller` (seller.novagross.com) |

İki ayrı uygulama: mağazalarda ayrı listelenir, ayrı ikon/isim, ayrı izinler. Kod tek monorepo'da, ortak paketlerle.

---

## 2. Teknoloji kararı

**Öneri: Expo (React Native) + TypeScript, mevcut Turborepo monoreposu içinde.**

```
apps/
  web/            (mevcut)
  seller/         (mevcut)
  admin/          (mevcut)
  mobile-store/   (YENİ — Expo)
  mobile-seller/  (YENİ — Expo)
packages/
  database/       (mevcut — Supabase tipleri, sorgular: iki uygulama da kullanır)
  utils/          (mevcut — fiyat/tarih formatlama vb.)
  mobile-core/    (YENİ — Supabase istemcisi, auth, push kaydı, API istemcisi, tema)
```

Neden Expo:
- TypeScript + React bilgisi doğrudan taşınır; `@novagross/database` tipleri ve sorgu mantığı paylaşılır.
- `expo-notifications` + Expo Push Service → APNs (iOS) ve FCM (Android) tek API'den.
- EAS Build/Submit ile Mac'te Xcode kurulumu olmadan mağaza derlemesi; EAS Update ile mağaza onayı beklemeden JS güncellemesi.
- Kamera (fatura/ürün fotoğrafı), belge seçici (e-Arşiv PDF), paylaş/yazdır (kargo etiketi), biyometrik giriş için hazır modüller.

Elenen alternatifler:
- **Capacitor / WebView sarmalayıcı** (mevcut siteleri paketlemek): en hızlısı ama Apple "sadece web sitesi" uygulamalarını reddediyor (Guideline 4.2), push/derin bağlantı deneyimi zayıf.
- **Flutter / native**: ayrı dil, monorepo ile kod paylaşımı yok.

---

## 3. Ön koşul — backend değişiklikleri (uygulamalardan ÖNCE)

Mevcut iş mantığının önemli kısmı Next.js API route'larında ve **tarayıcı cookie oturumuna** bağlı. Mobil uygulama bunları çağıramaz. Bu bölüm bitmeden uygulama geliştirmeye başlanmamalı.

### 3.1 API'leri token ile açmak
- `apps/web/src/app/api/**` ve `apps/seller/src/app/api/**` route'ları `Authorization: Bearer <supabase access_token>` başlığını da kabul etmeli (cookie yoksa token'dan kullanıcıyı çöz). Ortak yardımcı: `getUserFromRequest(req)`.
- Admin uygulaması mobilde yok — admin API'lerine dokunulmaz.
- Doğrudan Supabase'e gidilebilen her şey (ürün listesi, sepet, favoriler, sipariş listesi) RLS ile zaten korunuyor; mobil bunları doğrudan `@supabase/supabase-js` ile okur.

### 3.2 Ödeme akışı (müşteri uygulaması)
- `api/payment/initialize` şu an CSRF kontrolü yapıyor (Origin başlığı) — mobil isteklerde Origin yok. Mobil için Bearer token ile yetkilendirilen ayrı giriş: `POST /api/payment/initialize` + `x-client: mobile` (CSRF yerine token doğrulaması).
- iyzico ödeme formu (`paymentPageUrl`) uygulama içi WebView'da açılır (3D Secure dahil). Fiziksel ürün olduğu için Apple/Google uygulama içi satın alma (IAP) **gerekmez**.
- `api/payment/callback` şu an web sayfasına yönlendiriyor → mobil ödemede `novagross://odeme/sonuc?order=...` derin bağlantısına yönlendirmeli (WebView bunu yakalayıp sonuç ekranını açar).

### 3.3 Bildirim altyapısı (iki uygulamanın ortak omurgası)

Yeni tablolar:

| Tablo | Amaç |
|---|---|
| `push_devices` | `user_id`, `app` ('store' \| 'seller'), `expo_push_token`, `platform`, `device_name`, `app_version`, `last_seen_at`, `disabled_at` |
| `notification_preferences` | `user_id`, `app`, kategori bazında aç/kapa (sipariş, kargo, kampanya, soru-cevap…), sessiz saatler |
| `notification_outbox` | Gönderilecek bildirimler kuyruğu: `user_id`, `app`, `type`, `title`, `body`, `data` (derin bağlantı), `status`, `attempts`, `sent_at`, `expo_ticket_id` |

Mevcut `user_notifications` (web bildirim zili) korunur ve uygulama içi **Bildirimler** ekranının kaynağı olur; `app` / `store_id` kolonları eklenerek satıcı bildirimleri de buraya yazılır.

Akış:
```
Olay (sipariş ödendi, kargo durumu değişti, iade talebi…)
  → DB trigger / mevcut route  →  notify(user, type, data) RPC
       → user_notifications (uygulama içi liste)
       → notification_outbox (push)  — tercihler + sessiz saat kontrolü burada
  → pg_cron (her dakika) → admin /api/push/dispatch
       → Expo Push API (toplu, 100'lük paketler)
       → receipt kontrolü: DeviceNotRegistered → push_devices.disabled_at
```
- Mevcut e-posta kuyruğu (`email_queue`) aynı olaylardan beslenmeye devam eder; push e-postanın yerine değil yanına.
- Satıcı bildirimleri **mağazaya** gider: `store_members` (Sahip/Yönetici/Personel) üyelerinin hepsine, rol bazlı filtreyle (ör. "hak ediş gönderildi" yalnızca Sahip/Yönetici).
- Yeni cron route'u `apps/admin/src/middleware.ts` → `CRON_ROUTE_PREFIXES` listesine eklenmeli (yoksa sessizce 401 döner).

---

## 4. Bildirim kataloğu

### 4.1 Müşteri uygulaması

| Olay | Tetikleyici | Örnek metin | Açılan ekran | Kategori |
|---|---|---|---|---|
| Sipariş alındı | `orders.payment_status → paid` | "Siparişiniz alındı 🎉 #2666151605" | Sipariş detayı | Sipariş (kapatılamaz) |
| Ödeme başarısız | callback hata | "Ödemeniz tamamlanamadı, tekrar deneyin" | Sepet | Sipariş |
| Kargoya verildi | `order_shipments` oluşturuldu / MNG okutma | "Siparişiniz MNG Kargo'ya verildi. Takip: …" | Kargo takip | Kargo |
| Dağıtıma çıktı | MNG kod 4 (`out_for_delivery`) | "Kargonuz bugün teslim edilecek" | Kargo takip | Kargo |
| Teslim edildi | MNG kod 5 | "Siparişiniz teslim edildi. Değerlendirmek ister misiniz?" | Değerlendirme | Kargo |
| Teslim edilemedi | MNG kod 6 / teslimat sorunu | "Kargonuz teslim edilemedi, şubeden alabilirsiniz" | Kargo takip | Kargo |
| Sipariş iptal | satıcı/admin iptali | "Siparişiniz iptal edildi, ücret iadesi başlatıldı" | Sipariş detayı | Sipariş |
| İade durumu | `return_requests` onay/red/iade | "İade talebiniz onaylandı" / "₺… iadeniz yapıldı" | İade detayı | Sipariş |
| Fatura yüklendi | `order_invoices` | "Siparişinizin faturası hazır" | Sipariş detayı | Sipariş |
| Soru yanıtlandı | `product_questions` yanıt | "Sorunuz yanıtlandı: …" | Ürün → sorular | Soru-cevap |
| Destek yanıtı | `support_messages` | "Destek talebinize yanıt geldi" | Talep | Destek |
| Favoride fiyat düştü | fiyat değişimi + `wishlists` | "Favorinizdeki ürün %15 indirimde" | Ürün | Kampanya* |
| Stoğa geri geldi | stok 0 → >0 + `wishlists` | "Beklediğiniz ürün stokta" | Ürün | Kampanya* |
| Sepette kalan ürün | mevcut abandoned-cart cron | "Sepetinizde ürün kaldı" | Sepet | Kampanya* |
| Kişisel teklif / kupon | `product_offers`, `platform_offers` | "Size özel %10 kupon" | Kampanya | Kampanya* |

\* **Kampanya bildirimleri ticari elektronik iletidir** (6563 sayılı Kanun + İYS): yalnızca açık rıza (opt-in) veren kullanıcıya gönderilir, rıza kaydı tutulur, her an kapatılabilir. Sipariş/kargo bildirimleri işlemsel olduğu için rıza gerektirmez.

### 4.2 Satıcı uygulaması

| Olay | Tetikleyici | Örnek metin | Açılan ekran | Kime |
|---|---|---|---|---|
| **Yeni sipariş** | `payment_status → paid` | "🛒 Yeni sipariş! ₺599 · 1 ürün" (özel ses) | Sipariş detayı | Tüm üyeler |
| Kargolama süresi yaklaşıyor | ödeme + N saat, kargolanmadı | "#… siparişini bugün kargolamalısınız" | Sipariş detayı | Tüm üyeler |
| Kargo şubede okutulmadı | mevcut `cargo/not-scanned-alert` (48 saat) | "#… paketi MNG'de görünmüyor" | Sipariş detayı | Tüm üyeler |
| MNG teslimat sorunu | `delivery_problems` | "#… için kurye sorun bildirdi, yanıt gerekli" | Teslimat sorunu | Sahip/Yönetici |
| Fatura yükleme hatırlatma | mevcut invoice-reminders cron | "#… faturasını 2 gün içinde yükleyin" | Fatura yükle | Tüm üyeler |
| Sipariş müşteri tarafından iptal | iptal | "#… iptal edildi, kargolamayın" | Sipariş detayı | Tüm üyeler |
| İade talebi | `return_requests` yeni | "#… için iade talebi geldi" | İade | Sahip/Yönetici |
| Yeni soru | `product_questions` | "Ürününüze soru soruldu" | Soru yanıtla | Tüm üyeler |
| Yeni değerlendirme | `reviews` / `store_reviews` | "⭐ 2 puanlı yeni yorum" | Yorumlar | Sahip/Yönetici |
| Hak ediş gönderildi | iyzico onayı (auto-approve) | "₺1.040 hesabınıza gönderildi (#…)" | Kazançlarım | Sahip/Yönetici |
| Hak ediş gönderilemedi | iyzico gönderim hatası | "Ödemeniz bankaya ulaşmadı, IBAN/ünvanı kontrol edin" | Mağaza ayarları | Sahip |
| Stok azaldı / bitti | stok eşiği | "… stoğu 2 adede düştü" | Ürün | Tüm üyeler |
| Ürün onay / red | admin moderasyonu | "Ürününüz yayına alındı" | Ürün | Tüm üyeler |
| Destek yanıtı | `support_messages` | "Destek talebinize yanıt geldi" | Talep | Sahip/Yönetici |
| Haftalık özet | mevcut weekly-seller-insights | "Bu hafta 12 sipariş, ₺8.400 ciro" | Analizler | Sahip/Yönetici |

---

## 5. Novagross (müşteri) uygulaması — özellikler

### MVP (ilk sürüm)
- **Giriş / kayıt:** e-posta + şifre, Google ile giriş, **Apple ile giriş** (iOS'ta Google varsa Apple zorunlu — Guideline 4.8), şifre sıfırlama, biyometrik hızlı giriş (Face ID / parmak izi).
- **Ana sayfa:** banner'lar, kampanya alanları (`promo_sections`), kategoriler, yeni gelenler, kişisel öneriler.
- **Arama ve listeleme:** arama (öneri + son aramalar), filtre/sıralama, kategori ağacı, mağaza sayfası.
- **Ürün detayı:** görsel galerisi, varyant seçimi, stok, kargo bilgisi (ücretsiz kargo eşiği), soru-cevap, yorumlar, satıcı bilgisi, paylaş.
- **Favoriler:** web ile senkron (`wishlists`).
- **Sepet:** web ile senkron (DB sepeti), kupon uygulama, kargo hesabı.
- **Ödeme:** adres seç/ekle, fatura bilgisi, mesafeli satış sözleşmesi onayı, iyzico ödeme formu (WebView), sonuç ekranı.
- **Siparişlerim:** liste, detay, kargo takip zaman çizelgesi (MNG durumları), fatura indirme, iptal talebi.
- **İade:** iade talebi oluşturma (fotoğraf ekleme), iade durumu, iade kargo kodu.
- **Bildirimler:** uygulama içi bildirim merkezi + push, bildirim tercihleri (kategori bazında).
- **Hesabım:** profil, adresler, şifre, KVKK metinleri, **hesabı silme** (Apple 5.1.1(v) zorunlu).
- **Destek:** iletişim / destek talebi, SSS.

### Sonraki sürümler
- Derin bağlantılar (universal links / app links): novagross.com/urun/… linkleri uygulamada açılır.
- Son gezilen ürünler, "beğenebilecekleriniz".
- Fiyat düşüşü / stok alarmı (favoriler üzerinden).
- Kayıtlı kart ile tek tıkla ödeme (iyzico kart saklama).
- Ana ekran widget'ı (kargo durumu), canlı etkinlik (iOS Live Activity — "kargonuz yolda").

---

## 6. Novagross Satıcı uygulaması — özellikler

### MVP (ilk sürüm)
- **Giriş:** e-posta + şifre, mevcut 2FA, biyometrik hızlı giriş; birden fazla mağazası olan kullanıcı için mağaza seçici; rol bazlı görünüm (Sahip / Yönetici / Personel — `store_members`).
- **Ana ekran (bugün):** bekleyen siparişler, bugün kargolanması gerekenler, fatura bekleyenler, açık iade/soru sayısı, bugünkü ciro.
- **Siparişler:** liste (filtre: yeni, hazırlanıyor, kargoda, teslim, iade), detay, sipariş onaylama/iptal.
- **Kargolama:** MNG gönderisi oluşturma (mevcut `api/orders/[orderId]/shipment` → token ile), resmi barkodlu etiketi görüntüleme, PDF olarak paylaş/yazdır (AirPrint / Android yazdırma), kargo iptali.
- **Fatura yükleme:** kamera ile çek veya dosyadan e-Arşiv PDF seç → `order_invoices`; 7 günlük süre sayacı.
- **Ürünler (hızlı düzenleme):** stok ve fiyat güncelleme, yayına al/kaldır, kamerayla ürün fotoğrafı ekleme. (Tam ürün oluşturma web'de kalabilir.)
- **Soru-cevap ve yorumlar:** yanıtlama.
- **İadeler:** talebi görüntüleme, onay/red (yetkiye göre).
- **Kazançlarım:** sipariş bazında hak ediş (satış, KDV hariç komisyon, %1 stopaj, kargo kesintisi, iyzico gönderim durumu) — salt okunur, para çekme yok.
- **Bildirimler:** push + bildirim merkezi; "yeni sipariş" için özel ses ve yüksek öncelik kanalı (Android notification channel), kategori bazında tercihler.

### Sonraki sürümler
- Bluetooth Zebra yazıcıya doğrudan ZPL etiket basma (MNG etiketi zaten ZPL geliyor).
- Barkod okutarak sipariş/ürün bulma (kamera).
- Toplu kargolama (birden fazla siparişi tek seferde).
- Analizler / performans ekranları, kampanya ve kupon yönetimi.
- Mesajlaşma (müşteri ↔ satıcı), destek talepleri.
- Ana ekran widget'ı: bugünkü sipariş sayısı.

---

## 7. Ortak teknik konular

| Konu | Karar |
|---|---|
| Durum yönetimi / veri | TanStack Query + Supabase istemcisi; çevrimdışı önbellek (son görüntülenen ekranlar) |
| Gezinme | Expo Router (dosya tabanlı) — derin bağlantılar ücretsiz gelir |
| Arayüz | React Native + ortak tema paketi (Novagross turuncu); `@novagross/ui` web'e özel olduğu için doğrudan kullanılmaz, renk/tipografi token'ları paylaşılır |
| Görseller | Supabase Storage + `expo-image` (önbellekli) |
| Oturum | Supabase auth, token `expo-secure-store`'da; yenileme otomatik |
| Hata izleme | Sentry (iki uygulama + backend aynı projede) |
| Analitik | Mevcut `product_events` tablosuna aynı olaylar (view, add_to_cart, favorite) + `source: 'ios' \| 'android'` |
| Sürüm güncelleme | EAS Update (JS), zorunlu güncelleme kontrolü (min sürüm ayarı) |
| Dil | Türkçe (ilk sürüm), metinler i18n dosyasında |
| Erişilebilirlik | Dinamik yazı boyutu, ekran okuyucu etiketleri |

---

## 8. Mağaza yayını — idari hazırlık (paralel başlatılmalı, en uzun süren kısım)

- **Apple Developer Program — şirket hesabı** (TEKNOVA TARIM HAYVANCILIK BİLİŞİM REKLAM LTD. ŞTİ.): **D-U-N-S numarası** gerekir (ücretsiz, 1–2 hafta). Yıllık 99 USD.
- **Google Play Console — kuruluş hesabı:** tek seferlik 25 USD, kuruluş doğrulaması (D-U-N-S ile).
- Her iki mağaza için: gizlilik politikası URL'si (mevcut `gizlilik-politikasi`), veri güvenliği / gizlilik etiketleri formu, destek URL'si, ekran görüntüleri, uygulama ikonları, test hesabı (Apple incelemesi için).
- Push için: APNs anahtarı (Apple), Firebase projesi + FCM sunucu anahtarı (Android) → Expo'ya tanımlanır.
- Uygulama adları: "Novagross" ve "Novagross Satıcı" (paket kimlikleri: `com.novagross.app`, `com.novagross.seller`).
- KVKK aydınlatma metnine mobil cihaz verisi (push token, cihaz modeli) eklenmeli.

---

## 9. Yol haritası

| Faz | İçerik | Süre (tahmini) |
|---|---|---|
| **0 — Hazırlık** | D-U-N-S + Apple/Google hesapları, Firebase, Expo hesabı (paralel) | 1–3 hafta (idari) |
| **1 — Backend** | API'lerin Bearer token desteği, mobil ödeme girişi + derin bağlantı callback, `push_devices` / `notification_preferences` / `notification_outbox`, `notify()` RPC, dispatch cron + receipt kontrolü, mevcut olaylara bildirim bağlama | 2 hafta |
| **2 — Satıcı MVP** | Giriş/rol, bugün ekranı, siparişler, kargolama + etiket, fatura yükleme, stok/fiyat, bildirimler | 4 hafta |
| **3 — Müşteri MVP** | Giriş (Apple dahil), keşif, ürün, sepet, ödeme, siparişler + takip, iade, bildirimler, hesap silme | 5 hafta |
| **4 — Test & yayın** | TestFlight / Play iç test, gerçek siparişle uçtan uca test, mağaza incelemeleri | 2 hafta |
| **5 — Sürüm 1.1+** | Derin bağlantılar, fiyat/stok alarmı, Zebra yazıcı, barkod, widget'lar | sürekli |

**Satıcı uygulaması önce:** kullanıcı sayısı küçük ve kontrollü, "yeni sipariş" bildirimi en çok işe yarayan özellik, bildirim omurgası gerçek kullanımda olgunlaşır; müşteri uygulaması daha büyük ve mağaza incelemesine daha hassas.

---

## 10. Riskler ve açık sorular

1. **İş mantığının web route'larında olması** — Bölüm 3 yapılmadan mobil, mantığı kopyalamak zorunda kalır (iki yerde bakım). Kural: mobil iş mantığı yazmaz, mevcut API'yi çağırır.
2. **iyzico ödeme formu WebView'da** — 3D Secure sayfalarının bazı bankalarda WebView'da sorun çıkarma ihtimali; ilk testte tüm büyük bankalarla denenmeli. Alternatif: sistem tarayıcısı (`expo-web-browser`) + derin bağlantıyla dönüş.
3. **Apple incelemesi** — misafir alışverişe izin yoksa giriş zorunluluğu sorun olabilir: ürünler girişsiz gezilebilmeli, giriş yalnızca sepet/ödeme adımında istenmeli.
4. **Kampanya bildirimleri ve İYS** — ticari ileti onayı ve İYS kaydı netleşmeden kampanya push'u açılmamalı.
5. **Satıcı etiket basımı** — MNG etiketi ZPL; telefondan normal yazıcıya PDF'e çevirip basmak gerekiyor (dönüşüm sunucuda mı yapılacak netleşmeli).
6. **Kararlar (2026-10-07):**
   - Misafir (girişsiz) satın alma **yok** — ürünler girişsiz gezilebilir, sepete ekleme/ödeme girişle.
   - Satıcı uygulamasında ürün **oluşturma var**, Trendyol/Hepsiburada/Amazon gibi **admin onayına bağlı**
     (`products.approval_status = 'pending'`, `enforce_product_moderation` trigger'ı sunucuda zorunlu tutar;
     onay/red satıcıya bildirim olarak gider).
   - Kampanya bildirimleri: İYS kaydı henüz yok → `marketing` kategorisi varsayılan **kapalı**, yalnızca
     kullanıcının açıkça açtığı (opt-in) cihazlara gider; her rıza `marketing_consent_log`'a yazılır. İYS kaydı
     yapılmadan kampanya push'u gönderilmeyecek.
   - Uygulama adları: **Novagross** ve **Novagross Satıcı** (`com.novagross.app`, `com.novagross.seller`).

## 11. İlerleme

| Tarih | Adım | Durum |
|---|---|---|
| 2026-10-07 | API'lerde Bearer token (web + seller), mobil ödeme dönüşü (`novagross://odeme/sonuc`) | ✅ canlıda |
| 2026-10-07 | Bildirim omurgası: `push_devices`, `notification_preferences`, `notification_outbox`, `notify()/notify_store()`, olay trigger'ları, `/api/push/dispatch` (dakikada bir) | ✅ canlıda |
| 2026-10-07 | Novagross Satıcı v0.1 iskeleti (`mobile/seller`, Expo SDK 57): giriş, push kaydı, Bugün, Siparişler, sipariş detayı (MNG kargola, etiket yazdır/paylaş, fatura yükle), Bildirimler, bildirim ayarları | 🚧 geliştirme |

**Konum notu:** Mobil uygulamalar pnpm workspace'inin **dışında** (`mobile/`). Web/seller React 18 + Next 14
kullanırken Expo SDK 57 React 19 istiyor; aynı `node_modules`'te birleşirse Netlify derlemeleri bozulabilir.
