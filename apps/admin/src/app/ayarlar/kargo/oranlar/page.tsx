import Link from 'next/link'
import { Card, Badge, Button } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

type ShippingRateRow = {
  id: string
  region: string | null
  min_weight: number | string | null
  max_weight: number | string | null
  min_order_value: number | string | null
  max_order_value: number | string | null
  base_price: number | string
  price_per_kg: number | string | null
  free_shipping_threshold: number | string | null
  is_active: boolean | null
  created_at: string | null
  method?: {
    name: string
    code: string
    carrier?: {
      name: string
      code: string
    } | null
  } | null
}

function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '-'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '-'
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
}

function formatRange(min: number | string | null, max: number | string | null, unit: string) {
  if (!min && !max) return '-'
  if (min && !max) return `≥ ${min} ${unit}`
  if (!min && max) return `≤ ${max} ${unit}`
  return `${min} - ${max} ${unit}`
}

export default async function KargoOranlariPage() {
  await requireAdmin('/ayarlar/kargo/oranlar')

  const supabase = await createClient()

  const { data: rates, error } = await supabase
    .from('shipping_rates')
    .select(
      `
        id,
        region,
        min_weight,
        max_weight,
        min_order_value,
        max_order_value,
        base_price,
        price_per_kg,
        free_shipping_threshold,
        is_active,
        created_at,
        method:shipping_methods(
          name,
          code,
          carrier:shipping_carriers(name, code)
        )
      `
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Error fetching shipping rates:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/ayarlar/kargo">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kargo Ayarları
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Kargo Oranları</h1>
          <p className="text-gray-600 mt-1">Kargo yöntemlerine göre fiyatlandırma kuralları</p>
        </div>

        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Oran Ekle
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Yöntem</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Bölge</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Ağırlık</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Sepet</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Taban</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Kg Ücreti</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Ücretsiz</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Durum</th>
              </tr>
            </thead>
            <tbody>
              {rates && rates.length > 0 ? (
                (rates as unknown as ShippingRateRow[]).map((rate) => (
                  <tr key={rate.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-sm">{rate.method?.name || 'N/A'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {rate.method?.carrier?.name && (
                            <Badge variant="outline">{rate.method.carrier.name}</Badge>
                          )}
                          {rate.method?.code && (
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{rate.method.code}</code>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{rate.region || 'all'}</code>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {formatRange(rate.min_weight, rate.max_weight, 'kg')}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {formatRange(rate.min_order_value, rate.max_order_value, '₺')}
                    </td>
                    <td className="py-3 px-4 text-sm">{formatMoney(rate.base_price)}</td>
                    <td className="py-3 px-4 text-sm">{formatMoney(rate.price_per_kg)}</td>
                    <td className="py-3 px-4 text-sm">{formatMoney(rate.free_shipping_threshold)}</td>
                    <td className="py-3 px-4 text-center">
                      {rate.is_active ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="destructive">Pasif</Badge>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    Henüz kargo oranı tanımlanmamış
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <div className="p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Not</h3>
          <p className="text-sm text-blue-800">
            Bu sayfa mevcut oranları görüntüler. Oran ekleme/düzenleme aksiyonları için UI akışı
            gerekiyorsa bir sonraki adımda form sayfalarını da ekleyebilirim.
          </p>
        </div>
      </Card>
    </div>
  )
}
