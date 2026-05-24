-- Performance Optimization Indexes
-- Add indexes for frequently queried columns in marketplace tables

-- =====================================================
-- STORES TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_created_at ON stores(created_at DESC);

-- =====================================================
-- STORE_APPLICATIONS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_store_applications_status ON store_applications(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_store_applications_user_id ON store_applications(user_id);

-- =====================================================
-- PRODUCTS TABLE INDEXES (Enhanced)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_approval_status ON products(approval_status) WHERE approval_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_products_approved_active ON products(store_id, approval_status) WHERE approval_status = 'approved' AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_category_approved ON products(category_id, approval_status) WHERE approval_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- =====================================================
-- ORDERS TABLE INDEXES (Enhanced)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_primary_store_id ON orders(primary_store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- =====================================================
-- ORDER_ITEMS TABLE INDEXES (Enhanced)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_order_items_store_id ON order_items(store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_created ON order_items(order_id, created_at DESC);

-- =====================================================
-- STORE_BALANCE TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_store_balance_store_id ON store_balance(store_id);

-- =====================================================
-- STORE_TRANSACTIONS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_store_transactions_store_created ON store_transactions(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_transactions_type ON store_transactions(type);
CREATE INDEX IF NOT EXISTS idx_store_transactions_order_id ON store_transactions(order_id);

-- =====================================================
-- WITHDRAWAL_REQUESTS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_store_status ON withdrawal_requests(store_id, status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status_created ON withdrawal_requests(status, requested_at DESC) WHERE status = 'pending';

-- =====================================================
-- STORE_REVIEWS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_store_reviews_store_rating ON store_reviews(store_id, rating);
CREATE INDEX IF NOT EXISTS idx_store_reviews_user_id ON store_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_created ON store_reviews(created_at DESC);

-- =====================================================
-- STORE_FOLLOWERS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_store_followers_user_store ON store_followers(user_id, store_id);
CREATE INDEX IF NOT EXISTS idx_store_followers_store_id ON store_followers(store_id);

-- =====================================================
-- PROFILES TABLE INDEXES (Enhanced)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_is_seller ON profiles(is_seller) WHERE is_seller = true;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role IN ('admin', 'super_admin');

-- =====================================================
-- PRODUCT_IMAGES TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_product_images_product_order ON product_images(product_id, display_order);

-- =====================================================
-- OPTIMIZE EXISTING QUERIES
-- =====================================================
-- Composite index for common product search patterns
CREATE INDEX IF NOT EXISTS idx_products_search ON products(name, slug, is_active, approval_status);

-- Composite index for order analytics
CREATE INDEX IF NOT EXISTS idx_order_items_analytics ON order_items(store_id, created_at DESC, unit_price, quantity);

-- Add statistics collection
ANALYZE stores;
ANALYZE store_applications;
ANALYZE products;
ANALYZE orders;
ANALYZE order_items;
ANALYZE store_transactions;
ANALYZE withdrawal_requests;
ANALYZE store_reviews;
