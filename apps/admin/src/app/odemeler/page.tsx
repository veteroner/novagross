import { Card, CardContent, CardHeader, CardTitle, Badge } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { PayoutBatchActions } from '@/components/admin/payout/payout-batch-actions'

type SearchParams = { asOf?: string }

type PayoutCandidate = {
  store_id: string
  store_name: string | null
  bank_name: string | null
  iban: string | null
  account_holder: string | null
  amount: number
  sale_count: number
}

function formatTry(amount: number) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ₺`
  }
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function getNextWednesday(from: Date) {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun .. 3=Wed
  const delta = (3 - day + 7) % 7
  if (delta === 0) return d
  d.setDate(d.getDate() + delta)
  return d
}

export const dynamic = 'force-dynamic'

export default async function OdemelerPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAdmin('/odemeler')

  const defaultAsOf = toIsoDate(getNextWednesday(new Date()))
  const asOf = (searchParams.asOf && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.asOf)
    ? searchParams.asOf
    : defaultAsOf) as string

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc('get_weekly_payout_candidates' as any, {
    p_as_of: asOf,
  })

  if (error) {
    console.error('[Odemeler] candidates rpc failed:', error)
  }

  const candidates = ((data as any) ?? []) as PayoutCandidate[]
  const total = candidates.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ödemeler (Çarşamba Batch)</h1>
          <p className="text-gray-600 mt-1">
            Bu ekranda {asOf} tarihi itibarıyla ödenebilir tutarlar listelenir.
          </p>
        </div>
        <Badge variant="secondary">Haftalık · Çarşamba</Badge>
      </div>

      <PayoutBatchActions asOf={asOf} candidates={candidates} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Mağaza</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{candidates.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Toplam Tutar</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatTry(total)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hata</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {error ? error.message : 'Yok'}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bu Hafta Ödenecekler</CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <div className="text-muted-foreground">Bu tarih için ödenecek kayıt yok.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 text-sm font-medium">Mağaza</th>
                    <th className="text-right py-3 px-3 text-sm font-medium">Tutar</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Banka</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">IBAN</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Hesap Sahibi</th>
                    <th className="text-right py-3 px-3 text-sm font-medium">Satış Satırı</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.store_id} className="border-b">
                      <td className="py-3 px-3 font-medium">{c.store_name || c.store_id}</td>
                      <td className="py-3 px-3 text-right font-semibold">{formatTry(Number(c.amount) || 0)}</td>
                      <td className="py-3 px-3">{c.bank_name || '—'}</td>
                      <td className="py-3 px-3 font-mono">{c.iban || '—'}</td>
                      <td className="py-3 px-3">{c.account_holder || '—'}</td>
                      <td className="py-3 px-3 text-right">{c.sale_count ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
