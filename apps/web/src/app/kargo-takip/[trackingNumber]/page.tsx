import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@novagross/ui/card'
import { Badge } from '@novagross/ui/badge'
import { Package, MapPin, Clock, CheckCircle, XCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Kargo Takip',
  description: 'Siparişinizi takip edin',
}

interface PageProps {
  params: {
    trackingNumber: string
  }
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Hazırlanıyor', color: 'bg-gray-100 text-gray-800', icon: Clock },
  preparing: { label: 'Kargoya Hazırlanıyor', color: 'bg-blue-100 text-blue-800', icon: Package },
  shipped: { label: 'Kargoya Verildi', color: 'bg-purple-100 text-purple-800', icon: Package },
  in_transit: { label: 'Dağıtım Merkezinde', color: 'bg-yellow-100 text-yellow-800', icon: MapPin },
  out_for_delivery: { label: 'Dağıtımda', color: 'bg-orange-100 text-orange-800', icon: MapPin },
  delivered: { label: 'Teslim Edildi', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  failed: { label: 'Teslimat Başarısız', color: 'bg-red-100 text-red-800', icon: XCircle },
  returned: { label: 'İade Edildi', color: 'bg-gray-100 text-gray-800', icon: XCircle },
}

export default async function CargoTrackingPage({ params }: PageProps) {
  const { trackingNumber } = params
  const supabase = await createClient()
  
  // Get shipment details
  const { data: shipment, error } = await supabase
    .from('order_shipments')
    .select(`
      *,
      order:orders (
        id,
        order_number,
        created_at,
        total,
        shipping_address
      ),
      carrier:shipping_carriers (
        name,
        logo_url,
        tracking_url_template
      ),
      method:shipping_methods (
        name,
        estimated_delivery_days,
        estimated_delivery_days_max
      ),
      history:shipping_status_history (
        id,
        status,
        location,
        description,
        timestamp,
        created_at
      )
    `)
    .eq('tracking_number', trackingNumber)
    .single()
  
  if (error || !shipment) {
    notFound()
  }
  
  const config = statusConfig[shipment.status] || statusConfig.pending
  const Icon = config.icon
  
  // Sort history by timestamp desc
  const sortedHistory = (shipment.history || []).sort(
    (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  
  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Kargo Takip</h1>
        <p className="text-gray-600">
          Takip No: <span className="font-mono font-semibold">{trackingNumber}</span>
        </p>
      </div>
      
      {/* Order Info */}
      <Card className="p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Sipariş Bilgileri</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-600">Sipariş No:</span>{' '}
                <span className="font-semibold">#{shipment.order.order_number}</span>
              </p>
              <p>
                <span className="text-gray-600">Sipariş Tarihi:</span>{' '}
                {shipment.order.created_at
                  ? new Date(shipment.order.created_at).toLocaleDateString('tr-TR')
                  : '-'}
              </p>
              <p>
                <span className="text-gray-600">Tutar:</span>{' '}
                {Number(shipment.order.total).toFixed(2)} ₺
              </p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">Teslimat Adresi</h3>
            <div className="text-sm">
              <p className="font-semibold">
                {(shipment.order.shipping_address as any).first_name}{' '}
                {(shipment.order.shipping_address as any).last_name}
              </p>
              <p className="text-gray-600">
                {(shipment.order.shipping_address as any).address_line1}
              </p>
              <p className="text-gray-600">
                {(shipment.order.shipping_address as any).district},{' '}
                {(shipment.order.shipping_address as any).city}
              </p>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Current Status */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full ${config.color} flex items-center justify-center`}>
            <Icon className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">{config.label}</h2>
            <p className="text-gray-600">
              {shipment.carrier.name} - {shipment.method.name}
            </p>
            {shipment.estimated_delivery_at && (
              <p className="text-sm text-gray-500 mt-1">
                Tahmini Teslimat: {new Date(shipment.estimated_delivery_at).toLocaleDateString('tr-TR')}
              </p>
            )}
          </div>
          <Badge className={config.color}>{config.label}</Badge>
        </div>
        
        {shipment.tracking_url && (
          <div className="mt-4 pt-4 border-t">
            <a
              href={shipment.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              🔗 Kargo firması sitesinde takip et →
            </a>
          </div>
        )}
      </Card>
      
      {/* Shipment History */}
      {sortedHistory.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Kargo Geçmişi</h3>
          
          <div className="space-y-4">
            {sortedHistory.map((entry: any, index: number) => (
              <div key={entry.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  {index < sortedHistory.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 mt-1" />
                  )}
                </div>
                
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold">{entry.description || statusConfig[entry.status]?.label}</p>
                    <span className="text-sm text-gray-500">
                      {new Date(entry.timestamp).toLocaleString('tr-TR')}
                    </span>
                  </div>
                  {entry.location && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {entry.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* No History */}
      {sortedHistory.length === 0 && (
        <Card className="p-6 text-center text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Henüz kargo hareketi kaydedilmedi</p>
          <p className="text-sm mt-1">Kargo bilgileri güncellendiğinde burada görünecek</p>
        </Card>
      )}
    </div>
  )
}
