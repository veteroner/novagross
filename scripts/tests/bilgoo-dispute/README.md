# bilgoo-dispute route testleri

Gerçek `apps/admin/src/app/api/iyzico/bilgoo-dispute/route.ts` dosyasını sahte iyzico ve
bellek içi Supabase ile çalıştırır. Ağ, gerçek anahtar veya veritabanı gerekmez.

```bash
cd scripts/tests/bilgoo-dispute && node --import ./register.mjs test.mjs
```

Node 22.18+ gerekir (TypeScript tür ayıklama). Kapsam: eşzamanlı iki POST, kalemlerin tek
kez iade edilmesi, iyzico başarılıyken DB yazım hatası, güvenli tekrar ve ağ belirsizliği.
SQL kilidi (`claim_bilgoo_dispute`) ayrıca gerçek Postgres'te denenmelidir.
