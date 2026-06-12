import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, Badge, PageHeader, StatCard } from '@novagross/ui'
import { ArrowLeft, Store as StoreIcon, Receipt, Wallet, Package } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { TaxEditor } from './tax-editor'
import { StoreInfoEditor } from './store-info-editor'

export const dynamic = 'force-dynamic'

const MONTH_NAMES_TR = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

const STORE_STATUS_LABEL: Record<string, string> = {
  active: 'Aktif',
  pending: 'Onay bekliyor',
  suspended: 'Askıda',
}
const STORE_STATUS_VARIANT: Record<string, any> = {
  active: 'success',
  pending: 'secondary',
  suspended: 'destructive',
}

function formatTRY(n: number) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency', currency: 'TRY',
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(n)
  } catch { return `${n.toFixed(2)} ₺` }
}

export default async function SellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin('/saticilar')
  const { id } = await params

  const supabase = createServiceRoleClient()

  const { data: store } = await (supabase as any)
    .from('stores')
    .select(`
      id, store_name, store_slug, status, created_at, commission_rate,
      company_name, tax_number, tax_office, taxpayer_type, kdv_rate,
      is_withholding_exempt, withholding_exempt_verified, withholding_exempt_verified_at,
      tradesman_certificate_url,
      email, phone, city, district, address, postal_code, iban, bank_name, account_holder,
      total_sales, total_revenue, rating, total_reviews,
      owner:owner_id ( id, email, first_name, last_name, phone )
    `)
    .eq('id', id)
    .maybeSingle()

  if (!store) notFound()

  // Muafiyet belgesi storage path olarak saklanır — görüntüleme için signed URL üret
  let certificateUrl: string | null = null
  if (store.tradesman_certificate_url) {
    if (String(store.tradesman_certificate_url).startsWith('http')) {
      certificateUrl = store.tradesman_certificate_url
    } else {
      const { data: signed } = await (supabase as any).storage
        .from('documents')
        .createSignedUrl(store.tradesman_certificate_url, 60 * 60)
      certificateUrl = signed?.signedUrl ?? null
    }
  }

  const [{ data: balance }, { data: receipts }, { count: productCount }] = await Promise.all([
    (supabase as any)
      .from('store_balance')
      .select('available_balance, pending_balance, total_withdrawn')
      .eq('store_id', id)
      .maybeSingle(),
    (supabase as any)
      .from('withholding_receipts')
      .select(`
        id, total_base_amount, total_withholding_amount, total_orders,
        period:period_id ( year, month, status )
      `)
      .eq('store_id', id)
      .order('created_at', { ascending: false })
      .limit(24),
    (supabase as any)
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', id),
  ])

  const receiptList = (receipts ?? []) as any[]
  const totalWithheld = receiptList.reduce(
    (a, r) => a + Number(r.total_withholding_amount || 0), 0
  )

  return (
    <div className="space-y-6">
      <Link
        href="/saticilar"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-orange-700"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Satıcılar
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <PageHeader
          title={store.store_name}
          description={`/${store.store_slug} — ${store.owner?.first_name ?? ''} ${store.owner?.last_name ?? ''} (${store.owner?.email ?? 'email yok'})`}
        />
        <Badge variant={STORE_STATUS_VARIANT[store.status] ?? 'default'} className="text-sm">
          {STORE_STATUS_LABEL[store.status] ?? store.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Ürün" value={String(productCount ?? 0)} />
        <StatCard icon={StoreIcon} label="Toplam satış" value={String(store.total_sales ?? 0)} />
        <StatCard
          icon={Wallet}
          label="Bekleyen bakiye"
          value={formatTRY(Number(balance?.pending_balance ?? 0))}
        />
        <StatCard icon={Receipt} label="Toplam kesilen stopaj" value={formatTRY(totalWithheld)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vergi bilgileri + muafiyet onayı */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Vergi Bilgileri & Stopaj
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TaxEditor
              storeId={store.id}
              initial={{
                taxpayerType: store.taxpayer_type ?? 'real_person',
                kdvRate: Number(store.kdv_rate ?? 20),
                taxNumber: store.tax_number ?? '',
                taxOffice: store.tax_office ?? '',
                isExempt: Boolean(store.is_withholding_exempt),
                exemptVerified: Boolean(store.withholding_exempt_verified),
                exemptVerifiedAt: store.withholding_exempt_verified_at,
                certificateUrl,
              }}
            />
          </CardContent>
        </Card>

        {/* İletişim & banka */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StoreIcon className="h-4 w-4" /> Mağaza Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StoreInfoEditor
              storeId={store.id}
              initial={{
                store_name: store.store_name,
                company_name: store.company_name,
                commission_rate: store.commission_rate,
                email: store.email,
                phone: store.phone,
                address: store.address,
                city: store.city,
                district: store.district,
                postal_code: store.postal_code,
                bank_name: store.bank_name,
                iban: store.iban,
                account_holder: store.account_holder,
              }}
            />
            <p className="text-xs text-muted-foreground mt-3">
              Kayıt tarihi: {new Date(store.created_at).toLocaleDateString('tr-TR')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stopaj geçmişi */}
      <Card>
        <CardHeader>
          <CardTitle>Aylık Stopaj Kesintileri</CardTitle>
        </CardHeader>
        <CardContent>
          {receiptList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bu mağazadan henüz stopaj kesilmedi.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">Dönem</th>
                    <th className="text-right py-3 px-4 font-medium">Sipariş</th>
                    <th className="text-right py-3 px-4 font-medium">Matrah (KDV hariç)</th>
                    <th className="text-right py-3 px-4 font-medium">Stopaj (%1)</th>
                    <th className="text-right py-3 px-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {receiptList.map((r: any) => (
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
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/vergi/stopaj/${r.period?.year}/${String(r.period?.month).padStart(2, '0')}`}
                          className="text-sm text-orange-700 hover:underline"
                        >
                          Dönem detayı
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
    </div>
  )
}
