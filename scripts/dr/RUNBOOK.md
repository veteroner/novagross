# 🚨 Novagross — Felaket Kurtarma (Disaster Recovery) Runbook

> Bir saldırgan veriyi sildi/şifreledi, sistem çöktü veya DB bozuldu.
> Bu doküman **sıfırdan ayağa kaldırma** prosedürüdür. Panik yok — adımları izle.

## 0. Hızlı durum tespiti (2 dk)

| Belirti | Olası neden | Git |
|---|---|---|
| Site açılıyor ama veri yok | Veri silindi (DELETE/wipe) | → Senaryo A |
| "relation does not exist" hataları | Şema/tablo düştü (DROP) | → Senaryo B |
| Site tamamen down (5xx) | Netlify build / DB down | → Senaryo C |
| Veriler değişmiş/şifreli | Ransomware / yetkisiz UPDATE | → Senaryo A (PITR) |

---

## Senaryo A — Veri kaybı (tablolar duruyor, satırlar gitti)

**En hızlı yol: Supabase PITR (Point-in-Time Recovery)** — Pro plan
1. Supabase Dashboard → Database → Backups → **Point in Time**
2. Saldırı ANINDAN ÖNCEKİ bir zaman seç (ör. 1 saat öncesi)
3. "Restore" → onayla. ~birkaç dk.
4. Doğrula: `psql "$SUPABASE_DB_URL" -f scripts/dr/verify.sql` (tümü ✅)

**PITR yoksa: logical backup'tan**
```bash
export SUPABASE_DB_URL="postgresql://postgres:[PWD]@db.yditeqzqqwqiywoaftfr.supabase.co:5432/postgres"
./scripts/dr/restore.sh ~/novagross-backups/novagross_full_EN_SON.dump
psql "$SUPABASE_DB_URL" -f scripts/dr/verify.sql
```

---

## Senaryo B — Şema kaybı (tablolar düştü)

Şema tamamen git'te (59 migration). Sıfırdan kur:
```bash
# 1. Supabase CLI ile tüm migration'ları uygula
supabase link --project-ref yditeqzqqwqiywoaftfr
supabase db push          # 59 migration → tüm tablo + RLS + trigger + RPC

# 2. Veriyi geri yükle (Senaryo A logical backup)
./scripts/dr/restore.sh ~/novagross-backups/novagross_data_EN_SON.sql

# 3. Güvenlik doğrulaması
psql "$SUPABASE_DB_URL" -f scripts/dr/verify.sql
```

---

## Senaryo C — Uygulama down (DB sağlam)

```bash
# Her 3 site için Netlify rebuild
# web=55c0a328-... admin=521dd675-... seller=67129cf4-...
netlify api createSiteBuild --data '{"site_id":"<ID>","body":{"branch":"main"}}'
```
Git main her zaman son çalışan kod. Gerekirse son iyi commit'e dön:
`git revert <kötü-commit>` → push → otomatik deploy.

---

## Saldırı sonrası ZORUNLU sıkılaştırma (kimlik bilgileri rotasyonu)

Saldırgan anon key gördüyse veri çekmiş olabilir AMA daha önemlisi:
1. **Supabase**: Dashboard → Settings → API → **service_role key'i ROTATE et**
   (service_role tüm RLS'i bypass eder — sızmışsa felaket)
2. **DB şifresi**: Settings → Database → Reset password
3. **Netlify env**: yeni key'leri 3 siteye de gir → rebuild
4. **iyzico / Resend / NetGSM** API anahtarlarını yenile
5. `git log` ile şüpheli commit ara; `supabase` audit log incele

> Not: `anon` key public'tir (client'ta görünür) — rotasyonu RLS'i etkilemez,
> asıl koruma RLS + trigger katmanıdır (bu repo'da kanıtlanmıştır).

---

## Önleyici (şimdi yapılmalı)

- [ ] **PITR aç** (Supabase Pro) — en güçlü kurtarma
- [ ] **Günlük cron**: `scripts/dr/backup.sh` → şifreli cloud (age/gpg)
- [ ] Backup'ı ayda 1 **restore-test** et (bu runbook ile)
- [ ] service_role key'i SADECE server-side env'de tut (client'a asla)

## Kurtarma kapasitesi — kanıtlanmış varlıklar
- ✅ Şema: 59 migration (git, tam reproducible — return_requests dahil)
- ✅ Güvenlik: 21 trigger + RLS + RPC revoke + column-grant (verify.sql ile doğrulanır)
- ✅ Kod: git main (3 app), Netlify otomatik deploy
- ✅ Transaction-level rollback: drill ile kanıtlandı (102 ürün geri geldi)
- ⚠️ Veri yedeği: backup.sh ile alınmalı + PITR önerilir
