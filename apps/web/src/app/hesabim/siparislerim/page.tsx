import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, Badge, Button } from '@novagross/ui'
import { formatPrice, formatDate } from '@novagross/utils'
import { createClient } from '@/lib/supabase/server'
import { Package, Eye, ChevronRight } from 'lucide-react'

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  pending: { label: 'Beklemede', variant: 'secondary' },
  confirmed: { label: 'Onaylandı', variant: 'default' },
  processing: { label: 'Hazırlanıyor', variant: 'warning' },
  shipped: { label: 'Kargoda', variant: 'default' },
  delivered: { label: 'Teslim Edildi', variant: 'success' },
  cancelled: { label: 'İptal Edildi', variant: 'destructive' },
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/giris')
  }

  // Kullanıcının siparişlerini çek
  const { data: orders = [], error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      created_at,
      status,
      total,
      order_items (
        quantity,
        products (
          name
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Orders fetch error:', error)
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Siparişlerim</h2>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Siparişleriniz alınamadı</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Lütfen sayfayı yenileyin. Sorun devam ederse destek ile iletişime geçin.
            </p>
            <Button asChild variant="outline">
              <Link href="/">Ana Sayfaya Dön</Link>
            </Button>
          </CardContent>
        </Card>
      ) : !orders || orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Henüz siparişiniz yok</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Alışverişe başlayarak ilk siparişinizi oluşturun
            </p>
            <Button asChild>
              <Link href="/urunler">Alışverişe Başla</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const items = order.order_items || []
            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm">#{order.order_number}</span>
                        <Badge variant={statusMap[order.status]?.variant || 'secondary'}>
                          {statusMap[order.status]?.label || order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {formatDate(order.created_at)}
                      </p>
                      <p className="text-sm">
                        {items.map((item: any, i: number) => (
                          <span key={i}>
                            {item.products?.name || 'Ürün'} x{item.quantity}
                            {i < items.length - 1 && ', '}
                          </span>
                        ))}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-bold">{formatPrice(order.total)}</span>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/hesabim/siparislerim/${order.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Detay
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
