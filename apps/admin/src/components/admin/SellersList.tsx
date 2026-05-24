'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSellerStats, updateStoreStatus } from '@novagross/database'

type StoreBalance = {
  available_balance: number
  pending_balance: number
  total_withdrawn: number
}

type StoreOwner = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  created_at: string
}

type Store = {
  id: string
  owner_id: string
  store_name: string
  store_slug: string
  status: string
  created_at: string
  owner: StoreOwner
  balance: StoreBalance | null
}

type SellerStats = {
  productCount: number
  orderCount: number
  totalRevenue: number
  totalCommission: number
  averageRating: number
  reviewCount: number
}

interface SellersListProps {
  initialSellers: Store[]
}

export function SellersList({ initialSellers }: SellersListProps) {
  const [sellers, setSellers] = useState<Store[]>(initialSellers)
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'pending'>('all')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState<Record<string, SellerStats>>({})
  const [loading, setLoading] = useState(false)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [showSuspendModal, setShowSuspendModal] = useState(false)

  // Load stats for visible sellers
  useEffect(() => {
    const loadStats = async () => {
      const visibleSellers = getFilteredSellers()
      const newStats: Record<string, SellerStats> = {}

      for (const seller of visibleSellers.slice(0, 20)) {
        if (!stats[seller.id]) {
          try {
            const sellerStats = await getSellerStats(seller.id)
            newStats[seller.id] = sellerStats
          } catch (error) {
            console.error(`Error loading stats for ${seller.id}:`, error)
          }
        }
      }

      setStats((prev) => ({ ...prev, ...newStats }))
    }

    loadStats()
  }, [filter, search])

  const getFilteredSellers = () => {
    let filtered = sellers

    if (filter !== 'all') {
      filtered = filtered.filter((s) => s.status === filter)
    }

    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.store_name.toLowerCase().includes(search.toLowerCase()) ||
          s.store_slug.toLowerCase().includes(search.toLowerCase()) ||
          (s.owner?.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    }

    return filtered
  }

  const handleSuspend = async () => {
    if (!selectedStore) return

    setLoading(true)
    try {
      const newStatus = selectedStore.status === 'active' ? 'suspended' : 'active'
      await updateStoreStatus(selectedStore.id, newStatus)

      setSellers(
        sellers.map((s) =>
          s.id === selectedStore.id ? { ...s, status: newStatus } : s
        )
      )
      setShowSuspendModal(false)
      setSelectedStore(null)
      alert(
        newStatus === 'suspended'
          ? 'Satıcı askıya alındı!'
          : 'Satıcı yeniden aktif edildi!'
      )
    } catch (error) {
      console.error('Error updating store status:', error)
      alert('Durum güncellenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    }

    const labels = {
      active: 'Aktif',
      suspended: 'Askıya Alınmış',
      pending: 'Beklemede',
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          variants[status as keyof typeof variants]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const filteredSellers = getFilteredSellers()
  const counts = {
    all: sellers.length,
    active: sellers.filter((s) => s.status === 'active').length,
    suspended: sellers.filter((s) => s.status === 'suspended').length,
    pending: sellers.filter((s) => s.status === 'pending').length,
  }

  return (
    <>
      {/* Filters and Search */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tümü ({counts.all})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'active'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Aktif ({counts.active})
          </button>
          <button
            onClick={() => setFilter('suspended')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'suspended'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Askıda ({counts.suspended})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Beklemede ({counts.pending})
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mağaza adı, slug veya email ile ara..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Sellers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mağaza
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Satıcı
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İstatistikler
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bakiye
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Durum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSellers.map((seller) => {
              const sellerStats = stats[seller.id]
              const balance = seller.balance

              return (
                <tr key={seller.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {seller.store_name}
                      </div>
                      <div className="text-sm text-gray-500">/{seller.store_slug}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(seller.created_at)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {seller.owner?.first_name || ''} {seller.owner?.last_name || ''}
                    </div>
                    <div className="text-sm text-gray-500">{seller.owner?.email || 'Email yok'}</div>
                    {seller.owner?.phone && (
                      <div className="text-xs text-gray-400">{seller.owner.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {sellerStats ? (
                      <div className="text-sm">
                        <div className="text-gray-900">
                          {sellerStats.productCount} ürün
                        </div>
                        <div className="text-gray-500">
                          {sellerStats.orderCount} sipariş
                        </div>
                        <div className="text-gray-500">
                          {formatCurrency(sellerStats.totalRevenue)} ciro
                        </div>
                        {sellerStats.reviewCount > 0 && (
                          <div className="text-yellow-600">
                            ⭐ {sellerStats.averageRating.toFixed(1)} (
                            {sellerStats.reviewCount})
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Yükleniyor...</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {balance ? (
                      <div className="text-sm">
                        <div className="text-green-600 font-medium">
                          {formatCurrency(balance.available_balance)}
                        </div>
                        <div className="text-yellow-600">
                          {formatCurrency(balance.pending_balance)} beklemede
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          Toplam çekilen: {formatCurrency(balance.total_withdrawn)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Bakiye yok</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(seller.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <Link
                        href={`/magazalar/${seller.store_slug}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Görüntüle
                      </Link>
                      {seller.status !== 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedStore(seller)
                            setShowSuspendModal(true)
                          }}
                          className={`${
                            seller.status === 'active'
                              ? 'text-red-600 hover:text-red-800'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {seller.status === 'active' ? 'Askıya Al' : 'Aktif Et'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredSellers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Gösterilecek satıcı bulunamadı
          </div>
        )}
      </div>

      {/* Suspend/Activate Modal */}
      {showSuspendModal && selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {selectedStore.status === 'active'
                ? 'Satıcıyı Askıya Al'
                : 'Satıcıyı Aktif Et'}
            </h3>
            <p className="text-gray-600 mb-6">
              <strong>{selectedStore.store_name}</strong> mağazasını{' '}
              {selectedStore.status === 'active'
                ? 'askıya almak'
                : 'yeniden aktif etmek'}{' '}
              istediğinizden emin misiniz?
              <br />
              <br />
              {selectedStore.status === 'active' ? (
                <>
                  ⚠️ Askıya alınan satıcının mağazası ve ürünleri müşterilere
                  görünmeyecektir.
                </>
              ) : (
                <>Mağaza yeniden müşterilere açılacaktır.</>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuspendModal(false)
                  setSelectedStore(null)
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleSuspend}
                disabled={loading}
                className={`flex-1 px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                  selectedStore.status === 'active'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {loading
                  ? 'İşleniyor...'
                  : selectedStore.status === 'active'
                    ? 'Askıya Al'
                    : 'Aktif Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
