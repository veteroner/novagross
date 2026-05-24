-- ============================================================================
-- Nova Store - Row Level Security (RLS) Policies
-- ============================================================================
-- Bu migration tüm tablolar için RLS politikalarını tanımlar
-- Güvenlik: Admin/Owner/Public separation, field-level protection
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR POLICIES
-- ============================================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user owns a store
CREATE OR REPLACE FUNCTION owns_store(store_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM stores
    WHERE id = store_id_param AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM profiles WHERE id = auth.uid()) -- Prevent role escalation
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (is_admin());

-- ============================================================================
-- CATEGORIES POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all categories"
  ON categories FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (is_admin());

-- ============================================================================
-- PRODUCTS POLICIES
-- ============================================================================

-- Public can view approved active products
CREATE POLICY "Public can view approved products"
  ON products FOR SELECT
  USING (approval_status = 'approved' AND is_active = true);

-- Sellers can view own products
CREATE POLICY "Sellers can view own products"
  ON products FOR SELECT
  USING (owns_store(store_id));

-- Admins can view all products
CREATE POLICY "Admins can view all products"
  ON products FOR SELECT
  USING (is_admin());

-- Sellers can insert own products
CREATE POLICY "Sellers can insert products"
  ON products FOR INSERT
  WITH CHECK (owns_store(store_id));

-- Sellers can update own products (except approval fields)
CREATE POLICY "Sellers can update own products"
  ON products FOR UPDATE
  USING (owns_store(store_id))
  WITH CHECK (
    owns_store(store_id) AND
    approval_status = (SELECT approval_status FROM products WHERE id = products.id) AND -- Can't change approval
    approved_by = (SELECT approved_by FROM products WHERE id = products.id) AND -- Can't change approver
    approved_at = (SELECT approved_at FROM products WHERE id = products.id) -- Can't change approval date
  );

-- Admins can manage all products
CREATE POLICY "Admins can manage all products"
  ON products FOR ALL
  USING (is_admin());

-- ============================================================================
-- PRODUCT IMAGES POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  USING (true);

CREATE POLICY "Sellers can manage own product images"
  ON product_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND owns_store(products.store_id)
    )
  );

CREATE POLICY "Admins can manage all product images"
  ON product_images FOR ALL
  USING (is_admin());

-- ============================================================================
-- PRODUCT VARIANTS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view active variants"
  ON product_variants FOR SELECT
  USING (is_active = true);

CREATE POLICY "Sellers can view own variants"
  ON product_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND owns_store(products.store_id)
    )
  );

CREATE POLICY "Sellers can manage own variants"
  ON product_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
      AND owns_store(products.store_id)
    )
  );

CREATE POLICY "Admins can manage all variants"
  ON product_variants FOR ALL
  USING (is_admin());

-- ============================================================================
-- ADDRESSES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own addresses"
  ON addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own addresses"
  ON addresses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all addresses"
  ON addresses FOR SELECT
  USING (is_admin());

-- ============================================================================
-- CARTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own cart"
  ON carts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cart"
  ON carts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- CART ITEMS POLICIES
-- ============================================================================

CREATE POLICY "Users can manage own cart items"
  ON cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

-- ============================================================================
-- ORDERS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Sellers can view orders containing their products"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      WHERE oi.order_id = orders.id
      AND owns_store(oi.store_id)
    )
  );

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all orders"
  ON orders FOR ALL
  USING (is_admin());

-- ============================================================================
-- ORDER ITEMS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can view their order items"
  ON order_items FOR SELECT
  USING (owns_store(store_id));

CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (is_admin());

-- ============================================================================
-- PAYMENTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payments.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (is_admin());

-- ============================================================================
-- WISHLISTS POLICIES
-- ============================================================================

CREATE POLICY "Users can manage own wishlist"
  ON wishlists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- REVIEWS POLICIES (Product Reviews)
-- ============================================================================

CREATE POLICY "Anyone can view approved reviews"
  ON reviews FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Users can view own reviews"
  ON reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reviews"
  ON reviews FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can create own reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews"
  ON reviews FOR ALL
  USING (is_admin());

