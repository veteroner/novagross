import { createClient } from './client'
import {
  sendApplicationApprovedEmail,
  sendApplicationRejectedEmail,
  sendProductApprovedEmail,
  sendProductRejectedEmail,
  sendWithdrawalProcessedEmail,
} from './email-utils'
import type {
  StoreApplication,
  InsertStoreApplication,
  Store,
  InsertStore,
  StoreWithOwner,
} from './marketplace-types'

// ============================================
// STORE APPLICATIONS
// ============================================

export async function createStoreApplication(data: Omit<InsertStoreApplication, 'id' | 'created_at'>) {
  const supabase = createClient()
  
  const { data: application, error } = await supabase
    .from('store_applications')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return application as StoreApplication
}

export async function getStoreApplicationsByUser(userId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('store_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as StoreApplication[]
}

export async function getPendingStoreApplications() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('store_applications')
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getAllStoreApplications(status?: 'pending' | 'approved' | 'rejected') {
  const supabase = createClient()
  
  let query = supabase
    .from('store_applications')
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        first_name,
        last_name
      )
    `)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function approveStoreApplication(
  applicationId: string,
  reviewerId: string,
  storeData: Omit<InsertStore, 'id' | 'created_at' | 'owner_id'>
) {
  const supabase = createClient()

  // 1. Application'ı onayla
  const { data: application, error: appError } = await supabase
    .from('store_applications')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq('id', applicationId)
    .select()
    .single()

  if (appError) throw appError

  // 2. Store oluştur
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .insert({
      ...storeData,
      owner_id: application.user_id,
      status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: reviewerId,
    })
    .select()
    .single()

  if (storeError) throw storeError

  // 3. Profile'ı seller yap
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_seller: true })
    .eq('id', application.user_id)

  if (profileError) throw profileError

  // 4. Store balance kayıt oluştur
  const { error: balanceError } = await supabase
    .from('store_balance')
    .insert({
      store_id: store.id,
      available_balance: 0,
      pending_balance: 0,
      total_withdrawn: 0,
    })

  if (balanceError) throw balanceError

  // 5. Send approval email
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', application.user_id)
      .single()

    if (profile?.email) {
      const ownerName = profile.first_name 
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : 'Değerli Satıcımız'

      await sendApplicationApprovedEmail({
        email: profile.email,
        storeName: store.store_name,
        storeSlug: store.store_slug,
        ownerName,
        storeId: store.id,
      })
    }
  } catch (emailError) {
    // Log but don't throw - email failures shouldn't block the main operation
    console.error('Failed to send approval email:', emailError)
  }

  return store as Store
}

export async function rejectStoreApplication(
  applicationId: string,
  reviewerId: string,
  reason: string,
  adminNotes?: string
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('store_applications')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      admin_notes: adminNotes,
    })
    .eq('id', applicationId)
    .select()
    .single()

  if (error) throw error
  
  // Send rejection email
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', data.user_id)
      .single()

    if (profile?.email) {
      const ownerName = profile.first_name 
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : 'Değerli Başvuru Sahibi'

      await sendApplicationRejectedEmail({
        email: profile.email,
        storeName: data.store_name,
        ownerName,
        rejectionReason: reason,
      })
    }
  } catch (emailError) {
    console.error('Failed to send rejection email:', emailError)
  }
  
  return data as StoreApplication
}

// ============================================
// STORES
// ============================================

export async function getStoreBySlug(slug: string) {
  const supabase = createClient()
  
  const { data, error} = await supabase
    .from('stores')
    .select(`
      *,
      owner:profiles!stores_owner_id_fkey (
        id,
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq('store_slug', slug)
    .eq('status', 'active')
    .single()

  if (error) throw error
  return data as StoreWithOwner
}

export async function getStoreByOwnerId(ownerId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', ownerId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No store found
    throw error
  }
  return data as Store
}

export async function getAllStores(filters?: {
  status?: 'pending' | 'active' | 'suspended' | 'rejected'
  isVerified?: boolean
  city?: string
}) {
  const supabase = createClient()
  
  let query = supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.isVerified !== undefined) {
    query = query.eq('is_verified', filters.isVerified)
  }
  if (filters?.city) {
    query = query.eq('city', filters.city)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Store[]
}

export async function getActiveStores() {
  return getAllStores({ status: 'active' })
}

export async function updateStore(storeId: string, updates: Partial<Store>) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('stores')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId)
    .select()
    .single()

  if (error) throw error
  return data as Store
}

