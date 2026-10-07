import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from '@/providers/auth'

// Web satıcı panelindeki (apps/seller/src/app/(dashboard)/siparisler) sorgularla aynı
// tablolar; RLS satıcıyı kendi mağazasıyla sınırlar.

export type SellerOrder = {
  id: string
  order_number: string
  status: string
  created_at: string
  total: number // bu mağazanın kalemleri toplamı
  itemCount: number
  items: { id: string; name: string; quantity: number; price: number; total: number }[]
  shipping_address: any
  shipment: any | null
  invoice: any | null
}

export function useOrders() {
  const { store } = useAuth()
  return useQuery({
    queryKey: ['orders', store?.storeId],
    enabled: !!store,
    queryFn: async (): Promise<SellerOrder[]> => {
      const { data, error } = await supabase
        .from('order_items')
        .select(
          `id, quantity, price, name, total,
           order:orders!inner(id, order_number, status, payment_status, created_at, shipping_address)`
        )
        .eq('store_id', store!.storeId)
        .eq('order.payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(300)
      if (error) throw error

      const byOrder = new Map<string, SellerOrder>()
      for (const it of (data ?? []) as any[]) {
        const o = it.order
        const cur =
          byOrder.get(o.id) ??
          ({
            id: o.id,
            order_number: o.order_number,
            status: o.status,
            created_at: o.created_at,
            shipping_address: o.shipping_address,
            total: 0,
            itemCount: 0,
            items: [],
            shipment: null,
            invoice: null,
          } as SellerOrder)
        cur.items.push({ id: it.id, name: it.name, quantity: it.quantity, price: Number(it.price), total: Number(it.total) })
        cur.total += Number(it.total || 0)
        cur.itemCount += Number(it.quantity || 0)
        byOrder.set(o.id, cur)
      }

      const orders = Array.from(byOrder.values())
      const ids = orders.map((o) => o.id)
      if (ids.length > 0) {
        const [{ data: shipments }, { data: invoices }] = await Promise.all([
          supabase
            .from('order_shipments')
            .select('order_id, id, status, tracking_number, shipping_label_url, official_barcode, provider_code, mng_shipment_id, shipped_at, created_at')
            .in('order_id', ids),
          (supabase as any).from('order_invoices').select('id, order_id, invoice_number, uploaded_at').in('order_id', ids).eq('store_id', store!.storeId),
        ])
        const sMap = new Map((shipments ?? []).map((s: any) => [s.order_id, s]))
        const iMap = new Map((invoices ?? []).map((i: any) => [i.order_id, i]))
        for (const o of orders) {
          o.shipment = sMap.get(o.id) ?? null
          o.invoice = iMap.get(o.id) ?? null
        }
      }
      return orders
    },
  })
}

/** Kargolanması bekleyen = iptal/teslim değil ve kargo kaydı yok */
export const needsShipping = (o: SellerOrder) => !o.shipment && !['cancelled', 'delivered', 'refunded'].includes(o.status)
/** Fatura bekleyen = kargolanmış ama fatura yüklenmemiş */
export const needsInvoice = (o: SellerOrder) => !!o.shipment && !o.invoice && o.status !== 'cancelled'

export type AppNotification = {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, any>
  read_at: string | null
  created_at: string
}

export function useNotifications() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['notifications', session?.user.id],
    enabled: !!session,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await (supabase as any)
        .from('user_notifications')
        .select('id, type, title, body, data, read_at, created_at')
        .eq('app', 'seller')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data ?? []
    },
  })
}

export async function markNotificationsRead(ids: string[]) {
  if (ids.length === 0) return
  await (supabase as any).from('user_notifications').update({ read_at: new Date().toISOString() }).in('id', ids)
}
