'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@novagross/ui'
import { Button } from '@novagross/ui'
import {
  Store,
  Package,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SellerDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    pendingOrders: 0,
    totalOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [storeInfo, setStoreInfo] = useState<any>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Get store info
      // NOT select('*'): Round 12 column-level GRANT'leri iban/tax_number gibi
      // finansal kolonlara authenticated SELECT vermiyor — '*' istenirse
      // PostgREST 403 döner ve dashboard "Mağaza Bulunamadı" gösterirdi.
      const { data: store } = await supabase
        .from('stores')
        .select('id, store_name, store_slug, status, logo_url, description, email, phone, city, district, commission_rate, rating, total_reviews, total_sales, created_at')
        .eq('owner_id', user.id)
        .single()

      setStoreInfo(store)

      if (!store) return

      // Get products stats
      const { data: products } = await supabase
        .from('products')
        .select('id, is_active')
        .eq('store_id', store.id)

      const totalProducts = products?.length || 0
      const activeProducts = products?.filter((p: any) => p.is_active).length || 0

      // Get orders stats
      const { data: orders } = await supabase
        .from('order_items')
        .select(`
          id,
          quantity,
          price,
          order:orders!inner(
            id,
            status,
            created_at,
            user:profiles(first_name, last_name, email)
          ),
          product:products!inner(
            store_id,
            name
          )
        `)
        .eq('product.store_id', store.id)
        .order('created_at', { ascending: false })

      const totalOrders = orders?.length || 0
      const pendingOrders = orders?.filter((o: any) =>
        o.order.status === 'pending' || o.order.status === 'processing'
      ).length || 0

      // Calculate revenue
      const totalRevenue = orders?.reduce((sum: number, item: any) =>
        sum + (item.price * item.quantity), 0
      ) || 0

      const thisMonth = new Date()
      thisMonth.setDate(1)
      const monthlyRevenue = orders?.filter((o: any) =>
        new Date(o.order.created_at) >= thisMonth
      ).reduce((sum: number, item: any) =>
        sum + (item.price * item.quantity), 0
      ) || 0

      setStats({
        totalProducts,
        activeProducts,
        pendingOrders,
        totalOrders,
        totalRevenue,
        monthlyRevenue,
      })

      // Get recent orders (last 5)
      setRecentOrders(orders?.slice(0, 5) || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
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

  if (!storeInfo) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Mağaza Bulunamadı</h2>
              <p className="text-gray-600 mb-4">
                Henüz bir mağazanız yok. Satıcı başvurunuz onaylandıktan sonra mağazanız oluşturulacaktır.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Hoş Geldiniz!</h1>
        <p className="text-gray-600">{storeInfo.store_name} mağazanızın özet görünümü</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Toplam Ürün</p>
                <p className="text-3xl font-bold">{stats.totalProducts}</p>
                <p className="text-sm text-green-600 mt-1">
                  {stats.activeProducts} aktif
                </p>
              </div>
              <Package className="w-12 h-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Bekleyen Sipariş</p>
                <p className="text-3xl font-bold">{stats.pendingOrders}</p>
                <p className="text-sm text-gray-500 mt-1">
                  / {stats.totalOrders} toplam
                </p>
              </div>
              <ShoppingCart className="w-12 h-12 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Bu Ay Kazanç</p>
                <p className="text-3xl font-bold">₺{stats.monthlyRevenue.toLocaleString('tr-TR')}</p>
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Bu ay
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Toplam Kazanç</p>
                <p className="text-3xl font-bold">₺{stats.totalRevenue.toLocaleString('tr-TR')}</p>
                <p className="text-sm text-gray-500 mt-1">Tüm zamanlar</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Link href="/urunler/ekle">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Yeni Ürün Ekle</h3>
                  <p className="text-sm text-gray-600">Ürün kataloğuna ekle</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/siparisler">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Siparişleri Görüntüle</h3>
                  <p className="text-sm text-gray-600">{stats.pendingOrders} bekliyor</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analizler">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Satış Raporları</h3>
                  <p className="text-sm text-gray-600">Analizleri gör</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Son Siparişler</CardTitle>
          <CardDescription>En son alınan siparişler</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Henüz sipariş yok</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      order.order.status === 'delivered' ? 'bg-green-100' :
                      order.order.status === 'processing' ? 'bg-blue-100' :
                      'bg-yellow-100'
                    }`}>
                      {order.order.status === 'delivered' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : order.order.status === 'processing' ? (
                        <Package className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{order.product.name}</p>
                      <p className="text-sm text-gray-600">
                        {order.order.user?.full_name || order.order.user?.email || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₺{(order.price * order.quantity).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(order.order.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