export async function updateStoreStatus(
  storeId: string,
  status: 'active' | 'suspended',
  reason?: string
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('stores')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId)
    .select()
    .single()

  if (error) throw error
  return data as Store
}

// ============================================
// STORE STATS
// ============================================

export async function getStoreStats(storeId: string) {
  const supabase = createClient()
  
  // Product count
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('approval_status', 'approved')

  // Order count (from order_items)
  const { count: orderCount } = await supabase
    .from('order_items')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)

  // Revenue (from order_items)
  const { data: revenueData } = await supabase
    .from('order_items')
    .select('price, quantity')
    .eq('store_id', storeId)

  const totalRevenue = revenueData?.reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  ) || 0

  // Balance
  const { data: balance } = await supabase
    .from('store_balance')
    .select('*')
    .eq('store_id', storeId)
    .single()

  return {
    productCount: productCount || 0,
    orderCount: orderCount || 0,
    totalRevenue,
    availableBalance: balance?.available_balance || 0,
    pendingBalance: balance?.pending_balance || 0,
  }
}

// ============================================================================
// WITHDRAWAL REQUESTS
// ============================================================================

export async function getPendingWithdrawalRequests() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select(`
      *,
      store:store_id (
        id,
        store_name,
        store_slug,
        owner:owner_id (
          id,
          email,
          first_name,
          last_name
        )
      )
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getAllWithdrawalRequests(status?: string) {
  const supabase = createClient()
  
  let query = supabase
    .from('withdrawal_requests')
    .select(`
      *,
      store:store_id (
        id,
        store_name,
        store_slug,
        owner:owner_id (
          id,
          email,
          first_name,
          last_name
        )
      )
    `)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('requested_at', { ascending: false })

  if (error) throw error
  return data
}

export async function approveWithdrawalRequest(
  requestId: string,
  adminId: string,
  transactionId: string,
  adminNotes?: string
) {
  const supabase = createClient()
  
  // Get withdrawal request
  const { data: request, error: requestError } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (requestError) throw requestError
  if (!request) throw new Error('Withdrawal request not found')

  // Update withdrawal request
  const { error: updateError } = await supabase
    .from('withdrawal_requests')
    .update({
      status: 'completed',
      processed_at: new Date().toISOString(),
      processed_by: adminId,
      completed_at: new Date().toISOString(),
      transaction_id: transactionId,
      admin_notes: adminNotes
    })
    .eq('id', requestId)

  if (updateError) throw updateError

  // Get current balance
  const { data: balance, error: balanceError } = await supabase
    .from('store_balance')
    .select('*')
    .eq('store_id', request.store_id)
    .single()

  if (balanceError) throw balanceError
  if (!balance) throw new Error('Store balance not found')

  // Update store balance (already deducted in WithdrawalForm, just update total_withdrawn)
  const { error: balanceUpdateError } = await supabase
    .from('store_balance')
    .update({
      total_withdrawn: (balance.total_withdrawn || 0) + request.amount,
      last_payout_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('store_id', request.store_id)

  if (balanceUpdateError) throw balanceUpdateError

  // Create transaction record
  const { error: transactionError } = await supabase
    .from('store_transactions')
    .insert([{
      store_id: request.store_id,
      type: 'payout',
      amount: -request.amount,
      balance_before: balance.available_balance || 0,
      balance_after: balance.available_balance || 0, // Already deducted
      description: `Para çekme onaylandı - ${transactionId}`,
      is_paid: true,
      payout_date: new Date().toISOString(),
      metadata: {
        withdrawal_request_id: requestId,
        transaction_id: transactionId,
        bank_name: request.bank_name,
        iban: request.iban,
        account_holder: request.account_holder
      }
    }])

  if (transactionError) throw transactionError

  return { success: true }
}

export async function rejectWithdrawalRequest(
  requestId: string,
  adminId: string,
  rejectionReason: string,
  adminNotes?: string
) {
  const supabase = createClient()
  
  // Get withdrawal request
  const { data: request, error: requestError } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (requestError) throw requestError
  if (!request) throw new Error('Withdrawal request not found')

  // Update withdrawal request
  const { error: updateError } = await supabase
    .from('withdrawal_requests')
    .update({
      status: 'rejected',
      processed_at: new Date().toISOString(),
      processed_by: adminId,
      rejection_reason: rejectionReason,
      admin_notes: adminNotes
    })
    .eq('id', requestId)

  if (updateError) throw updateError

  // Get current balance
  const { data: balance, error: balanceError } = await supabase
    .from('store_balance')
    .select('*')
    .eq('store_id', request.store_id)
    .single()

  if (balanceError) throw balanceError
  if (!balance) throw new Error('Store balance not found')

  // Refund the amount to available balance (was deducted in WithdrawalForm)
  const { error: balanceUpdateError } = await supabase
    .from('store_balance')
    .update({
      available_balance: (balance.available_balance || 0) + request.amount,
      updated_at: new Date().toISOString()
    })
    .eq('store_id', request.store_id)

  if (balanceUpdateError) throw balanceUpdateError

  // Create transaction record for refund
  const { error: transactionError } = await supabase
    .from('store_transactions')
    .insert([{
      store_id: request.store_id,
      type: 'adjustment',
      amount: request.amount,
      balance_before: balance.available_balance || 0,
      balance_after: (balance.available_balance || 0) + request.amount,
      description: `Para çekme talebi reddedildi - İade`,
      metadata: {
        withdrawal_request_id: requestId,
        rejection_reason: rejectionReason
      }
    }])

  if (transactionError) throw transactionError

  return { success: true }
}

// ============================================================================
// PRODUCT APPROVAL
// ============================================================================

export async function getPendingProducts() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:category_id (
        id,
        name
      ),
      store:store_id (
        id,
        store_name,
        store_slug,
        owner:owner_id (
          id,
          email,
          first_name,
          last_name
        )
      ),
      product_images (
        id,
        url,
        sort_order
      )
    `)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((p: any) => ({
    ...p,
    product_images: (p.product_images ?? []).map((img: any) => ({
      id: img.id,
      image_url: img.url,
      display_order: img.sort_order ?? 0,
    })),
  }))
}

