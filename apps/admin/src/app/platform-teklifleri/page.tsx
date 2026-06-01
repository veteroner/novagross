import { Card, Badge, PageHeader, EmptyState } from '@novagross/ui'
import { Gift } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { OfferForm } from './offer-form'

export const dynamic = 'force-dynamic'

const OFFER_TYPE_LABEL: Record<string, string> = {
  commission_discount: 'Komisyon İndirimi',
  co_funded_discount: 'Ortak Finansman',
  free_shipping_support: 'Kargo Desteği',
  fee_waiver: 'Ücret Muafiyeti',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Yanıt Bekliyor',
  accepted: 'Kabul Edildi',
  rejected: 'Reddedildi',
  expired: 'Süresi Doldu',
  cancelled: 'İptal Edildi',
  completed: 'Tamamlandı',
}
const STATUS_VARIANT: Record<string, any> = {
  pending: 'default',
  accepted: 'success',
  rejected: 'destructive',
  expired: 'secondary',
  cancelled: 'secondary',
  completed: 'success',
}

export default async function AdminPlatformOffersPage() {
  const { supabase } = await requireAdmin()

  const [offersRes, storesRes] = await Promise.all([
    (supabase as any)
      .from('platform_offers')
      .select(
        'id, title, offer_type, platform_share_percent, required_seller_discount_percent, status, rejection_reason, starts_at, ends_at, response_deadline, created_at, store_id, stores!platform_offers_store_id_fkey(store_name, store_slug)'
      )
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('stores')
      .select('id, store_name')
      .eq('status', 'active')
      .order('store_name'),
  ])

  const offers = (offersRes.data ?? []) as any[]
  const stores = (((storesRes.data ?? []) as unknown) as any[]).map((s) => ({
    id: s.id,
    name: s.store_name,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avantajlı Teklifler"
        description="Satıcılara platform destekli teklifler gönderin (komisyon indirimi, ortak finansman, kargo desteği)."
      />

      <OfferForm stores={stores} />

      <Card>
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold">Gönderilen Teklifler</h2>
        </div>
        {offers.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="Henüz teklif yok"
            description="Yukarıdaki formdan ilk avantajlı teklifinizi gönderin."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-600 text-xs">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Teklif</th>
                  <th className="text-left py-3 px-4 font-medium">Hedef</th>
                  <th className="text-left py-3 px-4 font-medium">Tip</th>
                  <th className="text-left py-3 px-4 font-medium">Şartlar</th>
                  <th className="text-left py-3 px-4 font-medium">Son Tarih</th>
                  <th className="text-left py-3 px-4 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.id} className="border-b hover:bg-orange-50/30">
                    <td className="py-3 px-4">
                      <div className="font-medium">{o.title}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(o.created_at).toLocaleString('tr-TR')}
                      </div>
                      {o.rejection_reason && (
                        <div className="text-xs text-red-600 mt-1">
                          Red sebebi: {o.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {o.stores?.store_name ?? (
                        <span className="text-orange-700 font-medium">
                          Genel (Tüm satıcılar)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {OFFER_TYPE_LABEL[o.offer_type] ?? o.offer_type}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div>
                        Platform: %{Number(o.platform_share_percent ?? 0).toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Satıcı: %{Number(o.required_seller_discount_percent ?? 0).toFixed(1)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600">
                      Cevap: {o.response_deadline
                        ? new Date(o.response_deadline).toLocaleDateString('tr-TR')
                        : '—'}
                      <div>
                        Bitiş: {new Date(o.ends_at).toLocaleDateString('tr-TR')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={STATUS_VARIANT[o.status] ?? 'default'}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
