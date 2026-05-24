'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateStoreCommission } from '@novagross/database'

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
}

type Store = {
  id: string
  store_name: string
  store_slug: string
  commission_rate: number | null
  created_at: string | null
  owner: StoreOwner | null
  balance: StoreBalance | null
}

interface CommissionSettingsProps {
  initialSellers: Store[]
}

export function CommissionSettings({ initialSellers }: CommissionSettingsProps) {
  const [sellers, setSellers] = useState<Store[]>(initialSellers)
  const [search, setSearch] = useState('')
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [newRate, setNewRate] = useState<number>(15)
  const [loading, setLoading] = useState(false)

  const handleUpdateCommission = async () => {
    if (!editingStore) return

    if (newRate < 0 || newRate > 100) {
      alert('Komisyon oranı 0 ile 100 arasında olmalıdır')
      return
    }

    setLoading(true)
    try {
      await updateStoreCommission(editingStore.id, newRate)

      // Update local state
      setSellers(
        sellers.map((s) =>
          s.id === editingStore.id ? { ...s, commission_rate: newRate } : s
        )
      )

      setEditingStore(null)
      alert(`Komisyon oranı %${newRate} olarak güncellendi!`)
    } catch (error) {
      console.error('Error updating commission:', error)
      alert('Komisyon güncellenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const filteredSellers = search
    ? sellers.filter(
        (s) =>
          s.store_name.toLowerCase().includes(search.toLowerCase()) ||
          s.store_slug.toLowerCase().includes(search.toLowerCase()) ||
          s.owner?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : sellers

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Tarih yok'
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const averageCommission =
    sellers.reduce((sum, s) => sum + (s.commission_rate || 0), 0) / sellers.length || 0

  return (
    <>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Toplam Satıcı</div>
          <div className="text-3xl font-bold text-gray-900">{sellers.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Ortalama Komisyon</div>
          <div className="text-3xl font-bold text-blue-600">
            %{averageCommission.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">Özel Oran Sayısı</div>
          <div className="text-3xl font-bold text-purple-600">
            {sellers.filter((s) => s.commission_rate !== 15).length}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
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
                Mevcut Komisyon
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kayıt Tarihi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSellers.map((seller) => {
              const isCustomRate = seller.commission_rate !== 15

              return (
                <tr key={seller.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {seller.store_name}
                      </div>
                      <Link
                        href={`/magazalar/${seller.store_slug}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        /{seller.store_slug}
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {seller.owner?.first_name || ''} {seller.owner?.last_name || ''}
                    </div>
                    <div className="text-sm text-gray-500">{seller.owner?.email || 'Email yok'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-lg font-bold ${
                          isCustomRate ? 'text-purple-600' : 'text-gray-900'
                        }`}
                      >
                        %{seller.commission_rate || 0}
                      </span>
                      {isCustomRate && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          Özel Oran
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(seller.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        setEditingStore(seller)
                        setNewRate(seller.commission_rate || 15)
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Düzenle
                    </button>
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

      {/* Edit Commission Modal */}
      {editingStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Komisyon Oranını Düzenle
            </h3>

            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-4">
                <strong>{editingStore.store_name}</strong> için komisyon oranını
                değiştirin.
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Komisyon Oranı (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={newRate}
                  onChange={(e) => setNewRate(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                  disabled={loading}
                />
                <span className="text-2xl font-bold text-gray-700">%</span>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <div className="text-xs text-gray-600 mb-2">Önizleme (1000 TL satış):</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Platform Komisyonu:</div>
                    <div className="font-semibold text-red-600">
                      {(1000 * (newRate / 100)).toFixed(2)} TL
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Satıcı Kazancı:</div>
                    <div className="font-semibold text-green-600">
                      {(1000 * (1 - newRate / 100)).toFixed(2)} TL
                    </div>
                  </div>
                </div>
              </div>

              {newRate !== 15 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800">
                    ⚠️ Bu satıcı için özel bir komisyon oranı belirliyorsunuz. Varsayılan
                    oran %15'tir.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingStore(null)
                  setNewRate(15)
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleUpdateCommission}
                disabled={loading || newRate < 0 || newRate > 100}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
