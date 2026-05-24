# ⚠️ PWA Geçici Olarak Devre Dışı

**Tarih:** 28 Ocak 2026  
**Sebep:** Service Worker cache corruption - CSS/JS parse hataları

## Neler Yapıldı

1. ✅ Service Worker kaydı devre dışı bırakıldı ([pwa-installer.tsx](apps/web/src/components/pwa/pwa-installer.tsx))
2. ✅ Supabase multiple client instance düzeltildi (search-bar, product-reviews, coupon-input)
3. ✅ Service Worker cache stratejisi sertleştirildi ([sw.js](apps/web/public/sw.js))
4. ✅ Netlify no-cache headers eklendi (sw.js, manifest.json)

## Sorun

Service Worker kullanıcı cache'inde **yanlış content-type** response'lar birikmiş:
- CSS dosyaları → HTML olarak cache'lenmiş
- JS chunk'ları → Hatalı response'lar
- Tarayıcı: `cd25410466916f85.css:1 Invalid or unexpected token`

## Hızlı Çözüm (Kullanıcılar için)

```bash
# Chrome DevTools → Application Tab
1. Service Workers → Unregister "sw.js"
2. Storage → Clear site data
3. Hard Reload (Cmd+Shift+R)
```

## Tekrar Aktifleştirme Planı

1. [ ] Service Worker cache stratejisini staging'de test et
2. [ ] Farklı tarayıcılarda (Chrome, Safari, Firefox) validation
3. [ ] Cache versioning stratejisi review
4. [ ] Gradual rollout: %10 → %50 → %100
5. [ ] Monitoring dashboard ekle (SW activation rate, error rate)

## Alternatif Yaklaşımlar

### Opsiyon 1: Workbox Kullan
```bash
pnpm add -D workbox-webpack-plugin
```
- Google'ın battle-tested SW kütüphanesi
- Otomatik precaching + runtime caching
- Built-in debugging

### Opsiyon 2: next-pwa Plugin
```bash
pnpm add next-pwa
```
- Next.js için özel PWA plugin
- Otomatik SW generation
- Zero-config setup

### Opsiyon 3: PWA'sız Devam
- Progressive Enhancement yeterli
- Manifest.json yeterli (Add to Home Screen)
- Service Worker opsiyonel

## Öneri

**Öncelik:** Stability > PWA features  
**Yaklaşım:** Opsiyon 2 (next-pwa) staging'de test et  
**Timeline:** 1-2 hafta sonra tekrar dene

---

**Not:** PWA olmadan da site tamamen fonksiyonel. Offline support şu an zorunlu değil.