export async function approveProduct(
  productId: string,
  adminId: string
) {
  const supabase = createClient()

  const { data: product } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      slug,
      store:store_id (
        store_name,
        email,
        owner:owner_id (
          email
        )
      )
    `
    )
    .eq('id', productId)
    .single()

  const { error } = await supabase
    .from('products')
    .update({
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: adminId,
      rejection_reason: null,
    })
    .eq('id', productId)

  if (error) throw error

  try {
    const store = (product as any)?.store
    const email = store?.email || store?.owner?.email
    if (email) {
      await sendProductApprovedEmail({
        email,
        productName: (product as any)?.name,
        productSlug: (product as any)?.slug,
        storeName: store?.store_name,
      })
    }
  } catch (emailError) {
    console.error('Failed to send product approval email:', emailError)
  }

  return { success: true }
}

export async function rejectProduct(
  productId: string,
  adminId: string,
  rejectionReason: string
) {
  const supabase = createClient()

  const { data: product } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      store:store_id (
        store_name,
        email,
        owner:owner_id (
          email
        )
      )
    `
    )
    .eq('id', productId)
    .single()

  const { error } = await supabase
    .from('products')
    .update({
      approval_status: 'rejected',
      approved_at: new Date().toISOString(),
      approved_by: adminId,
      rejection_reason: rejectionReason
    })
    .eq('id', productId)

  if (error) throw error

  try {
    const store = (product as any)?.store
    const email = store?.email || store?.owner?.email
    if (email) {
      await sendProductRejectedEmail({
        email,
        productName: (product as any)?.name,
        storeName: store?.store_name,
        rejectionReason,
      })
    }
  } catch (emailError) {
    console.error('Failed to send product rejection email:', emailError)
  }

  return { success: true }
}

// ============================================================================
// SELLER MANAGEMENT
// ============================================================================

