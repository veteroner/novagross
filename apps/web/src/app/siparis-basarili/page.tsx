'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@novagross/ui'
import { CheckCircle, Package, Home } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'

function OrderSuccessContent() {
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('order_number') || ''
  const orderId = searchParams.get('order_id')
  const paymentId = searchParams.get('payment_id')
  
  const { clearCart } = useCartStore()
  
  // Clear local cart on success
  useEffect(() => {
    clearCart()
  }, [clearCart])

  return (
    <div className="container py-16">
      <div className="max-w-lg mx-auto text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold mb-2">Siparişiniz Alındı!</h1>
        <p className="text-muted-foreground mb-6">
          Siparişiniz başarıyla oluşturuldu ve ödemeniz alındı. Sipariş detaylarınız e-posta adresinize gönderildi.
        </p>

        <div className="bg-muted p-6 rounded-lg mb-8">
          <p className="text-sm text-muted-foreground mb-1">Sipariş Numaranız</p>
          <p className="text-2xl font-bold font-mono">{orderNumber || '—'}</p>
          {paymentId && (
            <p className="text-xs text-muted-foreground mt-2">
              Ödeme Referansı: {paymentId}
            </p>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-8 text-left">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Sonraki Adımlar
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Sipariş onay e-postası gönderildi</li>
            <li>• Siparişiniz hazırlandığında bilgilendirileceksiniz</li>
            <li>• Kargoya verildiğinde takip numarası paylaşılacak</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href="/hesabim/siparislerim">
              <Package className="mr-2 h-4 w-4" />
              Siparişlerimi Görüntüle
            </Link>
          </Button>
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Ana Sayfaya Dön
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container py-16">
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  )
}