-- ============================================================================
-- COUPONS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view active coupons"
  ON coupons FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Admins can manage all coupons"
  ON coupons FOR ALL
  USING (is_admin());

-- ============================================================================
-- CONTACT MESSAGES POLICIES
-- ============================================================================

CREATE POLICY "Anyone can insert contact messages"
  ON contact_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage all contact messages"
  ON contact_messages FOR ALL
  USING (is_admin());

-- ============================================================================
-- STORES POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view active stores"
  ON stores FOR SELECT
  USING (status = 'active');

CREATE POLICY "Sellers can view own store"
  ON stores FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can view all stores"
  ON stores FOR SELECT
  USING (is_admin());

CREATE POLICY "Sellers can update own store (except admin fields)"
  ON stores FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (
    auth.uid() = owner_id AND
    status = (SELECT status FROM stores WHERE id = stores.id) AND -- Can't change status
    commission_rate = (SELECT commission_rate FROM stores WHERE id = stores.id) AND -- Can't change commission
    approved_by = (SELECT approved_by FROM stores WHERE id = stores.id) AND -- Can't change approver
    approved_at = (SELECT approved_at FROM stores WHERE id = stores.id) -- Can't change approval date
  );

CREATE POLICY "Admins can manage all stores"
  ON stores FOR ALL
  USING (is_admin());

-- ============================================================================
-- STORE_APPLICATIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own applications"
  ON store_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
  ON store_applications FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can create own applications"
  ON store_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all applications"
  ON store_applications FOR ALL
  USING (is_admin());

-- ============================================================================
-- STORE_FOLLOWERS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view followers"
  ON store_followers FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own follows"
  ON store_followers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own follows"
  ON store_followers FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STORE_REVIEWS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view non-hidden store reviews"
  ON store_reviews FOR SELECT
  USING (is_hidden = false);

CREATE POLICY "Users can view own store reviews"
  ON store_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Sellers can view their store reviews"
  ON store_reviews FOR SELECT
  USING (owns_store(store_id));

CREATE POLICY "Admins can view all store reviews"
  ON store_reviews FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can create own store reviews"
  ON store_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own store reviews"
  ON store_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all store reviews"
  ON store_reviews FOR ALL
  USING (is_admin());

-- ============================================================================
-- STORE_BALANCE POLICIES
-- ============================================================================

CREATE POLICY "Sellers can view own balance"
  ON store_balance FOR SELECT
  USING (owns_store(store_id));

CREATE POLICY "Admins can view all balances"
  ON store_balance FOR SELECT
  USING (is_admin());

-- No INSERT/UPDATE/DELETE policies - only functions can modify balance

-- ============================================================================
-- STORE_TRANSACTIONS POLICIES
-- ============================================================================

CREATE POLICY "Sellers can view own transactions"
  ON store_transactions FOR SELECT
  USING (owns_store(store_id));

CREATE POLICY "Admins can view all transactions"
  ON store_transactions FOR SELECT
  USING (is_admin());

-- No INSERT/UPDATE/DELETE policies - only functions can create transactions

-- ============================================================================
-- WITHDRAWAL_REQUESTS POLICIES
-- ============================================================================

CREATE POLICY "Sellers can view own withdrawal requests"
  ON withdrawal_requests FOR SELECT
  USING (owns_store(store_id));

CREATE POLICY "Admins can view all withdrawal requests"
  ON withdrawal_requests FOR SELECT
  USING (is_admin());

CREATE POLICY "Sellers can create withdrawal requests"
  ON withdrawal_requests FOR INSERT
  WITH CHECK (owns_store(store_id));

CREATE POLICY "Admins can manage all withdrawal requests"
  ON withdrawal_requests FOR ALL
  USING (is_admin());

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Note: Storage policies are managed separately in Supabase Dashboard
-- (Storage > Policies) to avoid conflicts

COMMENT ON FUNCTION is_admin() IS 'Check if current user is admin or super_admin';
COMMENT ON FUNCTION owns_store(UUID) IS 'Check if current user owns the specified store';
