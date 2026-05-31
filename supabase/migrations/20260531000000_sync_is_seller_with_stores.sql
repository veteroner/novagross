-- ============================================================================
-- Keep profiles.is_seller in sync with the existence of any store owned by
-- the profile. The seller panel gate (apps/seller/.../login) checks this
-- flag — without it, store owners get locked out (root cause of the
-- "Bu panel sadece onaylı satıcılar içindir" error even for users who
-- actually own an active store).
--
-- Strategy:
--   1) A helper function recomputes the flag for a single profile based on
--      whether at least one row exists in `stores` with that owner.
--   2) An AFTER trigger on stores fires on INSERT / DELETE / UPDATE
--      (owner change) and calls the helper for the affected owner(s).
--   3) Backfill at migration time to fix any pre-existing drift.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: recompute is_seller for one owner
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_is_seller_for_owner(p_owner_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  has_store BOOLEAN;
BEGIN
  IF p_owner_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM stores WHERE owner_id = p_owner_id
  ) INTO has_store;

  UPDATE profiles
     SET is_seller = has_store,
         updated_at = NOW()
   WHERE id = p_owner_id
     AND is_seller IS DISTINCT FROM has_store;
END;
$$;

COMMENT ON FUNCTION public.sync_is_seller_for_owner(UUID) IS
  'Recomputes profiles.is_seller based on whether the profile owns any stores. Idempotent.';

-- ----------------------------------------------------------------------------
-- Trigger function: react to changes on stores
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stores_sync_is_seller_trg()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.sync_is_seller_for_owner(NEW.owner_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.sync_is_seller_for_owner(OLD.owner_id);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only react to owner reassignment; status changes do not affect
    -- the "is a seller" relationship.
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      PERFORM public.sync_is_seller_for_owner(OLD.owner_id);
      PERFORM public.sync_is_seller_for_owner(NEW.owner_id);
    END IF;
  END IF;
  RETURN NULL; -- AFTER trigger — return value ignored
END;
$$;

DROP TRIGGER IF EXISTS trg_stores_sync_is_seller ON public.stores;

CREATE TRIGGER trg_stores_sync_is_seller
AFTER INSERT OR UPDATE OF owner_id OR DELETE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.stores_sync_is_seller_trg();

-- ----------------------------------------------------------------------------
-- Backfill: fix any current drift between profiles.is_seller and stores
-- ----------------------------------------------------------------------------
UPDATE profiles p
   SET is_seller = EXISTS (SELECT 1 FROM stores s WHERE s.owner_id = p.id),
       updated_at = NOW()
 WHERE p.is_seller IS DISTINCT FROM EXISTS (
         SELECT 1 FROM stores s WHERE s.owner_id = p.id
       );
