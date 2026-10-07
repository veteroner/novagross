# Novagross Satıcı (iOS / Android)

Expo SDK 57 + Expo Router. Plan ve kararlar: [`docs/MOBIL_UYGULAMA_PLANI.md`](../../docs/MOBIL_UYGULAMA_PLANI.md).

> Bu klasör pnpm workspace'inin **dışında** — kendi `npm` bağımlılıkları var.
> Web/seller React 18 + Next 14, Expo React 19 kullanıyor; aynı `node_modules`'te birleşirse Netlify derlemeleri bozulur.

## Kurulum

```bash
cd mobile/seller
cp .env.example .env   # EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY / EXPO_PUBLIC_SELLER_API_URL
npm install
```

## Çalıştırma (geliştirme derlemesi — push bildirimleri Expo Go'da çalışmaz)

```bash
npm run ios          # iOS simülatör (Xcode gerekli)
npm run android      # Android emülatör (Google Play servisli imaj)
npm start            # sadece Metro (derleme kuruluysa)
```

**Harici disk (LaCie) notu:** macOS bu diskte her dosya için `._*` AppleDouble kopyası üretir.
Metro bunları `metro.config.js` ile yok sayar; CocoaPods ise çöker → `npm run ios` önce
`npm run clean:appledouble` çalıştırır. CocoaPods ayrıca `LANG=en_US.UTF-8` ister.

## Mimari

- Veri: doğrudan Supabase (RLS satıcıyı kendi mağazasıyla sınırlar) — `src/lib/queries.ts`, `src/lib/products.ts`
- Sunucu iş mantığı (MNG kargo, etiket, fatura kaydı): `seller.novagross.com` API'leri,
  `Authorization: Bearer <access_token>` ile — `src/lib/api.ts`
- Push: `src/lib/push.ts` → `register_push_device` RPC → `push_devices`; gönderim admin `/api/push/dispatch`
- Android bildirim kanalları: `orders` (yeni sipariş, yüksek öncelik), `default`

## Yayın öncesi yapılacaklar

- `npx eas-cli@latest init` (Expo hesabı) → `extra.eas.projectId` (push token için gerekli)
- APNs anahtarı + Firebase (FCM) kimlik bilgileri EAS'e
- Gerçek uygulama ikonu / açılış görseli
