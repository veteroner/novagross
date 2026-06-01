import { Card, Badge, PageHeader, EmptyState } from '@novagross/ui'
import { Gift, Globe2, Store as StoreIcon } from 'lucide-react'
import { requireSeller } from '@/lib/auth/requireSeller'
import { ResponseButtons } from './response-buttons'

export const dynamic = 'force-dynamic'

const OFFER_TYPE_LABEL: Record<string, string> = {
  commission_discount: 'Komisyon İndirimi',
  co_funded_discount: 'Ortak Finansman İndirim',
  free_shipping_support: 'Kargo Desteği',
  fee_waiver: 'İşlem Ücreti Muafiyeti',
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

export default async function SellerPlatformOffersPage() {
  const { supabase, storeId } = await requireSeller('/avantajli-teklifler')

  // RLS sayesinde sadece kendisinin veya genel teklifler dönecek.
  const { data } = await (supabase as any)
    .from('platform_offers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const offers = (data ?? []) as any[]
  const now = Date.now()

  // pending olanları üste, sonra tarihe göre
  offers.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const pendingCount = offers.filter((o) => o.status === 'pending').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avantajlı Teklifler"
        description="Platform'dan size özel destekli kampanya tekliflerini inceleyin. Kabul ettiğiniz teklifler ürünlerinizi daha avantajlı hale getirir."
      />

      {pendingCount > 0 && (
        <Card className="p-4 bg-orange-50 border-orange-200 flex items-start gap-2">
          <Gift className="h-5 w-5 text-orange-600 mt-0.5" />
          <div className="text-sm text-orange-900">
            <strong>{pendingCount}</strong> bekleyen platform teklifi var. Cevap son
            tarihinden önce yanıt verin.
          </div>
        </Card>
      )}

      <Card>
        {offers.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="Henüz teklif yok"
            description="Platform'dan size özel teklif geldiğinde burada görüntülenir."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-600 text-xs">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Teklif</th>
                  <th className="text-left py-3 px-4 font-medium">Hedef</th>
                  <th className="text-left py-3 px-4 font-medium">Şartlar</th>
                  <th className="text-left py-3 px-4 font-medium">Son Tarih</th>
                  <th className="text-left py-3 px-4 font-medium">Durum</th>
                  <th className="text-right py-3 px-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => {
                  const isExpired =
                    o.response_deadline &&
                    new Date(o.response_deadline).getTime() < now
                  return (
                    <tr key={o.id} className="border-b hover:bg-green-50/30">
                      <td className="py-3 px-4">
                        <div className="font-medium">{o.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {OFFER_TYPE_LABEL[o.offer_type] ?? o.offer_type}
                        </div>
                        {o.description && (
                          <div className="text-xs text-gray-600 mt-1">
                            {o.description}
                          </div>
                        )}
                        {o.rejection_reason && o.status === 'rejected' && (
                          <div className="text-xs text-red-600 mt-1">
                            Red sebebiniz: {o.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {o.store_id ? (
                          <span className="inline-flex items-center gap-1 text-gray-700">
                            <StoreIcon className="h-3 w-3" /> Size özel
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-blue-700">
                            <Globe2 className="h-3 w-3" /> Genel
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div>
                          Platform payı:{' '}
                          <strong>%{Number(o.platform_share_percent ?? 0).toFixed(1)}</strong>
                        </div>
                        <div className="text-xs text-gray-500">
                          Vermeniz gereken indirim: %
                          {Number(o.required_seller_discount_percent ?? 0).toFixed(1)} ·
                          Min stok: {o.required_min_stock ?? 1}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        <div>
                          Cevap:{' '}
                          {o.response_deadline
                            ? new Date(o.response_deadline).toLocaleDateString(
                                'tr-TR'
                              )
                            : '—'}
                          {isExpired && (
                            <span className="text-red-600 ml-1">(geçti)</span>
                          )}
                        </div>
                        <div>
                          Bitiş:{' '}
                          {new Date(o.ends_at).toLocaleDateString('tr-TR')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={STATUS_VARIANT[o.status] ?? 'default'}>
                          {STATUS_LABEL[o.status] ?? o.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {o.status === 'pending' && !isExpired && (
                          <ResponseButtons id={o.id} />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
