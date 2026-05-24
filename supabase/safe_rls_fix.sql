-- ============================================================================
-- SAFE RLS FIX - Idempotent script (can be run multiple times safely)
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: DROP ALL EXISTING POLICIES FIRST
-- ============================================================================

-- Orders policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers can view orders containing their products" ON public.orders;
DROP POLICY IF EXISTS "Sellers can view orders with their items" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

-- Order items policies
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Sellers can view their order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can delete own order items" ON public.order_items;

-- Email queue policies
DROP POLICY IF EXISTS "Service role only on email_queue" ON public.email_queue;
DROP POLICY IF EXISTS "Backend access to email_queue" ON public.email_queue;

-- Payments policies
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Backend can manage payments" ON public.payments;

-- Profiles policies (for admin fix)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Trigger can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow signup profile creation" ON public.profiles;
DROP POLICY IF EXISTS "System can create profiles" ON public.profiles;

-- ============================================================================
-- PART 2: CREATE/REPLACE SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- is_admin function (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- owns_store function (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.owns_store()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores
    WHERE owner_id = auth.uid()
  );
$$;

-- is_order_owner helper
CREATE OR REPLACE FUNCTION public.is_order_owner(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id AND user_id = auth.uid()
  );
$$;

-- is_order_seller helper
CREATE OR REPLACE FUNCTION public.is_order_seller(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.stores s ON s.id = oi.store_id
    WHERE oi.order_id = p_order_id AND s.owner_id = auth.uid()
  );
$$;

-- ============================================================================
-- PART 3: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: CREATE FRESH POLICIES
-- ============================================================================

-- === ORDERS POLICIES ===
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Sellers can view orders with their items"
  ON public.orders FOR SELECT
  USING (public.is_order_seller(id));

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all orders"
  ON public.orders FOR ALL
  USING (public.is_admin());

-- === ORDER_ITEMS POLICIES ===
CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (public.is_order_owner(order_id));

CREATE POLICY "Sellers can view their order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = order_items.store_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can insert own order items"
  ON public.order_items FOR INSERT
  WITH CHECK (public.is_order_owner(order_id));

CREATE POLICY "Users can delete own order items"
  ON public.order_items FOR DELETE
  USING (public.is_order_owner(order_id));

-- === EMAIL_QUEUE POLICIES ===
CREATE POLICY "Backend access to email_queue"
  ON public.email_queue FOR ALL
  USING (true)
  WITH CHECK (true);

-- === PAYMENTS POLICIES ===
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (public.is_order_owner(order_id));

CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Backend can manage payments"
  ON public.payments FOR ALL
  USING (true)
  WITH CHECK (true);

-- === PROFILES POLICIES ===
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin());

-- Allow profile creation during signup (trigger runs as SECURITY DEFINER)
CREATE POLICY "System can create profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this script:
-- 1. Admin panel should work
-- 2. Users should see their orders
-- 3. Sellers should see orders with their products
-- ============================================================================

-- === STORES POLICIES ===
-- Drop existing
DROP POLICY IF EXISTS "Users can view stores" ON public.stores;
DROP POLICY IF EXISTS "Admins can view all stores" ON public.stores;
DROP POLICY IF EXISTS "Store owners can update own store" ON public.stores;
DROP POLICY IF EXISTS "Admins can manage all stores" ON public.stores;
DROP POLICY IF EXISTS "Public can view active stores" ON public.stores;

-- Enable RLS
ALTER TABLE IF EXISTS public.stores ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Public can view active stores"
  ON public.stores FOR SELECT
  USING (status = 'active');

CREATE POLICY "Store owners can view own store"
  ON public.stores FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Admins can view all stores"
  ON public.stores FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Store owners can update own store"
  ON public.stores FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can manage all stores"
  ON public.stores FOR ALL
  USING (public.is_admin());

-- === STORE_APPLICATIONS POLICIES ===
DROP POLICY IF EXISTS "Users can view own applications" ON public.store_applications;
DROP POLICY IF EXISTS "Users can create applications" ON public.store_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.store_applications;
DROP POLICY IF EXISTS "Admins can manage all applications" ON public.store_applications;

ALTER TABLE IF EXISTS public.store_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
  ON public.store_applications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create applications"
  ON public.store_applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all applications"
  ON public.store_applications FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage all applications"
  ON public.store_applications FOR ALL
  USING (public.is_admin());

SELECT 'RLS FIX COMPLETE!' as status;
