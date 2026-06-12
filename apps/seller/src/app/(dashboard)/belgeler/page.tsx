import { Card, Badge, PageHeader, EmptyState } from '@novagross/ui'
import { FileText, Download, AlertTriangle } from 'lucide-react'
import { requireSeller } from '@/lib/auth/requireSeller'
import { UploadForm } from './upload-form'
import { DeleteButton } from './delete-button'

export const dynamic = 'force-dynamic'

const DOC_TYPE_LABEL: Record<string, string> = {
  tax_certificate: 'Vergi Levhası',
  id_card: 'Kimlik Belgesi',
  contract: 'Sözleşme',
  signature_circular: 'İmza Sirküleri',
  trade_registry: 'Ticaret Sicil Gazetesi',
  other: 'Diğer',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Onay Bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
  expired: 'Süresi Doldu',
}

const STATUS_VARIANT: Record<string, any> = {
  pending: 'default',
  approved: 'success',
  rejected: 'destructive',
  expired: 'secondary',
}

function formatBytes(n: number | null) {
  if (!n) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('tr-TR')
}

export default async function SellerDocumentsPage() {
  const { supabase, storeId } = await requireSeller('/belgeler')

  const { data } = await (supabase as any)
    .from('store_documents')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(200)

  const docs = (data ?? []) as any[]
  const pendingCount = docs.filter((d) => d.status === 'pending').length
  const expired = docs.filter(
    (d) => d.expires_at && new Date(d.expires_at).getTime() < Date.now()
  ).length

  // Signed URL'ler için listeyi hazırla — bucket eksik/erişim hatasında
  // tüm sayfa düşmesin diye her doc için tek tek try-catch.
  const signedByDoc = new Map<string, string | null>()
  await Promise.all(
    docs.map(async (d) => {
      try {
        const { data: signed } = await (supabase as any).storage
          .from('documents')
          .createSignedUrl(d.file_url, 60 * 60)
        signedByDoc.set(d.id, signed?.signedUrl ?? null)
      } catch {
        signedByDoc.set(d.id, null)
      }
    })
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Belgelerim"
        description="Mağaza belgeleri (vergi levhası, kimlik, sözleşme vs.). Yüklenen belgeler admin onayından geçer."
      />

      <UploadForm storeId={storeId} />

      {(pendingCount > 0 || expired > 0) && (
        <Card className="p-4 bg-orange-50 border-orange-200 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
          <div className="text-sm text-orange-900">
            {pendingCount > 0 && (
              <p>
                <strong>{pendingCount}</strong> belge admin onayında.
              </p>
            )}
            {expired > 0 && (
              <p>
                <strong>{expired}</strong> belgenin süresi dolmuş — yenisini yükleyin.
              </p>
            )}
          </div>
        </Card>
      )}

      {docs.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="Henüz belge yok"
            description="Vergi levhası, kimlik gibi belgeleri yükleyerek hesabınızı tamamlayın."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-600 text-xs">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Belge</th>
                  <th className="text-left py-3 px-4 font-medium">Tipi</th>
                  <th className="text-left py-3 px-4 font-medium">Boyut</th>
                  <th className="text-left py-3 px-4 font-medium">Yüklendi</th>
                  <th className="text-left py-3 px-4 font-medium">Geçerlilik</th>
                  <th className="text-left py-3 px-4 font-medium">Durum</th>
                  <th className="text-right py-3 px-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const isExpired =
                    d.expires_at && new Date(d.expires_at).getTime() < Date.now()
                  const signedUrl = signedByDoc.get(d.id)
                  return (
                    <tr key={d.id} className="border-b hover:bg-green-50/30">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          {d.title}
                        </div>
                        {d.rejection_reason && (
                          <div className="text-xs text-red-600 mt-1">
                            Red sebebi: {d.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {DOC_TYPE_LABEL[d.doc_type] ?? d.doc_type}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {formatBytes(d.file_size_bytes)}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {formatDate(d.created_at)}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {isExpired ? (
                          <Badge variant="destructive">Süresi doldu</Badge>
                        ) : d.expires_at ? (
                          formatDate(d.expires_at)
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={STATUS_VARIANT[d.status] ?? 'default'}>
                          {STATUS_LABEL[d.status] ?? d.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {signedUrl && (
                            <a
                              href={signedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline"
                            >
                              <Download className="h-3 w-3" />
                              Aç
                            </a>
                          )}
                          {d.status === 'pending' && <DeleteButton id={d.id} />}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
