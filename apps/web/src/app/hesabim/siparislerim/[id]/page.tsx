import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@novagross/ui'
import { formatPrice, formatDate } from '@novagross/utils'
import { ArrowLeft, Truck, Package, CheckCircle, MapPin, RotateCcw } from 'lucide-react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CopyTrackingButton } from '@/components/order/copy-tracking-button'

const statusSteps = [
  { status: 'confirmed', label: 'Onaylandı', icon: CheckCircle },
  { status: 'processing', label: 'Hazırlanıyor', icon: Package },
  { status: 'shipped', label: 'Kargoda', icon: Truck },
  { status: 'delivered', label: 'Teslim Edildi', icon: MapPin },
]

type AddressLike = {
  first_name?: string
  last_name?: string
  phone?: string
  full_address?: string
  address_line1?: string
  address?: string
  district?: string
  city?: string
  postal_code?: string
}

function asAddressLike(value: unknown): AddressLike {
  if (!value || typeof value !== 'object') return {}
  return value as AddressLike
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user

  if (!user) {
    redirect('/giris')
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      shipment:order_shipments(
        tracking_number,
        tracking_url,
        carrier:shipping_carriers(
          name
        )
      )
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !order) {
    notFound()
  }

  const { data: items } = await supabase
    .from('order_items')
    .select(`
      id,
      name,
      quantity,
      price,
      total,
      product_id,
      products:product_id (
        id,
        slug,
        product_images (
          url
        )
      )
    `)
    .eq('order_id', order.id)
    .order('created_at')

  // Mevcut iade talepleri (her item için)
  const { data: existingReturns } = await (supabase as any)
    .from('return_requests')
    .select('id, order_item_id, status')
    .eq('order_id', order.id)
    .eq('user_id', user.id)

  const returnsByItemId = new Map<string, { id: string; status: string }>()
  for (const r of (existingReturns as any[] | null) || []) {
    returnsByItemId.set(r.order_item_id, { id: r.id, status: r.status })
  }

  const shippingAddress = asAddressLike(order.shipping_address)
  const currentStatusIndex = statusSteps.findIndex((s) => s.status === order.status)

  // İade hakkı kontrolü
  const isDelivered = order.status === 'delivered' && !!order.delivered_at
  const returnDeadline = order.return_deadline ? new Date(order.return_deadline) : null
  const isWithinReturnPeriod = returnDeadline && returnDeadline > new Date()
  const canReturn = isDelivered && isWithinReturnPeriod
  const daysLeft = returnDeadline
    ? Math.max(0, Math.ceil((returnDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/hesabim/siparislerim">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-bold">Sipariş #{order.order_number}</h2>
          <p className="text-sm text-muted-foreground">
            {order.created_at ? formatDate(order.created_at) : 'Tarih belirtilmemiş'}
          </p>
        </div>
      </div>

      {/* Order Status */}
      <Card>
        <CardHeader>
          <CardTitle>Sipariş Durumu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => (
              <div key={step.status} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    index <= currentStatusIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <step.icon className="h-5 w-5" />
                </div>
                <span className={`text-sm mt-2 ${index <= currentStatusIndex ? 'font-medium' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
                {index < statusSteps.length - 1 && (
                  <div
                    className={`hidden md:block absolute h-1 w-full top-5 left-1/2 ${
                      index < currentStatusIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                    style={{ width: 'calc(100% - 40px)' }}
                  />
                )}
              </div>
            ))}
          </div>

          {order.shipment && Array.isArray(order.shipment) && order.shipment[0]?.tracking_number && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Kargo Takip Numarası</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="font-mono font-medium flex-1">{order.shipment[0].tracking_number}</p>
                <CopyTrackingButton trackingNumber={order.shipment[0].tracking_number} />
              </div>
              {order.shipment[0].tracking_url ? (
                <Button variant="link" className="p-0 h-auto mt-1" asChild>
                  <a href={order.shipment[0].tracking_url} target="_blank" rel="noopener noreferrer">
                    Kargo Takip →
                  </a>
                </Button>
              ) : (
                <Button variant="link" className="p-0 h-auto mt-1">
                  Kargo Takip →
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Sipariş Ürünleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(items ?? []).map((item: any) => {
              const product = item.products && !Array.isArray(item.products) ? item.products : null
              const images = product?.product_images
              const imageUrl = images && Array.isArray(images) && images[0]?.url

              const ret = returnsByItemId.get(item.id)
              return (
                <div key={item.id} className="flex flex-wrap gap-4 items-start">
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center shrink-0 overflow-hidden">
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">📱</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">Adet: {item.quantity}</p>
                    {ret ? (
                      <Link
                        href={`/hesabim/iadelerim`}
                        className="inline-block mt-2 text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80"
                      >
                        {ret.status === 'pending' && '⏳ İade talebi incelemede'}
                        {ret.status === 'approved' && '✅ İade onaylandı'}
                        {ret.status === 'refunded' && '💸 İade tamamlandı'}
                        {ret.status === 'rejected' && '❌ İade reddedildi'}
                        {ret.status === 'cancelled' && '🚫 İade iptal edildi'}
                        {' '}— Detay
                      </Link>
                    ) : canReturn ? (
                      <Button asChild variant="outline" size="sm" className="mt-2">
                        <Link href={`/hesabim/siparislerim/${order.id}/iade-talep-et/${item.id}`}>
                          <RotateCcw className="w-3 h-3 mr-1" />
                          İade Talep Et
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                  <p className="font-medium">{formatPrice(item.total)}</p>
                </div>
              )
            })}
          </div>

          {/* Return period banner */}
          {canReturn ? (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="text-blue-900">
                ℹ️ Yasal iade hakkınızın bitmesine{' '}
                <strong>{daysLeft} gün</strong> kaldı (son tarih:{' '}
                {returnDeadline ? formatDate(returnDeadline.toISOString()) : '—'}).
              </p>
            </div>
          ) : isDelivered && returnDeadline && returnDeadline <= new Date() ? (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
              ⏰ 14 günlük yasal iade süresi dolmuştur.
            </div>
          ) : null}

          <div className="border-t mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ara Toplam</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Kargo</span>
              {order.shipping_cost === 0 || order.shipping_cost === null ? (
                <span className="text-green-600">Ücretsiz</span>
              ) : (
                <span>{formatPrice(order.shipping_cost)}</span>
              )}
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Toplam</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <CardTitle>Teslimat Adresi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">
            {(shippingAddress.first_name || '').trim()} {(shippingAddress.last_name || '').trim()}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {shippingAddress.phone || '—'}
          </p>
          <p className="text-sm mt-2">
            {shippingAddress.full_address || shippingAddress.address_line1 || shippingAddress.address || '—'}
          </p>
          <p className="text-sm">
            {shippingAddress.district || '—'}, {shippingAddress.city || '—'} {shippingAddress.postal_code || ''}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
