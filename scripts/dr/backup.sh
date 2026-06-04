#!/usr/bin/env bash
# =============================================================================
# Novagross — Disaster Recovery: Logical Backup
# =============================================================================
# Tam veri yedeği alır (şema + data). Çıktı GIT'E KONULMAZ — hassas veri
# (IBAN, e-posta, vergi no) içerir. Şifreli/güvenli bir yere saklanmalı.
#
# Kullanım:
#   export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.yditeqzqqwqiywoaftfr.supabase.co:5432/postgres"
#   ./scripts/dr/backup.sh
#
# Gereksinim: pg_dump (PostgreSQL 17 client). brew install postgresql@17
# =============================================================================
set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL gerekli (Supabase Dashboard > Settings > Database > Connection string)}"

TS="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="${BACKUP_DIR:-$HOME/novagross-backups}"
mkdir -p "$OUT_DIR"

echo "→ Tam yedek alınıyor (şema + veri)..."
pg_dump "$SUPABASE_DB_URL" \
  --schema=public \
  --no-owner --no-privileges \
  --format=custom \
  --file="$OUT_DIR/novagross_full_${TS}.dump"

echo "→ Sadece-veri yedeği (hızlı restore için)..."
pg_dump "$SUPABASE_DB_URL" \
  --schema=public \
  --data-only --no-owner --no-privileges \
  --format=plain \
  --file="$OUT_DIR/novagross_data_${TS}.sql"

# 30 günden eski yedekleri temizle
find "$OUT_DIR" -name "novagross_*.dump" -mtime +30 -delete 2>/dev/null || true
find "$OUT_DIR" -name "novagross_*.sql" -mtime +30 -delete 2>/dev/null || true

echo "✅ Yedek tamam: $OUT_DIR/novagross_full_${TS}.dump"
echo "   Bu dosyayı şifreli bir yere (ör. age/gpg + cloud) taşıyın."
echo "   ÖNERİ: günlük cron + Supabase PITR (Pro plan) birlikte kullanın."
