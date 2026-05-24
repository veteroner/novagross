-- ============================================================================
-- One user = One store (manual cleanup helper)
-- ============================================================================
-- Use this in Supabase SQL editor BEFORE applying the migration that adds the
-- unique index on stores(owner_id).
--
-- This script is intentionally conservative: it only suggests/executes deletion
-- of duplicate stores that have NO order history.
-- Review carefully before running DELETE.
-- ============================================================================

-- 1) See duplicate owners
SELECT owner_id, COUNT(*) AS store_count
FROM stores
GROUP BY owner_id
HAVING COUNT(*) > 1
ORDER BY store_count DESC;

-- 2) Inspect duplicates (choose which store to keep)
SELECT id, owner_id, store_name, store_slug, status, created_at
FROM stores
WHERE owner_id IN (
  SELECT owner_id
  FROM stores
  GROUP BY owner_id
  HAVING COUNT(*) > 1
)
ORDER BY owner_id, created_at DESC;

-- 3) OPTIONAL: delete duplicate stores with NO order history
-- Keeps the newest store per owner_id (created_at DESC)
-- and deletes older ones only if they have no order_items.
--
-- WARNING: this is destructive.
--
-- Uncomment to run.
-- WITH ranked AS (
--   SELECT
--     id,
--     owner_id,
--     ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at DESC) AS rn
--   FROM stores
-- )
-- DELETE FROM stores s
-- USING ranked r
-- WHERE s.id = r.id
--   AND r.rn > 1
--   AND NOT EXISTS (
--     SELECT 1 FROM order_items oi WHERE oi.store_id = s.id
--   );

-- 4) After cleanup, enforce uniqueness
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_owner_unique ON stores(owner_id);
