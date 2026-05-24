'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@novagross/ui'
import { formatPrice } from '@novagross/utils'
import { Eye, Truck, CheckCircle, XCircle, Clock } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface Order {
  id: string
  order_number: string
  status: string
  payment_status: string
  total: number
  created_at: string
  user: { email: string } | null
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  pending: 'Bekliyor',
  processing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        total,
        created_at,
        user:profiles(email:id)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrders(data as any)
    }
    setLoading(false)
  }

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setOrders(orders.map(o => 
        o.id === id ? { ...o, status: newStatus } : o
      ))
    }
  }

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter)

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Siparişler</h1>

      {/* Status Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === 'all' ? 'Tümü' : statusLabels[status]}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Sipariş No</th>
                    <th className="text-left py-3 px-4 font-medium">Müşteri</th>
                    <th className="text-left py-3 px-4 font-medium">Tutar</th>
                    <th className="text-left py-3 px-4 font-medium">Ödeme</th>
                    <th className="text-left py-3 px-4 font-medium">Durum</th>
                    <th className="text-left py-3 px-4 font-medium">Tarih</th>
                    <th className="text-left py-3 px-4 font-medium">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono font-medium">{order.order_number}</td>
                      <td className="py-3 px-4">{(order.user as any)?.email || 'Misafir'}</td>
                      <td className="py-3 px-4 font-medium">{formatPrice(order.total)}</td>
                      <td className="py-3 px-4">
                        <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {order.payment_status === 'paid' ? 'Ödendi' : 'Bekliyor'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs font-medium ${statusColors[order.status]}`}
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/siparisler/${order.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredOrders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Sipariş bulunamadı
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
