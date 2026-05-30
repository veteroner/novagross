import { Card, CardContent, CardHeader, CardTitle, Badge } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type PayoutRow = {
  store_id: string
  store_name: string | null
  iban: string | null
  bank_name: string | null
  account_holder: string | null
  order_id: string
  order_number: string | null
  delivered_at: string | null
  return_deadline: string | null
  seller_amount: number
  scheduled_payout_date: string | null
  is_paid: boolean
  payout_status: 'awaiting_delivery' | 'in_return_period' | 'ready_for_payout' | 'paid'
  transaction_created_at: string
}

function formatTry(amount: number) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ₺`
  }
}

function formatDate(d: string | null) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return d
  }
}

function StatusBadge({ status }: { status: PayoutRow['payout_status'] }) {
  const map: Record<PayoutRow['payout_status'], { label: string; cls: string }> = {
    awaiting_delivery: {
      label: '📦 Teslim bekleniyor',
      cls: 'bg-gray-100 text-gray-800',
    },
    in_return_period: {
      label: '⏳ İade süresi (14 gün)',
      cls: 'bg-yellow-100 text-yellow-800',
    },
    ready_for_payout: {
      label: '💸 Ödenebilir',
      cls: 'bg-blue-100 text-blue-800',
    },
    paid: {
      label: '✅ Ödendi',
      cls: 'bg-green-100 text-green-800',
    },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

export default async function PayoutsPreviewPage() {
  await requireAdmin('/odemeler/onizleme')
  const supabase = createServiceRoleClient()

  const { data: rows, error } = await (supabase.from('v_payout_status' as any) as any)
    .select('*')
    .limit(500)

  if (error) {
    console.error('[Odemeler/Onizleme] failed:', error)
  }

  const all = (rows ?? []) as PayoutRow[]

  const grouped = {
    awaiting_delivery: all.filter((r) => r.payout_status === 'awaiting_delivery'),
    in_return_period: all.filter((r) => r.payout_status === 'in_return_period'),
    ready_for_payout: all.filter((r) => r.payout_status === 'ready_for_payout'),
    paid: all.filter((r) => r.payout_status === 'paid').slice(0, 50),
  }

  const sumOf = (rows: PayoutRow[]) =>
    rows.reduce((s, r) => s + (Number(r.seller_amount) || 0), 0)

  const totals = {
    awaiting_delivery: sumOf(grouped.awaiting_delivery),
    in_return_period: sumOf(grouped.in_return_period),
    ready_for_payout: sumOf(grouped.ready_for_payout),
    paid_recent: sumOf(grouped.paid),
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ödeme Önizleme</h1>
          <p className="text-gray-600 mt-1">
            Satıcı ödemelerinin yaşam döngüsü: teslim bekleyenler → iade süresi → ödenebilir → ödenmiş.
          </p>
        </div>
        <Link
          href="/odemeler"
          className="inline-flex items-center px-3 py-2 rounded border text-sm hover:bg-gray-50"
        >
          Haftalık Batch'e Git →
        </Link>
      </div>

      {/* 4 summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">📦 Teslim Bekleyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatTry(totals.awaiting_delivery)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {grouped.awaiting_delivery.length} sipariş
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">⏳ İade Süresinde</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatTry(totals.in_return_period)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {grouped.in_return_period.length} sipariş · 14 gün dolması bekleniyor
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-700">💸 Ödenebilir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-blue-700">
              {formatTry(totals.ready_for_payout)}
            </div>
            <div className="text-xs text-blue-700 mt-1">
              {grouped.ready_for_payout.length} sipariş · İlk Çarşamba batch'e dahil
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">✅ Son Ödemeler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-700">
              {formatTry(totals.paid_recent)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Son 50 satır
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Each table */}
      {(['ready_for_payout', 'in_return_period', 'awaiting_delivery', 'paid'] as const).map(
        (status) => {
          const rows = grouped[status]
          if (rows.length === 0) return null

          const titles: Record<PayoutRow['payout_status'], string> = {
            awaiting_delivery: '📦 Teslim Bekleyenler',
            in_return_period: '⏳ İade Süresinde (14 gün dolmadı)',
            ready_for_payout: '💸 Ödemeye Hazır (İlk Çarşamba batch)',
            paid: '✅ Ödenmişler (son 50)',
          }

          return (
            <Card key={status}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {titles[status]}
                  <Badge variant="secondary">{rows.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Mağaza</th>
                        <th className="text-left py-2 px-3">Sipariş</th>
                        <th className="text-left py-2 px-3">Teslim</th>
                        <th className="text-left py-2 px-3">İade Son</th>
                        <th className="text-left py-2 px-3">Ödeme Tarihi</th>
                        <th className="text-right py-2 px-3">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={`${r.order_id}-${r.store_id}`} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3">
                            <div className="font-medium">{r.store_name || '—'}</div>
                            {r.iban ? (
                              <div className="text-xs text-muted-foreground font-mono">{r.iban}</div>
                            ) : null}
                          </td>
                          <td className="py-2 px-3 font-mono text-xs">
                            {r.order_number || r.order_id.slice(0, 8)}
                          </td>
                          <td className="py-2 px-3">{formatDate(r.delivered_at)}</td>
                          <td className="py-2 px-3">{formatDate(r.return_deadline)}</td>
                          <td className="py-2 px-3">{formatDate(r.scheduled_payout_date)}</td>
                          <td className="py-2 px-3 text-right font-semibold">
                            {formatTry(Number(r.seller_amount) || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )
        }
      )}

      {all.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg">Henüz hareket yok</p>
            <p className="text-sm mt-2">
              İlk ödenmiş sipariş geldiğinde otomatik kayıtlar burada görünecek.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-red-300">
          <CardContent className="py-4 text-sm text-red-700">
            Veri yükleme hatası: {error.message}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
