-- ============================================================================
-- FRESH RLS SETUP - Sıfırdan RLS Kurulumu
-- ============================================================================
-- ÖNCE tüm policy'leri temizleyin, SONRA bu scripti çalıştırın
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE/REPLACE SECURITY DEFINER FUNCTIONS
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
-- PART 2: ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: CREATE FRESH POLICIES
-- ============================================================================

-- === PROFILES POLICIES ===
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "profiles_all_admin"
  ON public.profiles FOR ALL
  USING (public.is_admin());

CREATE POLICY "profiles_insert_system"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- === ORDERS POLICIES ===
CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "orders_select_seller"
  ON public.orders FOR SELECT
  USING (public.is_order_seller(id));

CREATE POLICY "orders_select_admin"
  ON public.orders FOR SELECT
  USING (public.is_admin());

CREATE POLICY "orders_insert_own"
  ON public.orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders_all_admin"
  ON public.orders FOR ALL
  USING (public.is_admin());

-- === ORDER_ITEMS POLICIES ===
CREATE POLICY "order_items_select_own"
  ON public.order_items FOR SELECT
  USING (public.is_order_owner(order_id));

CREATE POLICY "order_items_select_seller"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = order_items.store_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "order_items_select_admin"
  ON public.order_items FOR SELECT
  USING (public.is_admin());

CREATE POLICY "order_items_insert_own"
  ON public.order_items FOR INSERT
  WITH CHECK (public.is_order_owner(order_id));

CREATE POLICY "order_items_delete_own"
  ON public.order_items FOR DELETE
  USING (public.is_order_owner(order_id));

-- === EMAIL_QUEUE POLICIES ===
CREATE POLICY "email_queue_all_backend"
  ON public.email_queue FOR ALL
  USING (true)
  WITH CHECK (true);

-- === PAYMENTS POLICIES ===
CREATE POLICY "payments_select_own"
  ON public.payments FOR SELECT
  USING (public.is_order_owner(order_id));

CREATE POLICY "payments_select_admin"
  ON public.payments FOR SELECT
  USING (public.is_admin());

CREATE POLICY "payments_all_backend"
  ON public.payments FOR ALL
  USING (true)
  WITH CHECK (true);

-- === STORES POLICIES ===
CREATE POLICY "stores_select_active"
  ON public.stores FOR SELECT
  USING (status = 'active');

CREATE POLICY "stores_select_own"
  ON public.stores FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "stores_select_admin"
  ON public.stores FOR SELECT
  USING (public.is_admin());

CREATE POLICY "stores_update_own"
  ON public.stores FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "stores_all_admin"
  ON public.stores FOR ALL
  USING (public.is_admin());

-- === STORE_APPLICATIONS POLICIES ===
CREATE POLICY "store_applications_select_own"
  ON public.store_applications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "store_applications_insert_own"
  ON public.store_applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "store_applications_select_admin"
  ON public.store_applications FOR SELECT
  USING (public.is_admin());

CREATE POLICY "store_applications_all_admin"
  ON public.store_applications FOR ALL
  USING (public.is_admin());

-- === PRODUCTS POLICIES ===
CREATE POLICY "products_select_active"
  ON public.products FOR SELECT
  USING (is_active = true AND approval_status = 'approved');

CREATE POLICY "products_select_own_store"
  ON public.products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = products.store_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "products_select_admin"
  ON public.products FOR SELECT
  USING (public.is_admin());

CREATE POLICY "products_insert_own_store"
  ON public.products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = products.store_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "products_update_own_store"
  ON public.products FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = products.store_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "products_all_admin"
  ON public.products FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Policy sayısını kontrol et
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'orders', 'order_items', 'email_queue', 'payments', 'stores', 'store_applications', 'products')
GROUP BY tablename
ORDER BY tablename;

-- Admin fonksiyonu test et
SELECT public.is_admin() as am_i_admin;

SELECT 'FRESH RLS SETUP COMPLETE!' as status;
