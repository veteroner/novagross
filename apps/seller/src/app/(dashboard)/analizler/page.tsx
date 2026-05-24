'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@novagross/ui'
import { TrendingUp, DollarSign, ShoppingCart, Package, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface OrderItem {
  id: string
  quantity: number
  price: number
  created_at: string | null
  product: { id: string; name: string; store_id: string }
  order: { id: string; status: string; created_at: string | null }
}

export default function SellerAnalytics() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    totalOrders: 0,
    monthlyOrders: 0,
    averageOrderValue: 0,
    topProducts: [] as any[],
    revenueByMonth: [] as any[],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!store) return

      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          id, quantity, price, created_at,
          product:products!inner(id, name, store_id),
          order:orders!inner(id, status, created_at)
        `)
        .eq('product.store_id', store.id)

      if (!orderItems || orderItems.length === 0) {
        setLoading(false)
        return
      }

      const items = orderItems as unknown as OrderItem[]

      const totalRevenue = items.reduce((sum: number, item: OrderItem) => sum + item.price * item.quantity, 0)

      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)

      const monthlyItems = items.filter(
        (item: OrderItem) => item.order.created_at && new Date(item.order.created_at) >= thisMonth
      )
      const monthlyRevenue = monthlyItems.reduce((sum: number, item: OrderItem) => sum + item.price * item.quantity, 0)

      const thisWeek = new Date()
      thisWeek.setDate(thisWeek.getDate() - 7)
      thisWeek.setHours(0, 0, 0, 0)

      const weeklyItems = items.filter(
        (item: OrderItem) => item.order.created_at && new Date(item.order.created_at) >= thisWeek
      )
      const weeklyRevenue = weeklyItems.reduce((sum: number, item: OrderItem) => sum + item.price * item.quantity, 0)

      const totalOrders = new Set(items.map((item: OrderItem) => item.order.id)).size
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      const productSales = new Map<string, { name: string; revenue: number; quantity: number }>()
      items.forEach((item: OrderItem) => {
        const existing = productSales.get(item.product.id) || { name: item.product.name, revenue: 0, quantity: 0 }
        existing.revenue += item.price * item.quantity
        existing.quantity += item.quantity
        productSales.set(item.product.id, existing)
      })

      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      const revenueByMonth: any[] = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        date.setDate(1)
        date.setHours(0, 0, 0, 0)

        const nextMonth = new Date(date)
        nextMonth.setMonth(nextMonth.getMonth() + 1)

        const monthItems = items.filter((item: OrderItem) => {
          if (!item.order.created_at) return false
          const itemDate = new Date(item.order.created_at)
          return itemDate >= date && itemDate < nextMonth
        })

        const monthRevenue = monthItems.reduce((sum: number, item: OrderItem) => sum + item.price * item.quantity, 0)

        revenueByMonth.push({
          month: date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' }),
          revenue: monthRevenue,
          orders: new Set(monthItems.map((item: OrderItem) => item.order.id)).size,
        })
      }

      setStats({ totalRevenue, monthlyRevenue, weeklyRevenue, totalOrders, monthlyOrders: monthlyItems.length, averageOrderValue, topProducts, revenueByMonth })
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

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
        <h1 className="text-3xl font-bold mb-2">Satış Analizleri</h1>
        <p className="text-gray-600">Satış performansınızı takip edin</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Bu Hafta</p>
                <p className="text-2xl font-bold">₺{stats.weeklyRevenue.toLocaleString('tr-TR')}</p>
                <p className="text-sm text-green-600 mt-1">Son 7 gün</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Bu Ay</p>
                <p className="text-2xl font-bold">₺{stats.monthlyRevenue.toLocaleString('tr-TR')}</p>
                <p className="text-sm text-blue-600 mt-1">{stats.monthlyOrders} sipariş</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Toplam Kazanç</p>
                <p className="text-2xl font-bold">₺{stats.totalRevenue.toLocaleString('tr-TR')}</p>
                <p className="text-sm text-purple-600 mt-1">{stats.totalOrders} sipariş</p>
              </div>
              <DollarSign className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ortalama Sepet</p>
                <p className="text-2xl font-bold">₺{stats.averageOrderValue.toFixed(2)}</p>
                <p className="text-sm text-orange-600 mt-1">Sipariş başına</p>
              </div>
              <ShoppingCart className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue by Month */}
        <Card>
          <CardHeader>
            <CardTitle>Aylık Gelir Trendi</CardTitle>
            <CardDescription>Son 6 ayın gelir grafiği</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.revenueByMonth.map((month, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{month.month}</span>
                    <span className="text-gray-600">{month.orders} sipariş</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                        style={{
                          width: `${Math.max(
                            (month.revenue / Math.max(...stats.revenueByMonth.map((m: any) => m.revenue), 1)) * 100,
                            5
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-24 text-right">
                      ₺{month.revenue.toLocaleString('tr-TR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>En Çok Satan Ürünler</CardTitle>
            <CardDescription>Gelire göre ilk 5 ürün</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Henüz satış verisi yok</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-600">{product.quantity} adet satıldı</p>
                    </div>
                    <p className="font-bold">₺{product.revenue.toLocaleString('tr-TR')}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
