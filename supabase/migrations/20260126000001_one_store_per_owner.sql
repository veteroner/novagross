-- ============================================================================
-- Nova Store - Enforce 1 store per owner
-- ============================================================================
-- Policy decision: 1 kullanıcı = 1 mağaza
--
-- IMPORTANT:
-- This migration will FAIL if there are existing duplicate stores for the same owner_id.
-- Clean up duplicates first (e.g. delete extra stores in admin panel) and then apply.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM stores
    GROUP BY owner_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one-store-per-owner: duplicate stores exist for some owner_id. Clean duplicates first.';
  END IF;
END $$;

-- Unique constraint via unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_owner_unique
  ON stores(owner_id);
