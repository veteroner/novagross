import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, Badge, PageHeader, StatCard } from '@novagross/ui'
import { Receipt, Download, ArrowLeft, FileText } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { PeriodStatusActions } from './period-actions'

export const dynamic = 'force-dynamic'

const MONTH_NAMES_TR = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const STATUS_LABEL: Record<string, string> = {
  open: 'Açık (devam ediyor)',
  submitted: 'Beyan verildi',
  paid: 'Ödendi',
  closed: 'Kapatıldı',
}
const STATUS_VARIANT: Record<string, any> = {
  open: 'default',
  submitted: 'secondary',
  paid: 'success',
  closed: 'outline',
}

const TAXPAYER_LABEL: Record<string, string> = {
  real_person: 'Gerçek kişi',
  sole_proprietor: 'Şahıs şirketi',
  limited_company: 'Limited şirket',
  joint_stock_company: 'Anonim şirket',
  tradesman_exempt: 'Esnaf muaflığı',
  simple_method: 'Basit usul',
  second_hand: 'İkinci el',
}

function formatTRY(n: number) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency', currency: 'TRY',
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(n)
  } catch { return `${n.toFixed(2)} ₺` }
}

export default async function StopajPeriodDetail({
  params,
}: {
  params: Promise<{ year: string; month: string }>
}) {
  await requireAdmin('/vergi/stopaj')
  const { year, month } = await params
  const y = parseInt(year, 10)
  const m = parseInt(month, 10)
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) notFound()

  const supabase = createServiceRoleClient()

  const { data: period } = await (supabase as any)
    .from('withholding_periods')
    .select('*')
    .eq('year', y)
    .eq('month', m)
    .maybeSingle()

  if (!period) notFound()

  const { data: receipts } = await (supabase as any)
    .from('withholding_receipts')
    .select(`
      id, total_base_amount, total_withholding_amount, total_orders, receipt_number,
      store:store_id ( id, store_name, store_slug, tax_number, tax_office, company_name, taxpayer_type )
    `)
    .eq('period_id', period.id)
    .order('total_withholding_amount', { ascending: false })

  const list = (receipts ?? []) as any[]
  const monthName = MONTH_NAMES_TR[m]

  return (
    <div className="space-y-6">
      <Link
        href="/vergi/stopaj"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-orange-700"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Tüm dönemler
      </Link>

      <PageHeader
        title={`${monthName} ${y} — Stopaj`}
        description={`${period.total_orders} sipariş — ${formatTRY(Number(period.total_withholding_amount))} stopaj`}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant={STATUS_VARIANT[period.status] ?? 'default'} className="text-sm">
          {STATUS_LABEL[period.status] ?? period.status}
        </Badge>
        {period.submission_reference && (
          <span className="text-xs text-muted-foreground">
            GİB tahakkuk: <strong>{period.submission_reference}</strong>
          </span>
        )}
        {period.payment_reference && (
          <span className="text-xs text-muted-foreground">
            Ödeme ref: <strong>{period.payment_reference}</strong>
          </span>
        )}
        <PeriodStatusActions periodId={period.id} status={period.status} />
        <a
          href={`/api/vergi/stopaj/${y}/${String(m).padStart(2, '0')}/csv`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm bg-orange-600 text-white hover:bg-orange-700"
        >
          <Download className="h-4 w-4" /> GİB CSV indir
        </a>
        <a
          href={`/api/vergi/stopaj/${y}/${String(m).padStart(2, '0')}/csv?detailed=1`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm bg-white border hover:bg-gray-50"
        >
          <FileText className="h-4 w-4" /> Detaylı CSV (sipariş bazlı)
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Receipt} label="Matrah (KDV hariç toplam)" value={formatTRY(Number(period.total_base_amount))} />
        <StatCard icon={Receipt} label="Toplam stopaj (%1)" value={formatTRY(Number(period.total_withholding_amount))} />
        <StatCard icon={Receipt} label="Mağaza sayısı" value={String(list.length)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mağaza bazlı kırılım</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bu dönemde stopaj kesilen mağaza yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">Mağaza</th>
                    <th className="text-left py-3 px-4 font-medium">VKN/TCKN</th>
                    <th className="text-left py-3 px-4 font-medium">Mükellef tipi</th>
                    <th className="text-right py-3 px-4 font-medium">Sipariş</th>
                    <th className="text-right py-3 px-4 font-medium">Matrah</th>
                    <th className="text-right py-3 px-4 font-medium">Stopaj</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-orange-50/30">
                      <td className="py-3 px-4">
                        <Link
                          href={`/saticilar/${r.store?.id}`}
                          className="font-medium text-blue-700 hover:underline"
                        >
                          {r.store?.store_name ?? '—'}
                        </Link>
                        {r.store?.company_name && (
                          <div className="text-xs text-muted-foreground">{r.store.company_name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {r.store?.tax_number ?? '—'}
                        {r.store?.tax_office && (
                          <div className="text-muted-foreground">{r.store.tax_office}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {TAXPAYER_LABEL[r.store?.taxpayer_type] ?? r.store?.taxpayer_type ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-right">{r.total_orders}</td>
                      <td className="py-3 px-4 text-right">{formatTRY(Number(r.total_base_amount))}</td>
                      <td className="py-3 px-4 text-right font-semibold text-orange-700">
                        {formatTRY(Number(r.total_withholding_amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="py-3 px-4" colSpan={3}>TOPLAM</td>
                    <td className="py-3 px-4 text-right">
                      {list.reduce((a, r) => a + Number(r.total_orders), 0)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatTRY(list.reduce((a, r) => a + Number(r.total_base_amount), 0))}
                    </td>
                    <td className="py-3 px-4 text-right text-orange-700">
                      {formatTRY(list.reduce((a, r) => a + Number(r.total_withholding_amount), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