export async function getAllSellers(filters?: {
  status?: 'active' | 'suspended' | 'pending'
  search?: string
}) {
  const supabase = createClient()

  let query = supabase
    .from('stores')
    .select(`
      *,
      owner:owner_id (
        id,
        email,
        first_name,
        last_name,
        phone,
        created_at
      ),
      balance:store_balance (
        available_balance,
        pending_balance,
        total_withdrawn
      )
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.search) {
    query = query.or(
      `store_name.ilike.%${filters.search}%,store_slug.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function getSellerStats(storeId: string) {
  const supabase = createClient()

  // Get product count
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('approval_status', 'approved')

  // Get order count and revenue
  const { data: orderStats } = await supabase
    .from('order_items')
    .select('quantity, price, commission_amount')
    .eq('store_id', storeId)

  const orderCount = orderStats?.length || 0
  const totalRevenue = orderStats?.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  ) || 0
  const totalCommission = orderStats?.reduce(
    (sum, item) => sum + (item.commission_amount || 0),
    0
  ) || 0

  // Get review stats
  const { data: reviews } = await supabase
    .from('store_reviews')
    .select('rating')
    .eq('store_id', storeId)

  const averageRating = reviews?.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0
  const reviewCount = reviews?.length || 0

  return {
    productCount: productCount || 0,
    orderCount,
    totalRevenue,
    totalCommission,
    averageRating,
    reviewCount,
  }
}

export async function updateStoreCommission(
  storeId: string,
  commissionRate: number
) {
  const supabase = createClient()

  // Validate commission rate (0-100)
  if (commissionRate < 0 || commissionRate > 100) {
    throw new Error('Commission rate must be between 0 and 100')
  }

  const { error } = await supabase
    .from('stores')
    .update({ commission_rate: commissionRate })
    .eq('id', storeId)

  if (error) throw error
  return { success: true }
}

// ============================================================================
// PLATFORM ANALYTICS
// ============================================================================

export async function getPlatformOverview() {
  const supabase = createClient()

  // Get total sellers
  const { count: totalSellers } = await supabase
    .from('stores')
    .select('*', { count: 'exact', head: true })

  const { count: activeSellers } = await supabase
    .from('stores')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // Get total products
  const { count: totalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('approval_status', 'approved')

  // Get all order items for revenue calculations
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('quantity, price, commission_amount')

  const totalGMV = orderItems?.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  ) || 0

  const totalCommission = orderItems?.reduce(
    (sum, item) => sum + (item.commission_amount || 0),
    0
  ) || 0

  const totalOrders = orderItems?.length || 0

  // Get pending withdrawals
  const { data: pendingWithdrawals } = await supabase
    .from('withdrawal_requests')
    .select('amount')
    .eq('status', 'pending')

  const pendingWithdrawalAmount = pendingWithdrawals?.reduce(
    (sum, w) => sum + Number(w.amount),
    0
  ) || 0

  return {
    totalSellers: totalSellers || 0,
    activeSellers: activeSellers || 0,
    totalProducts: totalProducts || 0,
    totalOrders,
    totalGMV,
    totalCommission,
    pendingWithdrawalAmount,
  }
}

export async function getTopSellersByRevenue(limit: number = 10) {
  const supabase = createClient()

  const { data: orderItems } = await supabase
    .from('order_items')
    .select(`
      store_id,
      price,
      quantity,
      commission_amount,
      store:store_id (
        id,
        store_name,
        store_slug
      )
    `)

  if (!orderItems) return []

  // Group by store and calculate totals
  const storeStats = orderItems.reduce((acc, item) => {
    const storeId = item.store_id
    if (!storeId || !item.store) return acc

    if (!acc[storeId]) {
      acc[storeId] = {
        store_id: storeId,
        store_name: (item.store as any).store_name,
        store_slug: (item.store as any).store_slug,
        total_revenue: 0,
        total_commission: 0,
        order_count: 0,
      }
    }

    acc[storeId].total_revenue += item.price * item.quantity
    acc[storeId].total_commission += item.commission_amount || 0
    acc[storeId].order_count += 1

    return acc
  }, {} as Record<string, any>)

  return Object.values(storeStats)
    .sort((a: any, b: any) => b.total_revenue - a.total_revenue)
    .slice(0, limit)
}

export async function getCategoryStats() {
  const supabase = createClient()

  const { data: products } = await supabase
    .from('products')
    .select(`
      category_id,
      category:category_id (
        id,
        name
      )
    `)
    .eq('approval_status', 'approved')

  if (!products) return []

  // Count products per category
  const categoryStats = products.reduce((acc, product) => {
    const categoryId = product.category_id
    if (!categoryId || !product.category) return acc

    if (!acc[categoryId]) {
      acc[categoryId] = {
        category_id: categoryId,
        category_name: (product.category as any).name,
        product_count: 0,
      }
    }

    acc[categoryId].product_count += 1
    return acc
  }, {} as Record<string, any>)

  return Object.values(categoryStats)
    .sort((a: any, b: any) => b.product_count - a.product_count)
}

export async function getRecentTransactions(limit: number = 10) {
  const supabase = createClient()

  const { data } = await supabase
    .from('store_transactions')
    .select(`
      *,
      store:store_id (
        id,
        store_name,
        store_slug
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}
