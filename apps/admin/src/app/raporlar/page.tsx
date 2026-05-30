import { PageHeader } from '@novagross/ui'
import { ReportsOverview } from '../../components/admin/ReportsOverview'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export default async function ReportsPage() {
  const { supabase } = await requireAdmin('/raporlar')

  const [
    { count: totalSellers },
    { count: activeSellers },
    { count: totalProducts },
    { data: orderItems, error: orderItemsError },
    { data: pendingWithdrawals, error: pendingWithdrawalsError },
    { data: productsForCategory, error: productsForCategoryError },
    { data: recentTransactionsRaw, error: recentTransactionsError },
  ] = await Promise.all([
    supabase.from('stores').select('id', { count: 'exact', head: true }),
    supabase.from('stores').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved'),
    supabase
      .from('order_items')
      .select(
        `
        store_id,
        price,
        quantity,
        commission_amount,
        store:store_id (
          id,
          store_name,
          store_slug
        )
      `
      ),
    supabase.from('withdrawal_requests').select('amount').eq('status', 'pending'),
    supabase
      .from('products')
      .select(
        `
        category_id,
        category:category_id (
          id,
          name
        )
      `
      )
      .eq('approval_status', 'approved'),
    supabase
      .from('store_transactions')
      .select(
        `
        id,
        type,
        amount,
        description,
        created_at,
        store:store_id (
          store_name,
          store_slug
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (orderItemsError || pendingWithdrawalsError || productsForCategoryError || recentTransactionsError) {
    console.error('Reports queries failed:', {
      orderItemsError,
      pendingWithdrawalsError,
      productsForCategoryError,
      recentTransactionsError,
    })
  }

  const totalGMV = (orderItems ?? []).reduce(
    (sum: number, item: any) => sum + (item.price ?? 0) * (item.quantity ?? 0),
    0
  )
  const totalCommission = (orderItems ?? []).reduce(
    (sum: number, item: any) => sum + (item.commission_amount ?? 0),
    0
  )
  const totalOrders = (orderItems ?? []).length

  const pendingWithdrawalAmount = (pendingWithdrawals ?? []).reduce(
    (sum: number, w: any) => sum + Number(w.amount ?? 0),
    0
  )

  const overview = {
    totalSellers: totalSellers ?? 0,
    activeSellers: activeSellers ?? 0,
    totalProducts: totalProducts ?? 0,
    totalOrders,
    totalGMV,
    totalCommission,
    pendingWithdrawalAmount,
  }

  // Top sellers (compute from order items)
  const storeStats = (orderItems ?? []).reduce((acc: Record<string, any>, item: any) => {
    const storeId = item.store_id
    if (!storeId || !item.store) return acc

    if (!acc[storeId]) {
      acc[storeId] = {
        store_id: storeId,
        store_name: item.store.store_name,
        store_slug: item.store.store_slug,
        total_revenue: 0,
        total_commission: 0,
        order_count: 0,
      }
    }

    acc[storeId].total_revenue += (item.price ?? 0) * (item.quantity ?? 0)
    acc[storeId].total_commission += item.commission_amount ?? 0
    acc[storeId].order_count += 1

    return acc
  }, {})

  const topSellers = Object.values(storeStats)
    .sort((a: any, b: any) => b.total_revenue - a.total_revenue)
    .slice(0, 10)

  // Category stats (compute from products)
  const categoryAgg = (productsForCategory ?? []).reduce((acc: Record<string, any>, p: any) => {
    const categoryId = p.category_id
    if (!categoryId || !p.category) return acc

    if (!acc[categoryId]) {
      acc[categoryId] = {
        category_id: categoryId,
        category_name: p.category.name,
        product_count: 0,
      }
    }

    acc[categoryId].product_count += 1
    return acc
  }, {})

  const categoryStats = Object.values(categoryAgg).sort(
    (a: any, b: any) => b.product_count - a.product_count
  )

  const recentTransactions = (recentTransactionsRaw ?? []).map((t: any) => ({
    ...t,
    created_at: t.created_at ?? new Date().toISOString(),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Raporları"
        description="Platform genelindeki metrikleri ve analizleri görüntüleyin"
      />

      <ReportsOverview
        overview={overview as any}
        topSellers={topSellers as any}
        categoryStats={categoryStats as any}
        recentTransactions={recentTransactions as any}
      />
    </div>
  )
}
