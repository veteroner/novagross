# DR Otomasyon Kurulumu (tek seferlik)

## Madde 2 + 3 → GitHub Actions (otomatik backup + restore-test)

Workflow'lar hazır (`.github/workflows/`). Çalışması için **2 GitHub Secret** ekle:

1. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

2. İki secret ekle:

   | Secret adı | Değer |
   |---|---|
   | `SUPABASE_DB_URL` | `postgresql://postgres:[ŞİFRE]@db.yditeqzqqwqiywoaftfr.supabase.co:5432/postgres` |
   | `BACKUP_PASSPHRASE` | Güçlü bir parola (yedekleri şifreler — kaybetme!) |

   > `SUPABASE_DB_URL`: Supabase Dashboard → Settings → Database → Connection string → URI

3. Bitti. Artık otomatik:
   - **Her gün 02:00 UTC** → yedek alınır + ephemeral DB'ye restore edilir + güvenlik doğrulanır + şifreli saklanır (90 gün)
   - **Her migration push'unda** → şema sıfırdan kurulabilirlik testi (secret'sız)
   - **Her Pazartesi** → şema reproducibility taraması
   - Herhangi biri başarısız olursa → GitHub sana **otomatik e-posta** atar

## Yedeği indirme (gerektiğinde)
GitHub repo → Actions → "DB Backup + Restore Verify" → son çalışma → Artifacts → indir
```bash
gpg --decrypt --passphrase "$BACKUP_PASSPHRASE" novagross_YYYYMMDD.dump.gpg > restore.dump
./scripts/dr/restore.sh restore.dump
```

## Neden bu tasarım?
- **Madde 3'ü unutman imkânsız**: restore-test her gün otomatik koşar, sen hatırlamazsın
- **Backup işe yaramazsa hemen haberin olur**: restore başarısız → workflow fail → e-posta
- **Makinen kapalı olsa bile çalışır**: GitHub'ın sunucusunda, senin bilgisayarına bağlı değil
- **Yedekler şifreli**: IBAN/e-posta içeren veri AES256 ile korunur (parola sadece sende)
