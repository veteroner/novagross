import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader } from '@novagross/ui'
import { formatPrice } from '@novagross/utils'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { IyzicoApprovalCard } from '@/components/admin/IyzicoApprovalCard'

type OrderItemRow = {
  id: string
  store_id: string | null
  quantity: number | null
  price: number | null
  commission_amount: number | null
  seller_amount: number | null
  created_at: string | null
  iyzico_payment_transaction_id: string | null
  iyzico_approval_status: 'pending' | 'approved' | 'disapproved' | null
  iyzico_approved_at: string | null
  product?: { id: string; name: string; slug: string | null } | null
  store?: { id: string; store_name: string | null; store_slug: string | null } | null
}

const statusLabels: Record<string, string> = {
  pending: 'Bekliyor',
  processing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
}

const statusBadges: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await requireAdmin(`/siparisler/${id}`)

  const [{ data: order, error: orderError }, { data: items, error: itemsError }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, status, payment_status, total, created_at, user_id, shipping_address')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('order_items')
      .select(
        `
          id,
          store_id,
          quantity,
          price,
          commission_amount,
          seller_amount,
          created_at,
          iyzico_payment_transaction_id,
          iyzico_approval_status,
          iyzico_approved_at,
          product:product_id ( id, name, slug ),
          store:store_id ( id, store_name, store_slug )
        `
      )
      .eq('order_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (orderError) {
    console.error('[AdminOrderDetail] order query failed:', orderError)
  }
  if (itemsError) {
    console.error('[AdminOrderDetail] items query failed:', itemsError)
  }

  if (!order) return notFound()

  const shipping = (order.shipping_address ?? {}) as any

  const rows = (items ?? []) as unknown as OrderItemRow[]

  const itemsByStore = rows.reduce((acc, row) => {
    const key = row.store_id ?? 'no-store'
    if (!acc[key]) acc[key] = []
    acc[key].push(row)
    return acc
  }, {} as Record<string, OrderItemRow[]>)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sipariş Detayı"
        description={
          order.order_number ? `Sipariş No: ${order.order_number}` : `ID: ${order.id}`
        }
        actions={
          <Link href="/siparisler">
            <Button variant="outline">Siparişlere Dön</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sipariş Özeti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Durum</span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  statusBadges[order.status as string] ?? 'bg-gray-100 text-gray-800'
                }`}
              >
                {statusLabels[order.status as string] ?? order.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ödeme Durumu</span>
              <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                {order.payment_status === 'paid' ? 'Ödendi' : (order.payment_status ?? 'Bekliyor')}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Toplam</span>
              <span className="font-semibold">{formatPrice(order.total ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tarih</span>
              <span className="text-sm">
                {order.created_at ? new Date(order.created_at).toLocaleString('tr-TR') : '-'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teslimat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <div className="text-muted-foreground">Alıcı</div>
              <div className="font-medium">
                {[shipping?.firstName ?? shipping?.first_name, shipping?.lastName ?? shipping?.last_name]
                  .filter(Boolean)
                  .join(' ') || '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Telefon</div>
              <div className="font-medium">{shipping?.phone ?? '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Adres</div>
              <div className="font-medium">
                {[shipping?.address, shipping?.district, shipping?.city]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* iyzico Pazaryeri Onay Kartı */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>iyzico Pazaryeri Onayı</span>
            <span className="text-xs font-normal text-muted-foreground">
              Hakediş transferi için her kalemi onaylayın
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <IyzicoApprovalCard
            paymentStatus={order.payment_status as string}
            items={rows.map((row) => ({
              id: row.id,
              product_name: row.product?.name ?? 'Ürün',
              iyzico_payment_transaction_id: row.iyzico_payment_transaction_id,
              iyzico_approval_status: row.iyzico_approval_status,
              iyzico_approved_at: row.iyzico_approved_at,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ürün Kalemleri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(itemsByStore).length === 0 ? (
            <div className="text-muted-foreground">Sipariş kalemi bulunamadı.</div>
          ) : (
            Object.entries(itemsByStore).map(([storeId, storeItems]) => {
              const store = storeItems[0]?.store
              const groupTitle =
                storeId === 'no-store'
                  ? 'Mağaza bilgisi olmayan kalemler'
                  : store?.store_name || store?.store_slug || storeId

              const groupSubtotal = storeItems.reduce(
                (sum, it) => sum + (it.price ?? 0) * (it.quantity ?? 0),
                0
              )
              const groupCommission = storeItems.reduce((sum, it) => sum + (it.commission_amount ?? 0), 0)
              const groupSellerNet = storeItems.reduce((sum, it) => sum + (it.seller_amount ?? 0), 0)

              return (
                <div key={storeId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{groupTitle}</div>
                    <div className="text-sm text-muted-foreground">
                      Brüt: {formatPrice(groupSubtotal)} · Komisyon: {formatPrice(groupCommission)} · Satıcı Net:{' '}
                      {formatPrice(groupSellerNet)}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 text-sm font-medium">Ürün</th>
                          <th className="text-right py-2 px-3 text-sm font-medium">Adet</th>
                          <th className="text-right py-2 px-3 text-sm font-medium">Birim</th>
                          <th className="text-right py-2 px-3 text-sm font-medium">Brüt</th>
                          <th className="text-right py-2 px-3 text-sm font-medium">Komisyon</th>
                          <th className="text-right py-2 px-3 text-sm font-medium">Satıcı Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storeItems.map((it) => {
                          const qty = it.quantity ?? 0
                          const price = it.price ?? 0
                          const gross = price * qty
                          return (
                            <tr key={it.id} className="border-b">
                              <td className="py-2 px-3">
                                <div className="font-medium">{it.product?.name ?? 'Ürün'}</div>
                                <div className="text-xs text-muted-foreground">{it.product?.slug ?? it.product?.id ?? ''}</div>
                              </td>
                              <td className="py-2 px-3 text-right">{qty}</td>
                              <td className="py-2 px-3 text-right">{formatPrice(price)}</td>
                              <td className="py-2 px-3 text-right font-medium">{formatPrice(gross)}</td>
                              <td className="py-2 px-3 text-right">{formatPrice(it.commission_amount ?? 0)}</td>
                              <td className="py-2 px-3 text-right font-semibold">{formatPrice(it.seller_amount ?? 0)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
