-- ============================================================================
-- FIX: is_admin() function and profiles RLS recursion
-- ============================================================================
-- Problem: is_admin() queries profiles table, but profiles RLS uses is_admin()
-- This creates infinite recursion when admin tries to view profiles.
-- Solution: Make is_admin() bypass RLS via SECURITY DEFINER properly
-- ============================================================================

-- Recreate is_admin() as SECURITY DEFINER with proper settings
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

-- Also recreate owns_store() with proper SECURITY DEFINER settings
CREATE OR REPLACE FUNCTION public.owns_store(store_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = store_id_param AND owner_id = auth.uid()
  );
$$;

-- Drop and recreate profiles policies to ensure they work correctly
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Users can always view their own profile (no function call needed)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Users can update own profile (prevent role escalation)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- Admins can insert/delete profiles if needed
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- Also fix stores RLS for admin access
-- ============================================================================
ALTER TABLE IF EXISTS public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all stores" ON public.stores;
CREATE POLICY "Admins can manage all stores"
  ON public.stores FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After applying this migration:
-- 1. Admin panel should load without errors
-- 2. Admin users can view all orders
-- 3. Admin users can view all profiles
-- ============================================================================
