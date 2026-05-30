import Link from 'next/link'
import { Card, Badge, Button, PageHeader } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Store } from 'lucide-react'

export const dynamic = 'force-dynamic'

type StoreShippingSettingRow = {
  id: string
  is_enabled: boolean | null
  processing_time_days: number | null
  custom_base_price: number | string | null
  custom_free_shipping_threshold: number | string | null
  created_at: string | null
  store?: {
    store_name: string
    store_slug: string
  } | null
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

export default async function MagazaKargoAyarlariPage() {
  await requireAdmin('/ayarlar/kargo/magaza-ayarlari')

  const supabase = await createClient()

  const { data: settings, error } = await supabase
    .from('store_shipping_settings')
    .select(
      `
        id,
        is_enabled,
        processing_time_days,
        custom_base_price,
        custom_free_shipping_threshold,
        created_at,
        store:stores(store_name, store_slug),
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
    console.error('Error fetching store shipping settings:', error)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/ayarlar/kargo"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kargo Ayarlarına Dön
        </Link>
      </div>

      <PageHeader
        title="Mağaza Kargo Ayarları"
        description="Mağazaya özel kargo ücret/limit ve aktivasyon ayarları"
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Mağaza</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Yöntem</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Özel Taban</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Ücretsiz Limit</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Hazırlık</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Durum</th>
              </tr>
            </thead>
            <tbody>
              {settings && settings.length > 0 ? (
                (settings as unknown as StoreShippingSettingRow[]).map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">{row.store?.store_name || 'N/A'}</p>
                          {row.store?.store_slug && (
                            <p className="text-xs text-gray-500">/{row.store.store_slug}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-sm">{row.method?.name || 'N/A'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {row.method?.carrier?.name && (
                            <Badge variant="outline">{row.method.carrier.name}</Badge>
                          )}
                          {row.method?.code && (
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{row.method.code}</code>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">{formatMoney(row.custom_base_price)}</td>
                    <td className="py-3 px-4 text-sm">{formatMoney(row.custom_free_shipping_threshold)}</td>
                    <td className="py-3 px-4 text-sm">{row.processing_time_days ?? '-'} gün</td>
                    <td className="py-3 px-4 text-center">
                      {row.is_enabled ? (
                        <Badge variant="success">Açık</Badge>
                      ) : (
                        <Badge variant="destructive">Kapalı</Badge>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Henüz mağazaya özel kargo ayarı bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
