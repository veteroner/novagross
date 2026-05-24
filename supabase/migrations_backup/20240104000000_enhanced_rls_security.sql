-- Enhanced Row Level Security Policies
-- Security improvements and additional safeguards for marketplace tables

-- =====================================================
-- STORES TABLE - Enhanced RLS
-- =====================================================
-- Admin can see all stores
CREATE POLICY "Admins can view all stores"
ON stores FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Store owners can view their own store
CREATE POLICY "Store owners can view their own stores"
ON stores FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Public can view active stores only
CREATE POLICY "Public can view active stores"
ON stores FOR SELECT
TO anon, authenticated
USING (status = 'active');

-- Only store owners can update their own stores (except status and commission_rate)
CREATE POLICY "Store owners can update their own stores"
ON stores FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (
  owner_id = auth.uid() AND
  status = (SELECT status FROM stores WHERE id = stores.id) AND
  commission_rate = (SELECT commission_rate FROM stores WHERE id = stores.id)
);

-- Only admins can update store status and commission_rate
CREATE POLICY "Admins can update store status and commission"
ON stores FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- =====================================================
-- STORE_APPLICATIONS - Enhanced RLS
-- =====================================================
-- Users can only view their own applications
CREATE POLICY "Users can view their own applications"
ON store_applications FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'super_admin')
));

-- Users can only insert their own applications (one per user check in trigger)
CREATE POLICY "Users can create their own applications"
ON store_applications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users cannot update applications
-- Only admins can update applications
CREATE POLICY "Only admins can update applications"
ON store_applications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- =====================================================
-- PRODUCTS - Enhanced RLS
-- =====================================================
-- Public can only view approved and active products
CREATE POLICY "Public can view approved active products"
ON products FOR SELECT
TO anon, authenticated
USING (
  approval_status = 'approved' AND 
  is_active = true
);

-- Store owners can view all their products
CREATE POLICY "Store owners can view their own products"
ON products FOR SELECT
TO authenticated
USING (
  store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  )
);

-- Admins can view all products
CREATE POLICY "Admins can view all products"
ON products FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Store owners can insert products for their stores
CREATE POLICY "Store owners can insert products"
ON products FOR INSERT
TO authenticated
WITH CHECK (
  store_id IN (
    SELECT id FROM stores 
    WHERE owner_id = auth.uid() 
    AND status = 'active'
  )
);

-- Store owners can update their own products (except approval fields)
CREATE POLICY "Store owners can update their own products"
ON products FOR UPDATE
TO authenticated
USING (
  store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  ) AND
  approval_status = (SELECT approval_status FROM products WHERE id = products.id) AND
  approved_by = (SELECT approved_by FROM products WHERE id = products.id) AND
  approved_at = (SELECT approved_at FROM products WHERE id = products.id)
);

-- Only admins can update approval status
CREATE POLICY "Admins can update product approval"
ON products FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Store owners can delete their own products
CREATE POLICY "Store owners can delete their own products"
ON products FOR DELETE
TO authenticated
USING (
  store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  )
);

-- =====================================================
-- STORE_BALANCE - Enhanced RLS
-- =====================================================
-- Only store owners can view their own balance
CREATE POLICY "Store owners can view their own balance"
ON store_balance FOR SELECT
TO authenticated
USING (
  store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  )
);

-- Admins can view all balances
CREATE POLICY "Admins can view all balances"
ON store_balance FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- No manual updates to balance (only via functions)
-- Balances should only be updated through stored procedures

-- =====================================================
-- STORE_TRANSACTIONS - Enhanced RLS
-- =====================================================
-- Store owners can view their own transactions
CREATE POLICY "Store owners can view their own transactions"
ON store_transactions FOR SELECT
TO authenticated
USING (
  store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  )
);

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
ON store_transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- No manual inserts/updates (only via functions)

-- =====================================================
-- WITHDRAWAL_REQUESTS - Enhanced RLS
-- =====================================================
-- Store owners can view their own withdrawal requests
CREATE POLICY "Store owners can view their own withdrawals"
ON withdrawal_requests FOR SELECT
TO authenticated
USING (
  store_id IN (
    SELECT id FROM stores WHERE owner_id = auth.uid()
  )
);

-- Store owners can create withdrawal requests
CREATE POLICY "Store owners can create withdrawal requests"
ON withdrawal_requests FOR INSERT
TO authenticated
WITH CHECK (
  store_id IN (
    SELECT id FROM stores 
    WHERE owner_id = auth.uid() 
    AND status = 'active'
  )
);

-- Admins can view all withdrawal requests
CREATE POLICY "Admins can view all withdrawal requests"
ON withdrawal_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Only admins can update withdrawal requests
CREATE POLICY "Admins can update withdrawal requests"
ON withdrawal_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- =====================================================
-- STORE_REVIEWS - Enhanced RLS
-- =====================================================
-- Public can read all reviews
CREATE POLICY "Public can read all store reviews"
ON store_reviews FOR SELECT
TO anon, authenticated
USING (true);

-- Authenticated users can create reviews (one per store check in trigger)
CREATE POLICY "Authenticated users can create reviews"
ON store_reviews FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  -- User must have completed order from this store
  EXISTS (
    SELECT 1 FROM order_items
    JOIN orders ON orders.id = order_items.order_id
    WHERE orders.user_id = auth.uid()
    AND order_items.store_id = store_reviews.store_id
    AND orders.status = 'completed'
  )
);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
ON store_reviews FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
ON store_reviews FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- STORE_FOLLOWERS - Enhanced RLS
-- =====================================================
-- Users can view all followers
CREATE POLICY "Public can view all followers"
ON store_followers FOR SELECT
TO anon, authenticated
USING (true);

-- Users can follow stores
CREATE POLICY "Users can follow stores"
ON store_followers FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can unfollow stores
CREATE POLICY "Users can unfollow stores"
ON store_followers FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- ADDITIONAL SECURITY CONSTRAINTS
-- =====================================================

-- Function to prevent duplicate store applications
CREATE OR REPLACE FUNCTION check_duplicate_application()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM store_applications 
    WHERE user_id = NEW.user_id 
    AND status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'User already has a pending or approved application';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_duplicate_applications
BEFORE INSERT ON store_applications
FOR EACH ROW
EXECUTE FUNCTION check_duplicate_application();

-- Function to prevent duplicate store reviews
CREATE OR REPLACE FUNCTION check_duplicate_review()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM store_reviews 
    WHERE user_id = NEW.user_id 
    AND store_id = NEW.store_id
  ) THEN
    RAISE EXCEPTION 'User already has a review for this store';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_duplicate_reviews
BEFORE INSERT ON store_reviews
FOR EACH ROW
EXECUTE FUNCTION check_duplicate_review();
