# Netlify Build Trigger

Son RLS değişikliklerinden sonra Netlify cache'ini temizleme talimatları:

## 1. Netlify Dashboard Üzerinden

1. https://app.netlify.com adresine git
2. "admin-teknovastore" siteni seç
3. "Deploys" sekmesine git
4. "Trigger deploy" → "Clear cache and deploy site" seç

## 2. Veya Git Push ile Force Trigger

```bash
cd /tmp/novastoreadmin
echo "# Build trigger $(date)" >> README.md
git add README.md
git commit -m "chore: trigger rebuild after RLS policy changes"
git push
```

## 3. Environment Variables Kontrol

Netlify'da şu env variables'ın doğru olduğundan emin olun:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (if used)

## Sorun

Production'da `getPendingProducts()` 500 Internal Server Error veriyor. Bu muhtemelen:

1. ❌ RLS policy'leri Netlify build sırasında henüz güncellenmemişti
2. ✅ RLS policy'leri şimdi güncellendi
3. ⏳ Netlify rebuild gerekiyor

## Beklenen Sonuç

Rebuild sonrası `/urunler/onay-bekleyenler` sayfası çalışmalı ve pending products listelenmeli.
