'use client'

import Link from 'next/link'

type PlatformOverview = {
  totalSellers: number
  activeSellers: number
  totalProducts: number
  totalOrders: number
  totalGMV: number
  totalCommission: number
  pendingWithdrawalAmount: number
}

type TopSeller = {
  store_id: string
  store_name: string
  store_slug: string
  total_revenue: number
  total_commission: number
  order_count: number
}

type CategoryStat = {
  category_id: string
  category_name: string
  product_count: number
}

type Transaction = {
  id: string
  type: string
  amount: number
  description: string | null
  created_at: string
  store: {
    store_name: string
    store_slug: string
  }
}

interface ReportsOverviewProps {
  overview: PlatformOverview
  topSellers: TopSeller[]
  categoryStats: CategoryStat[]
  recentTransactions: Transaction[]
}

export function ReportsOverview({
  overview,
  topSellers,
  categoryStats,
  recentTransactions,
}: ReportsOverviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTransactionColor = (type: string) => {
    const colors: Record<string, string> = {
      sale: 'text-green-600',
      commission: 'text-blue-600',
      payout: 'text-red-600',
      adjustment: 'text-purple-600',
      refund: 'text-orange-600',
    }
    return colors[type] || 'text-gray-600'
  }

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      sale: 'Satış',
      commission: 'Komisyon',
      payout: 'Ödeme',
      adjustment: 'Düzeltme',
      refund: 'İade',
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Toplam GMV</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(overview.totalGMV)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Toplam Komisyon</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(overview.totalCommission)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💵</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Aktif Satıcı</p>
              <p className="text-2xl font-bold text-purple-600">
                {overview.activeSellers}
                <span className="text-sm text-gray-500 ml-1">
                  / {overview.totalSellers}
                </span>
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Toplam Ürün</p>
              <p className="text-2xl font-bold text-orange-600">{overview.totalProducts}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Toplam Sipariş</p>
              <p className="text-2xl font-bold text-gray-900">{overview.totalOrders}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🛒</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Bekleyen Çekimler</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(overview.pendingWithdrawalAmount)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Ortalama Sipariş</p>
              <p className="text-2xl font-bold text-indigo-600">
                {overview.totalOrders > 0
                  ? formatCurrency(overview.totalGMV / overview.totalOrders)
                  : formatCurrency(0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Komisyon Oranı</p>
              <p className="text-2xl font-bold text-pink-600">
                {overview.totalGMV > 0
                  ? ((overview.totalCommission / overview.totalGMV) * 100).toFixed(2)
                  : '0.00'}
                %
              </p>
            </div>
            <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Sellers and Category Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sellers */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">En İyi Satıcılar</h2>
            <p className="text-sm text-gray-500 mt-1">Toplam ciroya göre sıralama</p>
          </div>
          <div className="p-6">
            {topSellers.length > 0 ? (
              <div className="space-y-4">
                {topSellers.map((seller, index) => (
                  <div
                    key={seller.store_id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <Link
                          href={`/magazalar/${seller.store_slug}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {seller.store_name}
                        </Link>
                        <p className="text-sm text-gray-500">{seller.order_count} sipariş</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(seller.total_revenue)}
                      </p>
                      <p className="text-sm text-green-600">
                        {formatCurrency(seller.total_commission)} komisyon
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Henüz satış bulunmuyor</p>
            )}
          </div>
        </div>

        {/* Category Stats */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Kategori Dağılımı</h2>
            <p className="text-sm text-gray-500 mt-1">Ürün sayısına göre kategoriler</p>
          </div>
          <div className="p-6">
            {categoryStats.length > 0 ? (
              <div className="space-y-3">
                {categoryStats.slice(0, 10).map((category) => (
                  <div key={category.category_id} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {category.category_name}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              (category.product_count / overview.totalProducts) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                        {category.product_count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Henüz ürün bulunmuyor</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Son İşlemler</h2>
          <p className="text-sm text-gray-500 mt-1">Platform genelindeki finansal işlemler</p>
        </div>
        <div className="overflow-x-auto">
          {recentTransactions.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Mağaza
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tür
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Açıklama
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Tutar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/magazalar/${transaction.store.store_slug}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {transaction.store.store_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getTransactionColor(transaction.type)}`}>
                        {getTransactionLabel(transaction.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {transaction.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-8">Henüz işlem bulunmuyor</p>
          )}
        </div>
      </div>
    </div>
  )
}
