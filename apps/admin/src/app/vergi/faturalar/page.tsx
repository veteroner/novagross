import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Badge, PageHeader, StatCard } from '@novagross/ui'
import { FileText, Receipt, Send } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { GenerateInvoicesForm, InvoiceRowActions } from './invoice-actions'

export const dynamic = 'force-dynamic'

const MONTH_NAMES_TR = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const STATUS_LABEL: Record<string, string> = {
  draft: 'Taslak',
  issued: 'Kesildi',
  cancelled: 'İptal',
}
const STATUS_VARIANT: Record<string, any> = {
  draft: 'default',
  issued: 'success',
  cancelled: 'destructive',
}

const EARSIV_LABEL: Record<string, string> = {
  none: '—',
  pending: 'Bekliyor',
  sent: 'Gönderildi',
  failed: 'HATA',
}

function formatTRY(n: number) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency', currency: 'TRY',
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(n)
  } catch { return `${n.toFixed(2)} ₺` }
}

export default async function CommissionInvoicesPage() {
  await requireAdmin('/vergi/faturalar')
  const supabase = createServiceRoleClient()

  const { data } = await (supabase as any)
    .from('commission_invoices')
    .select(`
      id, year, month, invoice_number, commission_base, commission_amount,
      kdv_rate, kdv_amount, total_amount, total_orders, status,
      issued_at, earsiv_status, earsiv_uuid, earsiv_error,
      store:store_id ( id, store_name, company_name, tax_number )
    `)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .order('invoice_number', { ascending: true })
    .limit(500)

  const list = (data ?? []) as any[]
  const draftCount = list.filter((i) => i.status === 'draft').length
  const issuedTotal = list
    .filter((i) => i.status === 'issued')
    .reduce((a, i) => a + Number(i.total_amount || 0), 0)
  const earsivFailed = list.filter((i) => i.earsiv_status === 'failed').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Komisyon Faturaları"
        description="Satıcılara kesilen aylık pazaryeri komisyon faturaları (komisyon + %20 KDV). Dönem kapandıktan sonra oluştur, kontrol et, kes."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={FileText} label="Taslak (kesilmeyi bekleyen)" value={String(draftCount)} />
        <StatCard icon={Receipt} label="Kesilen toplam (KDV dahil)" value={formatTRY(issuedTotal)} />
        <StatCard icon={Send} label="E-arşiv hatası" value={String(earsivFailed)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dönem faturası oluştur</CardTitle>
        </CardHeader>
        <CardContent>
          <GenerateInvoicesForm />
          <p className="text-xs text-muted-foreground mt-2">
            Seçilen aydaki tamamlanmış siparişlerin komisyonları mağaza bazında toplanır ve taslak fatura oluşturulur.
            Var olan faturalar atlanır (idempotent).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Faturalar</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Henüz fatura yok. Yukarıdan dönem seçip oluşturun.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">Fatura No</th>
                    <th className="text-left py-3 px-4 font-medium">Dönem</th>
                    <th className="text-left py-3 px-4 font-medium">Mağaza</th>
                    <th className="text-right py-3 px-4 font-medium">Komisyon</th>
                    <th className="text-right py-3 px-4 font-medium">KDV</th>
                    <th className="text-right py-3 px-4 font-medium">Toplam</th>
                    <th className="text-left py-3 px-4 font-medium">Durum</th>
                    <th className="text-left py-3 px-4 font-medium">E-Arşiv</th>
                    <th className="text-right py-3 px-4 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((inv: any) => (
                    <tr key={inv.id} className="border-b hover:bg-orange-50/30">
                      <td className="py-3 px-4 font-mono text-xs">
                        <a
                          href={`/api/vergi/faturalar/${inv.id}/html`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:underline"
                        >
                          {inv.invoice_number ?? '—'}
                        </a>
                      </td>
                      <td className="py-3 px-4">
                        {MONTH_NAMES_TR[inv.month]} {inv.year}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/saticilar/${inv.store?.id}`}
                          className="font-medium text-blue-700 hover:underline"
                        >
                          {inv.store?.store_name ?? '—'}
                        </Link>
                        {inv.store?.tax_number && (
                          <div className="text-xs text-muted-foreground font-mono">
                            {inv.store.tax_number}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">{formatTRY(Number(inv.commission_amount))}</td>
                      <td className="py-3 px-4 text-right">{formatTRY(Number(inv.kdv_amount))}</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {formatTRY(Number(inv.total_amount))}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={STATUS_VARIANT[inv.status] ?? 'default'}>
                          {STATUS_LABEL[inv.status] ?? inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className={inv.earsiv_status === 'failed' ? 'text-red-600 font-semibold' : ''}>
                          {EARSIV_LABEL[inv.earsiv_status] ?? inv.earsiv_status}
                        </span>
                        {inv.earsiv_error && (
                          <div className="text-red-500">{inv.earsiv_error}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <InvoiceRowActions invoiceId={inv.id} status={inv.status} />
                      </td>
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
