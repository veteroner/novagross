#!/usr/bin/env bash
# =============================================================================
# Novagross — Disaster Recovery: Restore
# =============================================================================
# Bir saldırı/veri kaybı sonrası sistemi yedekten geri yükler.
#
# Kullanım:
#   export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
#   ./scripts/dr/restore.sh ~/novagross-backups/novagross_full_YYYYMMDD_HHMMSS.dump
# =============================================================================
set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL gerekli}"
DUMP="${1:?Kullanım: restore.sh <dump-dosyasi>}"
[ -f "$DUMP" ] || { echo "Dosya yok: $DUMP"; exit 1; }

echo "⚠️  DİKKAT: Bu işlem mevcut public şemasının üzerine yazar."
echo "    Hedef: $SUPABASE_DB_URL"
echo "    Kaynak: $DUMP"
read -r -p "Devam? (yazın: RESTORE) " confirm
[ "$confirm" = "RESTORE" ] || { echo "İptal."; exit 1; }

echo "→ Geri yükleniyor (temiz + yeniden oluştur)..."
pg_restore "$DUMP" \
  --dbname="$SUPABASE_DB_URL" \
  --schema=public \
  --clean --if-exists \
  --no-owner --no-privileges \
  --single-transaction

echo "✅ Restore tamam. Sonraki adımlar:"
echo "   1. supabase db push  (eksik migration varsa)"
echo "   2. Güvenlik objelerini doğrula: scripts/dr/verify.sql"
echo "   3. Netlify rebuild (3 site)"
