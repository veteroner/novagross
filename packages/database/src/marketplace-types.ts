// Marketplace-specific types
// Novagross Çok Satıcılı Marketplace Tipleri

import { Json } from './types'

// ============================================================================
// STORES (Mağazalar)
// ============================================================================

export interface Store {
  id: string
  owner_id: string
  store_name: string
  store_slug: string
  description: string | null
  logo_url: string | null
  banner_url: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  district: string | null
  country: string
  postal_code: string | null
  company_name: string | null
  tax_number: string | null
  tax_office: string | null
  bank_name: string | null
  iban: string | null
  account_holder: string | null
  status: 'pending' | 'active' | 'suspended' | 'rejected'
  is_verified: boolean
  verification_badge: 'bronze' | 'silver' | 'gold' | 'platinum' | null
  rating: number
  total_reviews: number
  total_sales: number
  total_revenue: number
  commission_rate: number
  shipping_methods: Json
  free_shipping_threshold: number
  created_at: string
  updated_at: string
  approved_at: string | null
  approved_by: string | null
}

export interface InsertStore {
  id?: string
  owner_id: string
  store_name: string
  store_slug: string
  description?: string | null
  logo_url?: string | null
  banner_url?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  country?: string
  postal_code?: string | null
  company_name?: string | null
  tax_number?: string | null
  tax_office?: string | null
  bank_name?: string | null
  iban?: string | null
  account_holder?: string | null
  status?: 'pending' | 'active' | 'suspended' | 'rejected'
  is_verified?: boolean
  verification_badge?: 'bronze' | 'silver' | 'gold' | 'platinum' | null
  rating?: number
  total_reviews?: number
  total_sales?: number
  total_revenue?: number
  commission_rate?: number
  shipping_methods?: Json
  free_shipping_threshold?: number
  created_at?: string
  updated_at?: string
  approved_at?: string | null
  approved_by?: string | null
}

export interface UpdateStore {
  id?: string
  owner_id?: string
  store_name?: string
  store_slug?: string
  description?: string | null
  logo_url?: string | null
  banner_url?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  country?: string
  postal_code?: string | null
  company_name?: string | null
  tax_number?: string | null
  tax_office?: string | null
  bank_name?: string | null
  iban?: string | null
  account_holder?: string | null
  status?: 'pending' | 'active' | 'suspended' | 'rejected'
  is_verified?: boolean
  verification_badge?: 'bronze' | 'silver' | 'gold' | 'platinum' | null
  rating?: number
  total_reviews?: number
  total_sales?: number
  total_revenue?: number
  commission_rate?: number
  shipping_methods?: Json
  free_shipping_threshold?: number
  created_at?: string
  updated_at?: string
  approved_at?: string | null
  approved_by?: string | null
}

// ============================================================================
// STORE APPLICATIONS (Satıcı Başvuruları)
// ============================================================================

export interface StoreApplication {
  id: string
  user_id: string
  store_name: string
  store_slug: string
  description: string | null
  company_name: string | null
  tax_number: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  district: string | null
  postal_code: string | null
  identity_document_url: string | null
  tax_certificate_url: string | null
  business_license_url: string | null
  other_documents: Json
  status: 'pending' | 'approved' | 'rejected' | 'under_review'
  rejection_reason: string | null
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  admin_notes: string | null
}

export interface InsertStoreApplication {
  id?: string
  user_id: string
  store_name: string
  store_slug: string
  description?: string | null
  company_name?: string | null
  tax_number?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  district?: string | null
  postal_code?: string | null
  identity_document_url?: string | null
  tax_certificate_url?: string | null
  business_license_url?: string | null
  other_documents?: Json
  status?: 'pending' | 'approved' | 'rejected' | 'under_review'
  rejection_reason?: string | null
  created_at?: string
  reviewed_at?: string | null
  reviewed_by?: string | null
  admin_notes?: string | null
}

// ============================================================================
// STORE FOLLOWERS (Mağaza Takipçileri)
// ============================================================================

export interface StoreFollower {
  id: string
  store_id: string
  user_id: string
  created_at: string
}

export interface InsertStoreFollower {
  id?: string
  store_id: string
  user_id: string
  created_at?: string
}

// ============================================================================
// STORE REVIEWS (Mağaza Yorumları)
// ============================================================================

export interface StoreReview {
  id: string
  store_id: string
  user_id: string
  order_id: string | null
  rating: number
  title: string | null
  comment: string | null
  is_verified: boolean
  is_hidden: boolean
  created_at: string
  updated_at: string
}

export interface InsertStoreReview {
  id?: string
  store_id: string
  user_id: string
  order_id?: string | null
  rating: number
  title?: string | null
  comment?: string | null
  is_verified?: boolean
  is_hidden?: boolean
  created_at?: string
  updated_at?: string
}

