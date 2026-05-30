import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@novagross/ui'
import { formatDate, formatPrice } from '@novagross/utils'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '⏳ İncelemede', cls: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '✅ Onaylandı', cls: 'bg-blue-100 text-blue-800' },
  refunded: { label: '💸 İade tamamlandı', cls: 'bg-green-100 text-green-800' },
  rejected: { label: '❌ Reddedildi', cls: 'bg-red-100 text-red-800' },
  cancelled: { label: '🚫 İptal edildi', cls: 'bg-gray-100 text-gray-800' },
}

export default async function MyReturnsPage({
  searchParams,
}: {
  searchParams: { success?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const { data: returns } = await (supabase as any)
    .from('return_requests')
    .select(`
      id,
      order_id,
      order_item_id,
      quantity,
      reason,
      reason_category,
      status,
      refund_amount,
      rejection_reason,
      admin_note,
      created_at,
      reviewed_at,
      refunded_at,
      orders (
        order_number
      ),
      order_items (
        name,
        price
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const list = (returns as any[]) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">İadelerim</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Toplam {list.length} iade talebi
        </p>
      </div>

      {searchParams.success ? (
        <div className="p-3 rounded border border-green-300 bg-green-50 text-green-800 text-sm">
          ✅ İade talebiniz başarıyla oluşturuldu. İncelemeye alındı, sonuç e-posta ile bildirilecek.
        </div>
      ) : null}

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Henüz iade talebiniz bulunmuyor.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((r) => {
            const status = STATUS_MAP[r.status] ?? STATUS_MAP.pending
            return (
              <Card key={r.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/hesabim/siparislerim/${r.order_id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        Sipariş #{r.orders?.order_number ?? r.order_id.slice(0, 8)}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">
                        Talep tarihi: {formatDate(r.created_at)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${status.cls}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Ürün:</strong> {r.order_items?.name ?? '—'} (× {r.quantity})
                    </p>
                    <p>
                      <strong>Tutar:</strong>{' '}
                      {r.refund_amount ? formatPrice(r.refund_amount) : '—'}
                    </p>
                    <p>
                      <strong>Neden:</strong> {r.reason}
                    </p>
                    {r.status === 'rejected' && r.rejection_reason ? (
                      <p className="text-red-700">
                        <strong>Red gerekçesi:</strong> {r.rejection_reason}
                      </p>
                    ) : null}
                    {r.status === 'approved' && r.admin_note ? (
                      <p className="text-blue-700">
                        <strong>Admin notu:</strong> {r.admin_note}
                      </p>
                    ) : null}
                    {r.refunded_at ? (
                      <p className="text-green-700">
                        <strong>İade tarihi:</strong> {formatDate(r.refunded_at)}
                      </p>
                    ) : null}
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
