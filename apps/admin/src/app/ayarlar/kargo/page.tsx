import Link from 'next/link'
import { Card, Button, Badge } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'
import { Plus, Truck, Edit, Trash2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function KargoAyarlariPage() {
  await requireAdmin('/ayarlar/kargo')
  
  const supabase = await createClient()

  // Fetch shipping carriers
  const { data: carriers } = await supabase
    .from('shipping_carriers')
    .select('*')
    .order('display_order', { ascending: true })

  // Fetch shipping methods with carrier info
  const { data: methods } = await supabase
    .from('shipping_methods')
    .select(`
      *,
      carrier:shipping_carriers(name, code)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kargo Ayarları</h1>
          <p className="text-gray-600 mt-1">Kargo firmaları ve teslimat yöntemlerini yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/ayarlar/kargo/oranlar">Kargo Oranları</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/ayarlar/kargo/magaza-ayarlari">Mağaza Ayarları</Link>
          </Button>
        </div>
      </div>

      {/* Kargo Firmaları */}
      <Card>
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Kargo Firmaları</h2>
            <p className="text-sm text-gray-600">Anlaşmalı kargo firmalarınızı tanımlayın</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Firma Ekle
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-600">Firma Adı</th>
                <th className="text-left py-3 px-6 font-medium text-gray-600">Kod</th>
                <th className="text-left py-3 px-6 font-medium text-gray-600">API</th>
                <th className="text-center py-3 px-6 font-medium text-gray-600">Durum</th>
                <th className="text-right py-3 px-6 font-medium text-gray-600">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {carriers && carriers.length > 0 ? (
                carriers.map((carrier) => (
                  <tr key={carrier.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Truck className="w-5 h-5 text-gray-400" />
                        <span className="font-medium">{carrier.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">{carrier.code}</code>
                    </td>
                    <td className="py-4 px-6">
                      {carrier.api_enabled ? (
                        <Badge variant="success">API Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Manuel</Badge>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {carrier.is_active ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="destructive">Pasif</Badge>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Henüz kargo firması eklenmemiş
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Teslimat Yöntemleri */}
      <Card>
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Teslimat Yöntemleri</h2>
            <p className="text-sm text-gray-600">Standart, hızlı kargo gibi teslimat seçenekleri</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Yöntem Ekle
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-600">Yöntem Adı</th>
                <th className="text-left py-3 px-6 font-medium text-gray-600">Kargo Firması</th>
                <th className="text-left py-3 px-6 font-medium text-gray-600">Teslimat Süresi</th>
                <th className="text-center py-3 px-6 font-medium text-gray-600">Durum</th>
                <th className="text-right py-3 px-6 font-medium text-gray-600">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {methods && methods.length > 0 ? (
                methods.map((method) => (
                  <tr key={method.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium">{method.name}</p>
                        <p className="text-xs text-gray-500">{method.description}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="outline">{method.carrier?.name || 'N/A'}</Badge>
                    </td>
                    <td className="py-4 px-6">
                      {method.estimated_delivery_days && (
                        <span className="text-sm">
                          {method.estimated_delivery_days}
                          {method.estimated_delivery_days_max && ` - ${method.estimated_delivery_days_max}`}
                          {' '}gün
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {method.is_active ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="destructive">Pasif</Badge>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Henüz teslimat yöntemi eklenmemiş
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bilgilendirme Kartı */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Kargo Entegrasyonu Hakkında</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Kargo firmaları eklendikten sonra satıcılar sipariş gönderiminde bunları kullanabilir</li>
            <li>• API entegrasyonu aktif edilirse otomatik takip numarası alınır</li>
            <li>
              • Fiyatlandırma ayarları için{' '}
              <Link href="/ayarlar/kargo/oranlar" className="underline font-medium">
                Kargo Oranları
              </Link>
              {' '}bölümünü kullanın
            </li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
