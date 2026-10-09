import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { useAuth } from '@/providers/auth'

export type Address = {
  id: string
  title: string | null
  first_name: string
  last_name: string
  phone: string
  address_line1: string
  district: string | null
  city: string
  postal_code: string | null
  is_default: boolean
}

export function useAddresses() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['addresses', session?.user.id],
    enabled: !!session,
    queryFn: async (): Promise<Address[]> => {
      const { data, error } = await supabase
        .from('addresses')
        .select('id, title, first_name, last_name, phone, address_line1, district, city, postal_code, is_default')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Address[]
    },
  })
}

export type OrderSummary = {
  id: string
  order_number: string
  status: string
  payment_status: string
  total: number
  created_at: string
  items: { id: string; name: string; quantity: number; total: number }[]
}

export function useOrders() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['orders', session?.user.id],
    enabled: !!session,
    queryFn: async (): Promise<OrderSummary[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, payment_status, total, created_at, order_items(id, name, quantity, total)')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []).map((o: any) => ({ ...o, total: Number(o.total), items: o.order_items ?? [] }))
    },
  })
}

export function useOrderDetail(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const [{ data: order, error }, { data: shipments }, { data: invoices }] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, status, payment_status, subtotal, shipping_cost, discount_amount, total, created_at, delivered_at, shipping_address, refund_amount, refund_status, order_items(id, name, quantity, price, total, product_id)')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('order_shipments')
          .select('id, status, tracking_number, shipped_at, delivered_at, created_at, shipping_status_history(status, description, location, timestamp)')
          .eq('order_id', id),
        (supabase as any).from('order_invoices').select('id, invoice_number, uploaded_at').eq('order_id', id),
      ])
      if (error) throw error
      return { order: order as any, shipments: (shipments ?? []) as any[], invoices: (invoices ?? []) as any[] }
    },
  })
}

export type AppNotification = { id: string; type: string; title: string; body: string; data: Record<string, any>; read_at: string | null; created_at: string }

export function useNotifications() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['notifications', session?.user.id],
    enabled: !!session,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data } = await (supabase as any)
        .from('user_notifications')
        .select('id, type, title, body, data, read_at, created_at')
        .eq('app', 'store')
        .order('created_at', { ascending: false })
        .limit(100)
      return data ?? []
    },
  })
}