// ============================================================================
// STORE BALANCE (Satıcı Bakiyeleri)
// ============================================================================

export interface StoreBalance {
  id: string
  store_id: string
  available_balance: number
  pending_balance: number
  total_withdrawn: number
  last_payout_date: string | null
  next_payout_date: string | null
  updated_at: string
}

export interface UpdateStoreBalance {
  available_balance?: number
  pending_balance?: number
  total_withdrawn?: number
  last_payout_date?: string | null
  next_payout_date?: string | null
  updated_at?: string
}

// ============================================================================
// STORE TRANSACTIONS (Finansal İşlemler)
// ============================================================================

export interface StoreTransaction {
  id: string
  store_id: string
  order_id: string | null
  order_item_id: string | null
  type: 'sale' | 'commission' | 'refund' | 'payout' | 'penalty' | 'adjustment'
  amount: number
  balance_before: number
  balance_after: number
  description: string | null
  metadata: Json
  payout_date: string | null
  is_paid: boolean
  created_at: string
}

export interface InsertStoreTransaction {
  id?: string
  store_id: string
  order_id?: string | null
  order_item_id?: string | null
  type: 'sale' | 'commission' | 'refund' | 'payout' | 'penalty' | 'adjustment'
  amount: number
  balance_before: number
  balance_after: number
  description?: string | null
  metadata?: Json
  payout_date?: string | null
  is_paid?: boolean
  created_at?: string
}

// ============================================================================
// WITHDRAWAL REQUESTS (Para Çekme Talepleri)
// ============================================================================

export interface WithdrawalRequest {
  id: string
  store_id: string
  amount: number
  fee: number
  net_amount: number
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled'
  bank_name: string
  iban: string
  account_holder: string
  rejection_reason: string | null
  admin_notes: string | null
  transaction_id: string | null
  requested_at: string
  processed_at: string | null
  processed_by: string | null
  completed_at: string | null
  created_at: string
}

export interface InsertWithdrawalRequest {
  id?: string
  store_id: string
  amount: number
  fee?: number
  net_amount: number
  status?: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled'
  bank_name: string
  iban: string
  account_holder: string
  rejection_reason?: string | null
  admin_notes?: string | null
  transaction_id?: string | null
  requested_at?: string
  processed_at?: string | null
  processed_by?: string | null
  completed_at?: string | null
  created_at?: string
}

// ============================================================================
// EXTENDED TYPES
// ============================================================================

export interface StoreWithOwner extends Store {
  owner: {
    id: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
}

export interface StoreWithBalance extends Store {
  balance: StoreBalance
}

export interface StoreWithStats extends Store {
  follower_count: number
  product_count: number
  this_month_sales: number
}

export interface StoreApplicationWithUser extends StoreApplication {
  user: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  }
}

export interface StoreReviewWithUser extends StoreReview {
  user: {
    id: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
}

export interface WithdrawalRequestWithStore extends WithdrawalRequest {
  store: {
    id: string
    store_name: string
    owner_id: string
  }
}

// ============================================================================
// PRODUCT EXTENSIONS (Marketplace için)
// ============================================================================

export interface MarketplaceProduct {
  id: string
  store_id: string | null
  approval_status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  approved_at: string | null
  approved_by: string | null
  [key: string]: any // Diğer product field'ları
}

export interface ProductWithStore extends MarketplaceProduct {
  store: Store | null
}

// ============================================================================
// ORDER EXTENSIONS (Marketplace için)
// ============================================================================

export interface MarketplaceOrderItem {
  id: string
  store_id: string | null
  commission_amount: number
  commission_rate: number
  seller_amount: number
  [key: string]: any // Diğer order_item field'ları
}

export interface MarketplaceOrder {
  id: string
  primary_store_id: string | null
  has_multiple_stores: boolean
  [key: string]: any // Diğer order field'ları
}

// ============================================================================
// SHIPPING METHOD TYPE
// ============================================================================

export interface ShippingMethod {
  provider: string
  name: string
  price: number
  estimated_days: number
  is_default?: boolean
}

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

export interface SellerDashboardStats {
  today_sales: number
  today_orders: number
  pending_orders: number
  available_balance: number
  pending_balance: number
  total_products: number
  active_products: number
  pending_approval_products: number
  total_reviews: number
  avg_rating: number
  follower_count: number
}

export interface AdminMarketplaceStats {
  total_stores: number
  active_stores: number
  pending_applications: number
  total_sellers: number
  total_marketplace_sales: number
  total_commission_earned: number
  pending_withdrawals: number
  pending_product_approvals: number
}
