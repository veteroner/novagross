import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Badge, PageHeader, StatCard } from '@novagross/ui'
import { Receipt, Calendar, Download, AlertCircle } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'

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

function formatTRY(n: number) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency', currency: 'TRY',
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(n)
  } catch { return `${n.toFixed(2)} ₺` }
}

export default async function StopajIndex() {
  await requireAdmin('/vergi/stopaj')
  const supabase = createServiceRoleClient()

  const { data: periods } = await (supabase as any)
    .from('withholding_periods')
    .select('id, year, month, total_base_amount, total_withholding_amount, total_orders, status, submitted_at, paid_at')
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  const list = (periods ?? []) as any[]
  const totalThisYear = list
    .filter((p) => p.year === new Date().getFullYear())
    .reduce((acc, p) => acc + Number(p.total_withholding_amount || 0), 0)
  const openPending = list.filter((p) => p.status === 'open').reduce((a, p) => a + Number(p.total_withholding_amount || 0), 0)
  const submittedNotPaid = list.filter((p) => p.status === 'submitted').reduce((a, p) => a + Number(p.total_withholding_amount || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gelir Vergisi Stopajı (%1)"
        description="7524 sayılı Kanun + 23.12.2024/157 GİB Tebliği uyarınca aylık tevkifat dönemleri. Her ayın 26'sına kadar Muhtasar ve Prim Hizmet Beyannamesi verilmeli ve ödenmelidir."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Receipt}
          label={`Bu yıl (${new Date().getFullYear()}) toplam stopaj`}
          value={formatTRY(totalThisYear)}
        />
        <StatCard
          icon={AlertCircle}
          label="Açık dönemler (henüz beyan yok)"
          value={formatTRY(openPending)}
        />
        <StatCard
          icon={Calendar}
          label="Beyan verildi, ödeme bekliyor"
          value={formatTRY(submittedNotPaid)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aylık Beyan Dönemleri</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Henüz stopaj kesilen bir dönem yok. İlk paid sipariş geldiğinde otomatik açılır.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">Dönem</th>
                    <th className="text-right py-3 px-4 font-medium">Matrah</th>
                    <th className="text-right py-3 px-4 font-medium">Stopaj (%1)</th>
                    <th className="text-right py-3 px-4 font-medium">Sipariş</th>
                    <th className="text-left py-3 px-4 font-medium">Durum</th>
                    <th className="text-right py-3 px-4 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-orange-50/30">
                      <td className="py-3 px-4 font-medium">
                        {MONTH_NAMES_TR[p.month]} {p.year}
                      </td>
                      <td className="py-3 px-4 text-right">{formatTRY(Number(p.total_base_amount))}</td>
                      <td className="py-3 px-4 text-right font-semibold text-orange-700">
                        {formatTRY(Number(p.total_withholding_amount))}
                      </td>
                      <td className="py-3 px-4 text-right">{p.total_orders}</td>
                      <td className="py-3 px-4">
                        <Badge variant={STATUS_VARIANT[p.status] ?? 'default'}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/vergi/stopaj/${p.year}/${String(p.month).padStart(2, '0')}`}
                          className="inline-flex items-center gap-1 text-sm text-orange-700 hover:underline"
                        >
                          Detay & CSV
                          <Download className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6 text-sm text-blue-900 space-y-2">
          <p className="font-semibold">📋 Beyan ve ödeme süreci:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Her ay <strong>26'sına kadar</strong> ilgili dönemin detayına gir, <strong>GİB CSV</strong> indir.</li>
            <li>GİB Interaktif Vergi Dairesi → Muhtasar ve Prim Hizmet Beyannamesi'ne yükle / muhasebecine ilet.</li>
            <li>Beyan verilince burada <em>"Beyan verildi"</em> işaretle (tahakkuk numarasını gir).</li>
            <li>Aynı gün GİB'e ödeme yap → <em>"Ödendi"</em> işaretle (dekont referansı).</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
