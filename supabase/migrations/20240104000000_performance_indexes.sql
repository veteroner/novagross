-- ============================================================================
-- Nova Store - Performance Optimization
-- ============================================================================
-- Bu migration performans için comprehensive indexler ekler
-- Tip: Composite, Filtered, Partial, Covering indexes
-- ============================================================================

-- ============================================================================
-- ENABLE EXTENSIONS
-- ============================================================================

-- Enable pg_trgm for fuzzy text search (MUST be before indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- PROFILES INDEXES
-- ============================================================================

-- Find sellers
CREATE INDEX IF NOT EXISTS idx_profiles_sellers 
  ON profiles(is_seller, created_at DESC) 
  WHERE is_seller = true;

-- Admin lookup
CREATE INDEX IF NOT EXISTS idx_profiles_admins 
  ON profiles(role, created_at DESC) 
  WHERE role IN ('admin', 'super_admin');

-- Email search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower 
  ON profiles(LOWER(email));

-- ============================================================================
-- CATEGORIES INDEXES
-- ============================================================================

-- Active categories hierarchy
CREATE INDEX IF NOT EXISTS idx_categories_active_hierarchy 
  ON categories(parent_id, sort_order, is_active) 
  WHERE is_active = true;

-- Category navigation
CREATE INDEX IF NOT EXISTS idx_categories_navigation 
  ON categories(is_active, parent_id, sort_order);

-- ============================================================================
-- PRODUCTS INDEXES
-- ============================================================================

-- Public product listing (most important query)
CREATE INDEX IF NOT EXISTS idx_products_public_listing 
  ON products(approval_status, is_active, is_featured, created_at DESC) 
  WHERE approval_status = 'approved' AND is_active = true;

-- Store products
CREATE INDEX IF NOT EXISTS idx_products_store_active 
  ON products(store_id, is_active, approval_status, created_at DESC);

-- Category products
CREATE INDEX IF NOT EXISTS idx_products_category_active 
  ON products(category_id, approval_status, is_active, created_at DESC) 
  WHERE approval_status = 'approved' AND is_active = true;

-- Featured products
CREATE INDEX IF NOT EXISTS idx_products_featured 
  ON products(is_featured, is_active, approval_status, created_at DESC) 
  WHERE is_featured = true AND is_active = true AND approval_status = 'approved';

-- Pending approval queue
CREATE INDEX IF NOT EXISTS idx_products_pending_approval 
  ON products(approval_status, created_at DESC) 
  WHERE approval_status = 'pending';

-- Low stock alert
CREATE INDEX IF NOT EXISTS idx_products_low_stock 
  ON products(stock, is_active) 
  WHERE is_active = true AND stock <= low_stock_threshold;

-- Search optimization (name, slug)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm 
  ON products USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_description_trgm 
  ON products USING gin(description gin_trgm_ops);

-- ============================================================================
-- PRODUCT IMAGES INDEXES
-- ============================================================================

-- Primary image lookup
CREATE INDEX IF NOT EXISTS idx_product_images_primary_lookup 
  ON product_images(product_id, is_primary, sort_order) 
  WHERE is_primary = true;

-- Image ordering
CREATE INDEX IF NOT EXISTS idx_product_images_ordering 
  ON product_images(product_id, sort_order);

-- ============================================================================
-- PRODUCT VARIANTS INDEXES
-- ============================================================================

-- Active variants
CREATE INDEX IF NOT EXISTS idx_product_variants_active 
  ON product_variants(product_id, is_active, created_at) 
  WHERE is_active = true;

-- SKU lookup
CREATE INDEX IF NOT EXISTS idx_product_variants_sku 
  ON product_variants(sku) 
  WHERE sku IS NOT NULL;

-- ============================================================================
-- ADDRESSES INDEXES
-- ============================================================================

-- User default address
CREATE INDEX IF NOT EXISTS idx_addresses_user_default 
  ON addresses(user_id, is_default, address_type) 
  WHERE is_default = true;

-- User addresses by type
CREATE INDEX IF NOT EXISTS idx_addresses_user_type 
  ON addresses(user_id, address_type, created_at DESC);

-- ============================================================================
-- CARTS INDEXES
-- ============================================================================

-- Active user carts
CREATE INDEX IF NOT EXISTS idx_carts_active_user 
  ON carts(user_id, updated_at DESC) 
  WHERE user_id IS NOT NULL;

-- Session carts cleanup
CREATE INDEX IF NOT EXISTS idx_carts_session_cleanup 
  ON carts(session_id, updated_at) 
  WHERE session_id IS NOT NULL;

-- ============================================================================
-- CART ITEMS INDEXES
-- ============================================================================

-- Cart items with product info
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_product 
  ON cart_items(cart_id, product_id, variant_id);

-- Product in carts (for stock checking)
CREATE INDEX IF NOT EXISTS idx_cart_items_product 
  ON cart_items(product_id, quantity);

-- ============================================================================
-- ORDERS INDEXES
-- ============================================================================

-- User order history
CREATE INDEX IF NOT EXISTS idx_orders_user_history 
  ON orders(user_id, created_at DESC, status);

-- Order status processing
CREATE INDEX IF NOT EXISTS idx_orders_status_processing 
  ON orders(status, created_at DESC);

-- Store orders
CREATE INDEX IF NOT EXISTS idx_orders_store_history 
  ON orders(primary_store_id, created_at DESC, status) 
  WHERE primary_store_id IS NOT NULL;

-- Payment status
CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
  ON orders(payment_status, created_at DESC);

-- Order tracking
CREATE INDEX IF NOT EXISTS idx_orders_tracking 
  ON orders(tracking_number) 
  WHERE tracking_number IS NOT NULL;

-- ============================================================================
-- ORDER ITEMS INDEXES
-- ============================================================================

-- Order items by store (analytics)
CREATE INDEX IF NOT EXISTS idx_order_items_store_analytics 
  ON order_items(store_id, created_at DESC, price, quantity) 
  WHERE store_id IS NOT NULL;

-- Product sales analytics
CREATE INDEX IF NOT EXISTS idx_order_items_product_sales 
  ON order_items(product_id, created_at DESC) 
  WHERE product_id IS NOT NULL;

-- Commission tracking
CREATE INDEX IF NOT EXISTS idx_order_items_commission 
  ON order_items(store_id, commission_amount) 
  WHERE store_id IS NOT NULL AND commission_amount > 0;

-- ============================================================================
-- PAYMENTS INDEXES
-- ============================================================================

-- Payment status
CREATE INDEX IF NOT EXISTS idx_payments_status_date 
  ON payments(status, created_at DESC);

-- Provider payments
CREATE INDEX IF NOT EXISTS idx_payments_provider 
  ON payments(provider, provider_payment_id) 
  WHERE provider_payment_id IS NOT NULL;

-- Failed payments
CREATE INDEX IF NOT EXISTS idx_payments_failed 
  ON payments(status, created_at DESC) 
  WHERE status = 'failed';

-- ============================================================================
-- WISHLISTS INDEXES
-- ============================================================================

-- User wishlist lookup
CREATE INDEX IF NOT EXISTS idx_wishlists_user_product 
  ON wishlists(user_id, created_at DESC);

-- Product wishlist count
CREATE INDEX IF NOT EXISTS idx_wishlists_product_count 
  ON wishlists(product_id);

-- ============================================================================
-- REVIEWS INDEXES
-- ============================================================================

-- Approved product reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved 
  ON reviews(product_id, is_approved, created_at DESC) 
  WHERE is_approved = true;

-- Product rating calculation
CREATE INDEX IF NOT EXISTS idx_reviews_product_rating 
  ON reviews(product_id, rating) 
  WHERE is_approved = true;

-- User reviews
CREATE INDEX IF NOT EXISTS idx_reviews_user_history 
  ON reviews(user_id, created_at DESC);

-- Pending approval
CREATE INDEX IF NOT EXISTS idx_reviews_pending 
  ON reviews(is_approved, created_at DESC) 
  WHERE is_approved = false;

-- ============================================================================
-- COUPONS INDEXES
-- ============================================================================

-- Active coupons lookup
CREATE INDEX IF NOT EXISTS idx_coupons_active_lookup 
  ON coupons(code, is_active, expires_at) 
  WHERE is_active = true;

-- Coupon expiration cleanup
CREATE INDEX IF NOT EXISTS idx_coupons_expiration 
  ON coupons(expires_at, is_active) 
  WHERE is_active = true AND expires_at IS NOT NULL;

-- ============================================================================
-- CONTACT MESSAGES INDEXES
-- ============================================================================

-- Admin inbox
CREATE INDEX IF NOT EXISTS idx_contact_messages_inbox 
  ON contact_messages(status, created_at DESC);

-- Unread messages
CREATE INDEX IF NOT EXISTS idx_contact_messages_unread 
  ON contact_messages(created_at DESC) 
  WHERE status = 'new';

-- ============================================================================
-- STORES INDEXES
-- ============================================================================

-- Active stores listing
CREATE INDEX IF NOT EXISTS idx_stores_active_listing 
  ON stores(status, rating DESC, total_sales DESC) 
  WHERE status = 'active';

-- Top rated stores
CREATE INDEX IF NOT EXISTS idx_stores_top_rated 
  ON stores(rating DESC, total_reviews DESC, status) 
  WHERE status = 'active' AND total_reviews >= 5;

-- Store search
CREATE INDEX IF NOT EXISTS idx_stores_name_trgm 
  ON stores USING gin(store_name gin_trgm_ops);

-- Pending verification
CREATE INDEX IF NOT EXISTS idx_stores_pending 
  ON stores(status, created_at DESC) 
  WHERE status = 'pending';

-- Owner lookup
CREATE INDEX IF NOT EXISTS idx_stores_owner_status 
  ON stores(owner_id, status);

-- ============================================================================
-- STORE_APPLICATIONS INDEXES
-- ============================================================================

-- Pending applications queue
CREATE INDEX IF NOT EXISTS idx_applications_pending_queue 
  ON store_applications(status, created_at ASC) 
  WHERE status = 'pending';

-- User application history
CREATE INDEX IF NOT EXISTS idx_applications_user_history 
  ON store_applications(user_id, status, created_at DESC);

-- Admin review tracking
CREATE INDEX IF NOT EXISTS idx_applications_reviewed 
  ON store_applications(reviewed_by, reviewed_at DESC) 
  WHERE reviewed_by IS NOT NULL;

-- ============================================================================
-- STORE_FOLLOWERS INDEXES
-- ============================================================================

-- Store followers count
CREATE INDEX IF NOT EXISTS idx_followers_store_count 
  ON store_followers(store_id, created_at DESC);

-- User following list
CREATE INDEX IF NOT EXISTS idx_followers_user_list 
  ON store_followers(user_id, created_at DESC);

-- Recent followers
CREATE INDEX IF NOT EXISTS idx_followers_recent 
  ON store_followers(store_id, created_at DESC);

-- ============================================================================
-- STORE_REVIEWS INDEXES
-- ============================================================================

-- Store rating calculation
CREATE INDEX IF NOT EXISTS idx_store_reviews_rating_calc 
  ON store_reviews(store_id, rating, is_hidden) 
  WHERE is_hidden = false;

-- Store reviews listing
CREATE INDEX IF NOT EXISTS idx_store_reviews_listing 
  ON store_reviews(store_id, is_hidden, created_at DESC) 
  WHERE is_hidden = false;

-- Verified reviews
CREATE INDEX IF NOT EXISTS idx_store_reviews_verified 
  ON store_reviews(store_id, is_verified, created_at DESC) 
  WHERE is_verified = true AND is_hidden = false;

-- User store reviews
CREATE INDEX IF NOT EXISTS idx_store_reviews_user 
  ON store_reviews(user_id, created_at DESC);

-- ============================================================================
-- STORE_BALANCE INDEXES
-- ============================================================================

-- Store balance lookup (already has unique index on store_id)
-- Additional composite for queries
CREATE INDEX IF NOT EXISTS idx_store_balance_available 
  ON store_balance(store_id, available_balance DESC) 
  WHERE available_balance > 0;

-- Next payout tracking
CREATE INDEX IF NOT EXISTS idx_store_balance_next_payout 
  ON store_balance(next_payout_date, store_id) 
  WHERE next_payout_date IS NOT NULL;

-- ============================================================================
-- STORE_TRANSACTIONS INDEXES
-- ============================================================================

-- Store transaction history
CREATE INDEX IF NOT EXISTS idx_transactions_store_history 
  ON store_transactions(store_id, created_at DESC);

-- Transaction type analytics
CREATE INDEX IF NOT EXISTS idx_transactions_store_type 
  ON store_transactions(store_id, type, created_at DESC);

-- Payout queue
CREATE INDEX IF NOT EXISTS idx_transactions_payout_queue 
  ON store_transactions(payout_date, is_paid, store_id) 
  WHERE payout_date IS NOT NULL AND is_paid = false;

-- Order transactions
CREATE INDEX IF NOT EXISTS idx_transactions_order_lookup 
  ON store_transactions(order_id, store_id) 
  WHERE order_id IS NOT NULL;

-- Commission tracking
CREATE INDEX IF NOT EXISTS idx_transactions_commission 
  ON store_transactions(type, created_at DESC) 
  WHERE type = 'commission';

-- ============================================================================
-- WITHDRAWAL_REQUESTS INDEXES
-- ============================================================================

-- Pending withdrawals queue (admin processing)
CREATE INDEX IF NOT EXISTS idx_withdrawals_pending_queue 
  ON withdrawal_requests(status, requested_at ASC) 
  WHERE status = 'pending';

-- Store withdrawal history
CREATE INDEX IF NOT EXISTS idx_withdrawals_store_history 
  ON withdrawal_requests(store_id, requested_at DESC);

-- Processing status
CREATE INDEX IF NOT EXISTS idx_withdrawals_processing 
  ON withdrawal_requests(status, processed_at DESC);

-- Completed withdrawals
CREATE INDEX IF NOT EXISTS idx_withdrawals_completed 
  ON withdrawal_requests(completed_at DESC) 
  WHERE status = 'completed';

-- Admin workload
CREATE INDEX IF NOT EXISTS idx_withdrawals_admin_workload 
  ON withdrawal_requests(processed_by, processed_at DESC) 
  WHERE processed_by IS NOT NULL;

-- ============================================================================
-- STATISTICS COLLECTION
-- ============================================================================

-- Analyze all tables for query planner optimization
ANALYZE profiles;
ANALYZE categories;
ANALYZE products;
ANALYZE product_images;
ANALYZE product_variants;
ANALYZE addresses;
ANALYZE carts;
ANALYZE cart_items;
ANALYZE orders;
ANALYZE order_items;
ANALYZE payments;
ANALYZE wishlists;
ANALYZE reviews;
ANALYZE coupons;
ANALYZE contact_messages;
ANALYZE stores;
ANALYZE store_applications;
ANALYZE store_followers;
ANALYZE store_reviews;
ANALYZE store_balance;
ANALYZE store_transactions;
ANALYZE withdrawal_requests;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON EXTENSION pg_trgm IS 'Trigram similarity for fuzzy text search';
