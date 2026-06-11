import { Card, CardContent, CardHeader, CardTitle, Badge, PageHeader, StatCard, EmptyState } from '@novagross/ui'
import { Receipt, FileText, Info, Settings } from 'lucide-react'
import { requireSeller } from '@/lib/auth/requireSeller'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { TaxSettings } from './tax-settings'

export const dynamic = 'force-dynamic'

const MONTH_NAMES_TR = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

function formatTRY(n: number) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency', currency: 'TRY',
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(n)
  } catch { return `${n.toFixed(2)} ₺` }
}

export default async function SellerTaxPage() {
  const { storeId } = await requireSeller('/vergi')

  // withholding_periods RLS admin-only olduğundan period bilgisi (yıl/ay)
  // server-side service client ile çekilir; receipts zaten storeId filtreli.
  const service = createServiceRoleClient()

  const [{ data: receipts }, { data: store }, { data: invoices }] = await Promise.all([
    (service as any)
      .from('withholding_receipts')
      .select(`
        id, total_base_amount, total_withholding_amount, total_orders, receipt_number,
        period:period_id ( year, month, status )
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(36),
    (service as any)
      .from('stores')
      .select('is_withholding_exempt, withholding_exempt_verified, taxpayer_type, kdv_rate, tax_number, tax_office, tradesman_certificate_url')
      .eq('id', storeId)
      .maybeSingle(),
    (service as any)
      .from('commission_invoices')
      .select('id, year, month, invoice_number, commission_amount, kdv_amount, total_amount, total_orders, issued_at')
      .eq('store_id', storeId)
      .eq('status', 'issued')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(36),
  ])

  // Mevcut muafiyet belgesi için kısa ömürlü signed URL (documents bucket private)
  let certificateSignedUrl: string | null = null
  if (store?.tradesman_certificate_url) {
    if (String(store.tradesman_certificate_url).startsWith('http')) {
      certificateSignedUrl = store.tradesman_certificate_url
    } else {
      const { data: signed } = await (service as any).storage
        .from('documents')
        .createSignedUrl(store.tradesman_certificate_url, 60 * 60)
      certificateSignedUrl = signed?.signedUrl ?? null
    }
  }

  const list = (receipts ?? []) as any[]
  const invoiceList = (invoices ?? []) as any[]
  const currentYear = new Date().getFullYear()
  const totalThisYear = list
    .filter((r) => r.period?.year === currentYear)
    .reduce((a, r) => a + Number(r.total_withholding_amount || 0), 0)
  const totalAll = list.reduce((a, r) => a + Number(r.total_withholding_amount || 0), 0)
  const isExemptActive = Boolean(store?.is_withholding_exempt && store?.withholding_exempt_verified)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vergi & Stopaj"
        description="7524 sayılı Kanun gereği e-ticaret ödemelerinden %1 gelir/kurumlar vergisi stopajı kesilir. Kesintiler GİB'e platform tarafından beyan edilip ödenir; bu tutarları kendi beyannamenizde mahsup edebilirsiniz."
      />

      {isExemptActive && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6 text-sm text-green-900">
            ✅ Esnaf muafiyeti onaylı — satışlarınızdan stopaj kesilmiyor.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Receipt}
          label={`Bu yıl (${currentYear}) kesilen stopaj`}
          value={formatTRY(totalThisYear)}
        />
        <StatCard icon={Receipt} label="Toplam kesilen stopaj" value={formatTRY(totalAll)} />
        <StatCard
          icon={FileText}
          label="KDV oranınız"
          value={`%${Number(store?.kdv_rate ?? 20)}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aylık Kesintilerim</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Henüz stopaj kesintisi yok"
              description="İlk satışınız tamamlandığında aylık kesinti özeti burada görünür."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">Dönem</th>
                    <th className="text-right py-3 px-4 font-medium">Sipariş</th>
                    <th className="text-right py-3 px-4 font-medium">Matrah (KDV hariç)</th>
                    <th className="text-right py-3 px-4 font-medium">Kesilen Stopaj (%1)</th>
                    <th className="text-left py-3 px-4 font-medium">Beyan Durumu</th>
                    <th className="text-right py-3 px-4 font-medium">Belge</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r: any) => {
                    const submitted = r.period?.status === 'submitted' || r.period?.status === 'paid' || r.period?.status === 'closed'
                    return (
                      <tr key={r.id} className="border-b hover:bg-orange-50/30">
                        <td className="py-3 px-4 font-medium">
                          {MONTH_NAMES_TR[r.period?.month]} {r.period?.year}
                        </td>
                        <td className="py-3 px-4 text-right">{r.total_orders}</td>
                        <td className="py-3 px-4 text-right">
                          {formatTRY(Number(r.total_base_amount))}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-orange-700">
                          {formatTRY(Number(r.total_withholding_amount))}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={submitted ? 'success' : 'default'}>
                            {submitted ? 'GİB\'e beyan edildi' : 'Dönem açık'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={`/api/vergi/makbuz/${r.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-orange-700 hover:underline"
                          >
                            <FileText className="h-3 w-3" />
                            Tevkifat belgesi
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Komisyon Faturalarım</CardTitle>
        </CardHeader>
        <CardContent>
          {invoiceList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Henüz kesilmiş komisyon faturası yok. Faturalar her ay platform tarafından kesilir.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">Fatura No</th>
                    <th className="text-left py-3 px-4 font-medium">Dönem</th>
                    <th className="text-right py-3 px-4 font-medium">Komisyon</th>
                    <th className="text-right py-3 px-4 font-medium">KDV</th>
                    <th className="text-right py-3 px-4 font-medium">Toplam</th>
                    <th className="text-right py-3 px-4 font-medium">Belge</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceList.map((inv: any) => (
                    <tr key={inv.id} className="border-b hover:bg-orange-50/30">
                      <td className="py-3 px-4 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="py-3 px-4">
                        {MONTH_NAMES_TR[inv.month]} {inv.year}
                      </td>
                      <td className="py-3 px-4 text-right">{formatTRY(Number(inv.commission_amount))}</td>
                      <td className="py-3 px-4 text-right">{formatTRY(Number(inv.kdv_amount))}</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {formatTRY(Number(inv.total_amount))}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href={`/api/vergi/fatura/${inv.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-orange-700 hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          Görüntüle / PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Vergi Bilgilerim
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TaxSettings
            storeId={storeId}
            initial={{
              taxpayerType: store?.taxpayer_type ?? 'real_person',
              kdvRate: Number(store?.kdv_rate ?? 20),
              taxNumber: store?.tax_number ?? '',
              taxOffice: store?.tax_office ?? '',
              isExempt: Boolean(store?.is_withholding_exempt),
              exemptVerified: Boolean(store?.withholding_exempt_verified),
              certificateSignedUrl,
              hasCertificate: Boolean(store?.tradesman_certificate_url),
            }}
          />
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6 text-sm text-blue-900 space-y-2">
          <p className="font-semibold flex items-center gap-2">
            <Info className="h-4 w-4" /> Stopaj nedir, nasıl mahsup edilir?
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>1 Ocak 2025&apos;ten itibaren e-ticaret platformları, satıcılara yaptıkları ödemelerden <strong>%1 stopaj</strong> kesmekle yükümlüdür (7524 sayılı Kanun).</li>
            <li>Matrah, <strong>KDV hariç satış tutarıdır</strong>; komisyon matrahtan düşülmez.</li>
            <li>Kesilen tutarlar platform tarafından aylık <strong>Muhtasar Beyanname</strong> ile GİB&apos;e beyan edilir ve ödenir.</li>
            <li>Bu kesintileri kendi <strong>geçici vergi / yıllık gelir-kurumlar vergisi beyannamenizde mahsup</strong> edebilirsiniz. Tevkifat belgelerini muhasebecinizle paylaşın.</li>
            <li>Esnaf muaflığı belgeniz varsa yukarıdaki <strong>Vergi Bilgilerim</strong> bölümünden yükleyin; admin onayından sonra stopaj kesilmez.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
