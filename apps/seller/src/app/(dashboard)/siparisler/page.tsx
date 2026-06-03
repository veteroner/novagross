'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@novagross/ui'
import { Button } from '@novagross/ui'
import { ShoppingCart, Package, Truck, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { safeExternalUrl } from '@novagross/utils'

export default function SellerOrders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [carriers, setCarriers] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [methods, setMethods] = useState<Array<{ id: string; name: string; code: string; carrier_id: string }>>([])
  const [shipmentsByOrderId, setShipmentsByOrderId] = useState<Record<string, any>>({})
  const [shippingFormOpenForOrderId, setShippingFormOpenForOrderId] = useState<string | null>(null)
  const [shippingForm, setShippingForm] = useState({ carrierId: '', methodId: '', weight: 1, createLabel: true })
  const [shippingSubmittingForOrderId, setShippingSubmittingForOrderId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (!store) return

      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          id, quantity, price, name, total,
          order:orders!inner(id, order_number, status, created_at, total, email, phone, shipping_address)
        `)
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })

      setOrders(orderItems || [])

      const [{ data: carriersData }, { data: methodsData }] = await Promise.all([
        supabase.from('shipping_carriers').select('id,name,code').order('display_order', { ascending: true }),
        supabase.from('shipping_methods').select('id,name,code,carrier_id').eq('is_active', true),
      ])

      setCarriers((carriersData as any[]) || [])
      setMethods((methodsData as any[]) || [])

      const orderIds = Array.from(new Set((orderItems || []).map((oi: any) => oi.order?.id).filter(Boolean)))
      if (orderIds.length > 0) {
        const { data: shipments } = await supabase
          .from('order_shipments')
          .select('order_id,id,status,tracking_number,tracking_url,shipping_label_url,carrier_id,method_id')
          .in('order_id', orderIds)

        const next: Record<string, any> = {}
        for (const s of shipments || []) next[(s as any).order_id] = s
        setShipmentsByOrderId(next)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const supabase = createClient()
      await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
      fetchOrders()
    } catch (error) {
      console.error('Failed to update order status:', error)
    }
  }

  const createShipment = async (orderId: string) => {
    try {
      if (!shippingForm.carrierId || !shippingForm.methodId) {
        alert('Lütfen kargo firması ve yöntemi seçin')
        return
      }
      setShippingSubmittingForOrderId(orderId)

      const res = await fetch(`/api/orders/${orderId}/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrierId: shippingForm.carrierId,
          methodId: shippingForm.methodId,
          provider: 'mock',
          weight: shippingForm.weight,
          pieceCount: 1,
          createLabel: shippingForm.createLabel,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Kargo oluşturulamadı')

      setShipmentsByOrderId((prev) => ({ ...prev, [orderId]: data.shipment }))
      setShippingFormOpenForOrderId(null)
      await fetchOrders()
    } catch (e: any) {
      alert(e?.message || 'Kargo oluşturulamadı')
    } finally {
      setShippingSubmittingForOrderId(null)
    }
  }

  const markDelivered = async (orderId: string) => {
    try {
      setShippingSubmittingForOrderId(orderId)
      const res = await fetch(`/api/orders/${orderId}/shipment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered', location: 'Alıcı', description: 'Teslim edildi' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Güncellenemedi')

      setShipmentsByOrderId((prev) => ({ ...prev, [orderId]: data.shipment }))
      await fetchOrders()
    } catch (e: any) {
      alert(e?.message || 'Güncellenemedi')
    } finally {
      setShippingSubmittingForOrderId(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ShoppingCart className="w-5 h-5 text-yellow-600" />
      case 'processing': return <Package className="w-5 h-5 text-blue-600" />
      case 'shipped': return <Truck className="w-5 h-5 text-purple-600" />
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-600" />
      default: return <ShoppingCart className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      pending: 'Beklemede', processing: 'İşleniyor', shipped: 'Kargoda',
      delivered: 'Teslim Edildi', cancelled: 'İptal Edildi',
    }
    return map[status] || status
  }

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => o.order.status === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Siparişlerim</h1>
        <p className="text-gray-600">{orders.length} sipariş</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'Tümü' },
              { key: 'pending', label: 'Beklemede' },
              { key: 'processing', label: 'İşleniyor' },
              { key: 'shipped', label: 'Kargoda' },
              { key: 'delivered', label: 'Teslim Edildi' },
            ].map(f => (
              <Button
                key={f.key}
                variant={filter === f.key ? 'default' : 'outline'}
                onClick={() => setFilter(f.key)}
                size="sm"
              >
                {f.label} ({f.key === 'all' ? orders.length : orders.filter((o) => o.order.status === f.key).length})
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{filter === 'all' ? 'Henüz sipariş yok' : 'Bu durumda sipariş bulunamadı'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((orderItem) => (
            <Card key={orderItem.id}>
              <CardContent className="pt-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(orderItem.order.status)}
                    <div>
                      <p className="font-semibold">Sipariş #{orderItem.order.order_number || orderItem.order.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-600">{new Date(orderItem.order.created_at).toLocaleString('tr-TR')}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    orderItem.order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    orderItem.order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                    orderItem.order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    orderItem.order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getStatusText(orderItem.order.status)}
                  </span>
                </div>

                {/* Product Info */}
                <div className="flex items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{orderItem.name}</p>
                    <p className="text-sm text-gray-600">Adet: {orderItem.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₺{Number(orderItem.total || (orderItem.price * orderItem.quantity)).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Birim: ₺{orderItem.price.toFixed(2)}</p>
                  </div>
                </div>

                {/* Customer / Shipping Info */}
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2">Teslimat Bilgileri:</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{orderItem.order.email}</p>
                    <p>{orderItem.order.phone}</p>
                    {orderItem.order.shipping_address && (
                      <p>
                        {[
                          (orderItem.order.shipping_address as any)?.address_line1 || (orderItem.order.shipping_address as any)?.address,
                          (orderItem.order.shipping_address as any)?.district,
                          (orderItem.order.shipping_address as any)?.city,
                        ].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Shipping status */}
                {shipmentsByOrderId[orderItem.order.id] && (
                  <div className="mb-4 p-3 border rounded-lg bg-white">
                    <p className="text-sm font-semibold mb-1">Kargo:</p>
                    <div className="text-sm text-gray-700">
                      <div>Durum: {shipmentsByOrderId[orderItem.order.id].status}</div>
                      {shipmentsByOrderId[orderItem.order.id].tracking_number && (
                        <div>Takip No: <span className="font-mono">{shipmentsByOrderId[orderItem.order.id].tracking_number}</span></div>
                      )}
                      {(() => {
                        const tu = safeExternalUrl(shipmentsByOrderId[orderItem.order.id].tracking_url)
                        return tu ? (
                          <a className="text-blue-600 underline" href={tu} target="_blank" rel="noreferrer">Takip Linki</a>
                        ) : null
                      })()}
                      {(() => {
                        const lu = safeExternalUrl(shipmentsByOrderId[orderItem.order.id].shipping_label_url)
                        return lu ? (
                          <div><a className="text-blue-600 underline" href={lu} target="_blank" rel="noreferrer">Etiket (PDF)</a></div>
                        ) : null
                      })()}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {orderItem.order.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button onClick={() => updateOrderStatus(orderItem.order.id, 'processing')} className="flex-1">
                      Hazırlanıyor Olarak İşaretle
                    </Button>
                    <Button variant="outline" onClick={() => updateOrderStatus(orderItem.order.id, 'cancelled')} className="text-red-600">
                      İptal Et
                    </Button>
                  </div>
                )}

                {orderItem.order.status === 'processing' && (
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        setShippingFormOpenForOrderId((prev) => (prev === orderItem.order.id ? null : orderItem.order.id))
                        const defaultCarrier = carriers[0]?.id || ''
                        const defaultMethod = methods.find((m) => m.carrier_id === defaultCarrier)?.id || methods[0]?.id || ''
                        setShippingForm({ carrierId: defaultCarrier, methodId: defaultMethod, weight: 1, createLabel: true })
                      }}
                      className="w-full"
                      disabled={shippingSubmittingForOrderId === orderItem.order.id}
                    >
                      Kargo Oluştur
                    </Button>

                    {shippingFormOpenForOrderId === orderItem.order.id && (
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-700">Kargo Firması</label>
                            <select
                              className="w-full mt-1 px-2 py-2 border rounded"
                              value={shippingForm.carrierId}
                              onChange={(e) => {
                                const nextCarrierId = e.target.value
                                const nextMethodId = methods.find((m) => m.carrier_id === nextCarrierId)?.id || ''
                                setShippingForm((p) => ({ ...p, carrierId: nextCarrierId, methodId: nextMethodId }))
                              }}
                            >
                              <option value="">Seçiniz</option>
                              {carriers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700">Yöntem</label>
                            <select
                              className="w-full mt-1 px-2 py-2 border rounded"
                              value={shippingForm.methodId}
                              onChange={(e) => setShippingForm((p) => ({ ...p, methodId: e.target.value }))}
                            >
                              <option value="">Seçiniz</option>
                              {methods.filter((m) => !shippingForm.carrierId || m.carrier_id === shippingForm.carrierId).map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700">Ağırlık (kg)</label>
                            <input
                              type="number" min={0.1} step={0.1}
                              className="w-full mt-1 px-2 py-2 border rounded"
                              value={shippingForm.weight}
                              onChange={(e) => setShippingForm((p) => ({ ...p, weight: Number(e.target.value) }))}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <input
                            id={`createLabel-${orderItem.order.id}`}
                            type="checkbox"
                            checked={shippingForm.createLabel}
                            onChange={(e) => setShippingForm((p) => ({ ...p, createLabel: e.target.checked }))}
                          />
                          <label htmlFor={`createLabel-${orderItem.order.id}`} className="text-sm text-gray-700">
                            Takip numarası + etiket üret
                          </label>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={() => createShipment(orderItem.order.id)}
                            disabled={shippingSubmittingForOrderId === orderItem.order.id}
                            className="flex-1"
                          >
                            {shippingSubmittingForOrderId === orderItem.order.id ? 'Oluşturuluyor...' : 'Kargoya Ver'}
                          </Button>
                          <Button variant="outline" onClick={() => setShippingFormOpenForOrderId(null)} disabled={shippingSubmittingForOrderId === orderItem.order.id}>
                            Kapat
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {orderItem.order.status === 'shipped' && (
                  <Button
                    onClick={() => markDelivered(orderItem.order.id)}
                    className="w-full"
                    disabled={shippingSubmittingForOrderId === orderItem.order.id}
                  >
                    Teslim Edildi Olarak İşaretle
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
