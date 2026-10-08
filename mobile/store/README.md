# Novagross — Müşteri uygulaması (iOS / Android)

Expo SDK 57 + Expo Router. Plan ve kararlar: [`docs/MOBIL_UYGULAMA_PLANI.md`](../../docs/MOBIL_UYGULAMA_PLANI.md).

> pnpm workspace'inin **dışında** — kendi `npm` bağımlılıkları var (React 19; web React 18).

## Kurulum / çalıştırma

```bash
cd mobile/store
cp .env.example .env   # EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY / EXPO_PUBLIC_WEB_API_URL
npm install
npm run ios            # önce ._ AppleDouble dosyalarını temizler (LaCie notu: mobile/seller/README.md)
```

## Akışlar

- **Gezinme girişsiz**, sepet / favori / ödeme / hesap **girişli** (karar: girişsiz satın alma yok).
- Katalog, sepet (`carts`/`cart_items` — web sepetiyle aynı), favoriler, adresler: doğrudan Supabase, RLS ile.
- **Ödeme:** `POST novagross.com/api/payment/initialize` (`client: 'mobile'`, Bearer token) →
  iyzico ortak ödeme sayfası uygulama içi WebView'da (`odeme/iyzico.tsx`) → callback
  `novagross://odeme/sonuc?path=…` adresine yönlendirir → WebView yakalar → `odeme/sonuc.tsx`.
  Fiyat, kargo ve kupon sunucuda yeniden hesaplanır; uygulamadaki tutarlar tahmindir.
- **Fatura:** `GET /api/invoices/:id` (Bearer) → PDF paylaşım sayfası.
- **Hesap silme** (App Store 5.1.1(v)): `POST /api/account/delete` — açık sipariş/iadesi varsa reddeder,
  kişisel verileri siler, profili anonimleştirir, auth kullanıcısını kapatır; sipariş/fatura kayıtları yasal süre saklanır.
- **Push:** `register_push_device(p_app 'store')`; kampanya (`marketing`) bildirimi varsayılan **kapalı**,
  açma/kapama `marketing_consent_log`'a yazılır.

## Yayın öncesi

- `npx eas-cli@latest init` → `extra.eas.projectId` (push token için)
- APNs + FCM kimlik bilgileri, gerçek ikon/açılış görseli
- Apple / Google ile giriş (Supabase sağlayıcı ayarı gerekir) — eklenirse Apple ile giriş zorunlu olur
