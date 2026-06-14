'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Button,
  Card,
  CardContent,
  Badge,
  PageHeader,
  EmptyState,
  Input,
} from '@novagross/ui'
import { formatPrice } from '@novagross/utils'
import { Eye, ShoppingCart, Search, Filter, Download } from 'lucide-react'
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

const TAB_DEFS: Array<{ key: string; label: string; color: string }> = [
  { key: 'all', label: 'Tümü', color: 'border-orange-500' },
  { key: 'pending', label: 'Bekleyen', color: 'border-yellow-500' },
  { key: 'processing', label: 'Hazırlanıyor', color: 'border-blue-500' },
  { key: 'shipped', label: 'Kargoda', color: 'border-purple-500' },
  { key: 'delivered', label: 'Teslim Edildi', color: 'border-green-500' },
  { key: 'cancelled', label: 'İptal', color: 'border-red-500' },
]

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
  const [search, setSearch] = useState('')

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, status, payment_status, total, created_at, email')
        // Yalnızca ödemesi tamamlanmış gerçek siparişler listelenir
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(500)
      if (cancelled) return
      const rows = (data ?? []).map((r: any) => ({
        ...r,
        user: r.email ? { email: r.email } : null,
      }))
      setOrders(rows as Order[])
      setLoading(false)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)))
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [orders])

  const filtered = useMemo(() => {
    let rows = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (o) =>
          o.order_number?.toLowerCase().includes(q) ||
          o.user?.email?.toLowerCase().includes(q) ||
          String(o.total).includes(q)
      )
    }
    return rows
  }, [orders, statusFilter, search])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sipariş yönetimi"
        description={loading ? 'Yükleniyor…' : `${counts.all ?? 0} sipariş`}
        actions={
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            CSV İndir
          </Button>
        }
      />

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Sipariş numarası, e-posta veya tutar ile ara…"
            className="pl-9 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filtrele
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border">
        <div className="flex items-center gap-0 overflow-x-auto border-b">
          {TAB_DEFS.map((t) => {
            const active = statusFilter === t.key
            const n = counts[t.key] ?? 0
            return (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? `${t.color} text-gray-900`
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.label}
                <span
                  className={`ml-2 inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1.5 rounded-full text-xs font-semibold ${
                    active ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {n}
                </span>
              </button>
            )
          })}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            compact
            icon={ShoppingCart}
            title={
              statusFilter === 'all' && !search
                ? 'Henüz sipariş yok'
                : search
                ? 'Aramaya uygun sipariş yok'
                : `${statusLabels[statusFilter]} sipariş yok`
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-600">
                  <th className="text-left py-3 px-5 font-medium">Sipariş No</th>
                  <th className="text-left py-3 px-5 font-medium">Müşteri</th>
                  <th className="text-right py-3 px-5 font-medium">Tutar</th>
                  <th className="text-left py-3 px-5 font-medium">Ödeme</th>
                  <th className="text-left py-3 px-5 font-medium">Durum</th>
                  <th className="text-left py-3 px-5 font-medium">Tarih</th>
                  <th className="text-right py-3 px-5 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-orange-50/30">
                    <td className="py-3 px-5">
                      <Link
                        href={`/siparisler/${order.id}`}
                        className="font-mono font-semibold text-orange-600 hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="py-3 px-5 text-gray-700">{order.user?.email || 'Misafir'}</td>
                    <td className="py-3 px-5 text-right font-semibold">{formatPrice(order.total)}</td>
                    <td className="py-3 px-5">
                      {order.payment_status === 'paid' ? (
                        <Badge variant="success">Ödendi</Badge>
                      ) : (
                        <Badge variant="secondary">Bekliyor</Badge>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer ${
                          statusColors[order.status] ?? 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-5 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(order.created_at).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <Link href={`/siparisler/${order.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Detay
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
