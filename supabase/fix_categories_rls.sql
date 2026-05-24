-- ============================================================================
-- Fix Categories RLS Policy
-- ============================================================================
-- This script fixes the RLS issue preventing admins from creating categories
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing categories policies
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can view all categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

-- Recreate categories policies with proper WITH CHECK clauses
CREATE POLICY "Anyone can view active categories"
  ON public.categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all categories"
  ON public.categories FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  USING (public.is_admin());

-- Verify the fix
SELECT 'Categories RLS policies fixed!' as status;
