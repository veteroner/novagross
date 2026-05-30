import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReturnRequestForm } from './ReturnRequestForm'

export const dynamic = 'force-dynamic'

export default async function ReturnRequestPage({
  params,
}: {
  params: { id: string; itemId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/giris')
  }

  // Sipariş + item bilgisi
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, status, delivered_at, return_deadline, user_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!order) {
    notFound()
  }

  const { data: item } = await supabase
    .from('order_items')
    .select(`
      id,
      name,
      quantity,
      price,
      total,
      store_id,
      products:product_id (
        product_images (
          url
        )
      )
    `)
    .eq('id', params.itemId)
    .eq('order_id', params.id)
    .single()

  if (!item) {
    notFound()
  }

  // İade hakkı kontrolü
  const isDelivered = order.status === 'delivered' && !!order.delivered_at
  const returnDeadline = order.return_deadline ? new Date(order.return_deadline) : null
  const isWithinReturnPeriod = returnDeadline && returnDeadline > new Date()

  if (!isDelivered) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">İade Talebi</h1>
        <div className="p-4 rounded border border-yellow-300 bg-yellow-50">
          Bu sipariş henüz teslim edilmedi. İade talebi sadece teslim edilmiş siparişler için
          oluşturulabilir.
        </div>
      </div>
    )
  }

  if (!isWithinReturnPeriod) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">İade Talebi</h1>
        <div className="p-4 rounded border border-red-300 bg-red-50">
          14 günlük yasal iade süresi dolmuş.
        </div>
      </div>
    )
  }

  // Mevcut iade var mı?
  const { data: existingReturn } = await (supabase as any)
    .from('return_requests')
    .select('id, status')
    .eq('order_item_id', params.itemId)
    .in('status', ['pending', 'approved', 'refunded'])
    .maybeSingle()

  if (existingReturn) {
    redirect('/hesabim/iadelerim')
  }

  const imageUrl = ((item.products as any)?.product_images as any[] | undefined)?.[0]?.url

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">İade Talebi Oluştur</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sipariş #{order.order_number}
        </p>
      </div>

      <div className="border rounded-lg p-4 flex gap-4">
        <div className="w-16 h-16 bg-muted rounded overflow-hidden shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-medium">{item.name}</h3>
          <p className="text-sm text-muted-foreground">
            Adet: {item.quantity} · Birim Fiyat: ₺{Number(item.price).toFixed(2)}
          </p>
          <p className="text-sm font-semibold mt-1">Toplam: ₺{Number(item.total).toFixed(2)}</p>
        </div>
      </div>

      <ReturnRequestForm
        orderId={params.id}
        orderItemId={params.itemId}
        maxQuantity={item.quantity}
      />

      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
        <strong>Önemli:</strong> İade talebiniz incelendikten sonra onaylanırsa, ürünü kargoya
        verme talimatı e-posta ile iletilecektir. Ürün satıcıya ulaşıp incelendikten sonra para
        iadeniz orijinal ödeme yöntemine yapılır (3-7 iş günü).
      </div>
    </div>
  )
}
