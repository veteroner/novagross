'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@novagross/ui'
import { TrendingUp, Clock, CheckCircle, Info, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Satıcı ödemeleri iyzico pazaryeri üzerinden yapılır: müşteri ödemesi iyzico'da
// korunur, teslimden 14 gün sonra (iade süresi) onaylanır ve satıcı tutarı
// doğrudan mağazanın iyzico'ya kayıtlı IBAN'ına gönderilir. Bu yüzden "para çek"
// yoktur; bu sayfa sipariş bazında hak edişleri gösterir.

interface SettlementRow {
  id: string
  name: string
  quantity: number
  total: number
  commission_amount: number | null
  commission_rate: number | null
  seller_amount: number | null
  withholding_amount: number | null
  iyzico_approval_status: string | null
  iyzico_approved_at: string | null
  orders: {
    order_number: string
    created_at: string
    delivered_at: string | null
    payment_status: string
    iyzico_cargo_deducted_amount: number | null
  } | null
}

// Satıcıya giden net: iyzico subMerchantPrice (seller_amount) - e-ticaret stopajı
const net = (r: { seller_amount: number | null; withholding_amount: number | null }) =>
  Number(r.seller_amount || 0) - Number(r.withholding_amount || 0)

const fmt = (n: number) => `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function EarningsPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<SettlementRow[]>([])

  useEffect(() => {
    fetchEarnings()
  }, [])

  const fetchEarnings = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const storeId = (await (supabase as any).rpc('get_my_store')).data?.[0]?.store_id
      if (!storeId) return

      const { data } = await (supabase as any)
        .from('order_items')
        .select(`
          id, name, quantity, total, commission_amount, commission_rate, seller_amount, withholding_amount,
          iyzico_approval_status, iyzico_approved_at,
          orders!inner ( order_number, created_at, delivered_at, payment_status, iyzico_cargo_deducted_amount )
        `)
        .eq('store_id', storeId)
        .eq('orders.payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(100)

      setRows((data || []) as SettlementRow[])
    } catch (error) {
      console.error('Failed to fetch earnings:', error)
    } finally {
      setLoading(false)
    }
  }

  const pending = rows
    .filter((r) => r.iyzico_approval_status !== 'approved')
    .reduce((a, r) => a + net(r), 0)
  const sent = rows
    .filter((r) => r.iyzico_approval_status === 'approved')
    .reduce((a, r) => a + net(r), 0)
  const commission = rows.reduce((a, r) => a + Number(r.commission_amount || 0), 0)
  const withholding = rows.reduce((a, r) => a + Number(r.withholding_amount || 0), 0)

  const statusBadge = (r: SettlementRow) => {
    if (r.iyzico_approval_status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          IBAN&apos;a gönderildi{r.iyzico_approved_at ? ` (${new Date(r.iyzico_approved_at).toLocaleDateString('tr-TR')})` : ''}
        </span>
      )
    }
    const delivered = r.orders?.delivered_at ? new Date(r.orders.delivered_at) : null
    const releaseDate = delivered ? new Date(delivered.getTime() + 14 * 24 * 60 * 60 * 1000) : null
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="w-3 h-3" />
        {releaseDate ? `Tahmini gönderim: ${releaseDate.toLocaleDateString('tr-TR')} sonrası` : 'Teslimat bekleniyor'}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Kazançlarım</h1>
        <p className="text-gray-600">Sipariş bazında hak edişleriniz ve ödeme durumları</p>
      </div>

      <Card className="mb-8 border-blue-200 bg-blue-50">
        <CardContent className="pt-6 flex gap-3 text-sm text-blue-900">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              Ödemeleriniz <strong>iyzico</strong> üzerinden otomatik yapılır; para çekme talebi oluşturmanıza gerek yoktur.
            </p>
            <p>
              Sipariş teslim edildikten sonra 14 günlük yasal iade süresi dolunca, komisyon, %1 e-ticaret stopajı (KDV hariç
              tutar üzerinden, 9284 sayılı CBK) ve gerçek kargo bedeli düşülerek
              kalan tutar mağazanızın iyzico&apos;ya kayıtlı IBAN&apos;ına gönderilir. Açık iade talebi olan siparişler iade
              sonuçlanana kadar bekletilir.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Gönderim Bekleyen</p>
                <p className="text-3xl font-bold text-orange-600">{fmt(pending)}</p>
                <p className="text-sm text-gray-500 mt-1">İade süresi / onay bekliyor</p>
              </div>
              <Clock className="w-12 h-12 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">IBAN&apos;a Gönderilen</p>
                <p className="text-3xl font-bold text-green-600">{fmt(sent)}</p>
                <p className="text-sm text-gray-500 mt-1">Son 100 sipariş kalemi</p>
              </div>
              <Send className="w-12 h-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Kesilen Komisyon</p>
                <p className="text-3xl font-bold text-purple-600">{fmt(commission)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  KDV hariç tutar üzerinden · Stopaj: {fmt(withholding)}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hak Ediş Detayı</CardTitle>
          <CardDescription>
            Gönderilen tutar kargo bedeli düşülmeden önceki değerdir; kargo bedeli gönderimden hemen önce düşülür.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Henüz ödenmiş sipariş yok</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold text-sm">Sipariş</th>
                    <th className="text-left p-3 font-semibold text-sm">Ürün</th>
                    <th className="text-right p-3 font-semibold text-sm">Satış</th>
                    <th className="text-right p-3 font-semibold text-sm">Komisyon</th>
                    <th className="text-right p-3 font-semibold text-sm">Stopaj (%1)</th>
                    <th className="text-right p-3 font-semibold text-sm">Hak ediş</th>
                    <th className="text-right p-3 font-semibold text-sm">Kargo kesintisi</th>
                    <th className="text-left p-3 font-semibold text-sm">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm">
                        <div className="font-mono">{r.orders?.order_number}</div>
                        <div className="text-xs text-gray-500">
                          {r.orders?.created_at ? new Date(r.orders.created_at).toLocaleDateString('tr-TR') : ''}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {r.name} {r.quantity > 1 ? `× ${r.quantity}` : ''}
                      </td>
                      <td className="p-3 text-sm text-right">{fmt(Number(r.total || 0))}</td>
                      <td className="p-3 text-sm text-right text-gray-600">
                        {fmt(Number(r.commission_amount || 0))}
                        {r.commission_rate != null ? <span className="text-xs"> (%{Number(r.commission_rate)})</span> : null}
                      </td>
                      <td className="p-3 text-sm text-right text-gray-600">
                        {Number(r.withholding_amount || 0) > 0 ? fmt(Number(r.withholding_amount)) : '-'}
                      </td>
                      <td className="p-3 text-sm text-right font-semibold">{fmt(net(r))}</td>
                      <td className="p-3 text-sm text-right text-gray-600">
                        {r.orders?.iyzico_cargo_deducted_amount ? `−${fmt(Number(r.orders.iyzico_cargo_deducted_amount))}` : '-'}
                      </td>
                      <td className="p-3">{statusBadge(r)}</td>
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
