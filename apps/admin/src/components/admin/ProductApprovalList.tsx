'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { approveProduct, rejectProduct } from '@novagross/database'

type ProductImage = {
  id: string
  image_url: string
  display_order: number
}

type Category = {
  id: string
  name: string
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
  owner: StoreOwner
}

type Product = {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  sku: string | null
  created_at: string
  category: Category | null
  store: Store | null
  product_images: ProductImage[]
}

interface ProductApprovalListProps {
  initialProducts: Product[]
  adminId: string
}

export function ProductApprovalList({ initialProducts, adminId }: ProductApprovalListProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const handleApprove = async () => {
    if (!selectedProduct) return

    setLoading(true)
    try {
      await approveProduct(selectedProduct.id, adminId)

      // Remove from list
      setProducts(products.filter((p) => p.id !== selectedProduct.id))
      setShowApproveModal(false)
      setSelectedProduct(null)

      alert('Ürün başarıyla onaylandı!')
    } catch (error) {
      console.error('Error approving product:', error)
      alert('Ürün onaylanırken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedProduct || !rejectionReason.trim()) {
      alert('Lütfen red nedeni giriniz')
      return
    }

    setLoading(true)
    try {
      await rejectProduct(selectedProduct.id, adminId, rejectionReason)

      // Remove from list
      setProducts(products.filter((p) => p.id !== selectedProduct.id))
      setShowRejectModal(false)
      setSelectedProduct(null)
      setRejectionReason('')

      alert('Ürün reddedildi!')
    } catch (error) {
      console.error('Error rejecting product:', error)
      alert('Ürün reddedilirken bir hata oluştu')
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
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const firstImage = product.product_images.sort(
            (a, b) => a.display_order - b.display_order
          )[0]

          return (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Product Image */}
              <div className="relative w-full h-48 bg-gray-100">
                {firstImage ? (
                  <Image
                    src={firstImage.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Görsel Yok
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{product.category?.name ?? 'Kategori yok'}</p>
                </div>

                {product.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {product.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div>
                    <span className="text-gray-500">Fiyat:</span>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Stok:</span>
                    <p className="font-semibold text-gray-900">{product.stock}</p>
                  </div>
                </div>

                {product.sku && (
                  <div className="mb-3 text-sm">
                    <span className="text-gray-500">SKU:</span>
                    <p className="text-gray-700">{product.sku}</p>
                  </div>
                )}

                {/* Store Info */}
                <div className="border-t pt-3 mb-3">
                  <p className="text-xs text-gray-500 mb-1">Satıcı Mağazası</p>
                  {product.store ? (
                    <>
                      <Link
                        href={`/magazalar/${product.store.store_slug}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {product.store.store_name}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">
                        {product.store?.owner?.first_name || ''} {product.store?.owner?.last_name || ''}
                        <br />
                        {product.store?.owner?.email || 'Email yok'}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Mağaza yok</p>
                  )}
                </div>

                <div className="text-xs text-gray-400 mb-4">
                  Eklenme: {formatDate(product.created_at)}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedProduct(product)
                      setShowApproveModal(true)
                    }}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Onayla
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProduct(product)
                      setShowRejectModal(true)
                    }}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Ürünü Onayla</h3>
            <p className="text-gray-600 mb-6">
              <strong>{selectedProduct.name}</strong> ürününü onaylamak istediğinizden emin
              misiniz?
              <br />
              <br />
              Onaylandığında ürün müşterilere görünür hale gelecektir.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false)
                  setSelectedProduct(null)
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Onaylanıyor...' : 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Ürünü Reddet</h3>
            <p className="text-gray-600 mb-4">
              <strong>{selectedProduct.name}</strong> ürününü reddetmek istediğinizden emin
              misiniz?
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Red Nedeni <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Satıcıya gösterilecek red nedenini giriniz..."
                disabled={loading}
              />
              <p className="mt-2 text-sm text-gray-500">
                ⚠️ Bu mesaj satıcıya iletilecektir.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setSelectedProduct(null)
                  setRejectionReason('')
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleReject}
                disabled={loading || !rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Reddediliyor...' : 'Reddet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
