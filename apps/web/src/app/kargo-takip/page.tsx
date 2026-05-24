'use client'

import { Metadata } from 'next'
import { useState } from 'react'
import { Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function KargoTakipPage() {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!trackingNumber.trim()) {
      setError('Lütfen takip numarası giriniz')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/cargo/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber: trackingNumber.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Bir hata oluştu')
        return
      }

      setResult(data.order)
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (statusCode: string) => {
    switch (statusCode) {
      case 'delivered':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'shipped':
        return <Truck className="w-6 h-6 text-blue-500" />
      case 'cancelled':
      case 'refunded':
        return <XCircle className="w-6 h-6 text-red-500" />
      default:
        return <Clock className="w-6 h-6 text-orange-500" />
    }
  }

  return (
    <div className="container max-w-2xl py-12">
      <h1 className="text-4xl font-bold mb-8">Kargo Takip</h1>
      
      <div className="bg-card rounded-lg border p-8">
        <p className="text-muted-foreground mb-6">
          Sipariş numaranızı veya kargo takip numaranızı girerek kargonuzun durumunu takip edebilirsiniz.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="trackingNumber" className="block text-sm font-medium mb-2">
              Takip Numarası
            </label>
            <input
              type="text"
              id="trackingNumber"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Sipariş veya kargo takip numaranızı giriniz"
              className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground px-8 py-3 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Sorgulanıyor...' : 'Sorgula'}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 pt-8 border-t space-y-4">
            <div className="flex items-center gap-3 mb-4">
              {getStatusIcon(result.statusCode)}
              <div>
                <h3 className="font-semibold text-lg">{result.status}</h3>
                <p className="text-sm text-muted-foreground">Sipariş No: {result.orderNumber}</p>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Sipariş Tarihi:</span>
                <span className="font-medium">
                  {new Date(result.orderDate).toLocaleDateString('tr-TR')}
                </span>
              </div>

              {result.trackingNumber && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Kargo Takip No:</span>
                  <span className="font-medium">{result.trackingNumber}</span>
                </div>
              )}

              {result.carrier && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Kargo Firması:</span>
                  <span className="font-medium">{result.carrier}</span>
                </div>
              )}

              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Toplam Tutar:</span>
                <span className="font-medium">{result.totalAmount.toFixed(2)} ₺</span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Son Güncelleme:</span>
                <span className="font-medium">
                  {new Date(result.lastUpdate).toLocaleDateString('tr-TR')} {new Date(result.lastUpdate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {result.carrierCode && result.trackingNumber && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  Detaylı kargo takibi için {result.carrier} web sitesini ziyaret edebilirsiniz.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-8 border-t">
          <h3 className="font-semibold mb-3">Siparişlerinizi takip etmek için:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Hesabınıza giriş yaparak "Siparişlerim" sayfasından detaylı takip yapabilirsiniz</li>
            <li>• Sipariş durumunuz değiştikçe e-posta ve SMS ile bilgilendirileceksiniz</li>
            <li>• Kargo firması sisteme yüklendikten sonra takip numaranızı görebilirsiniz</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
