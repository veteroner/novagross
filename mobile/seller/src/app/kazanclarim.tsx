import { Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth'
import { supabase } from '@/lib/supabase'
import { Badge, Card, Empty, Loading, Muted, Row, Screen, Title } from '@/components/ui'
import { fmtDate, fmtTRY } from '@/lib/format'
import { colors, space } from '@/lib/theme'

// Web satıcı paneli /kazanclarim ile aynı hesap: satıcıya giden net =
// iyzico subMerchantPrice (seller_amount) − %1 e-ticaret stopajı. Para çekme yok —
// iade süresi (teslim + 14 gün) dolunca iyzico IBAN'a otomatik gönderir.
type Row = {
  id: string
  name: string
  quantity: number
  total: number
  commission_amount: number | null
  seller_amount: number | null
  withholding_amount: number | null
  iyzico_approval_status: string | null
  iyzico_approved_at: string | null
  orders: { order_number: string; created_at: string; delivered_at: string | null; iyzico_cargo_deducted_amount: number | null } | null
}

const net = (r: Row) => Number(r.seller_amount || 0) - Number(r.withholding_amount || 0)

export default function Earnings() {
  const { store } = useAuth()
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['earnings', store?.storeId],
    enabled: !!store?.storeId,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await (supabase as any)
        .from('order_items')
        .select(
          `id, name, quantity, total, commission_amount, seller_amount, withholding_amount, iyzico_approval_status, iyzico_approved_at,
           orders!inner ( order_number, created_at, delivered_at, payment_status, iyzico_cargo_deducted_amount )`
        )
        .eq('store_id', store!.storeId)
        .eq('orders.payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data ?? []
    },
  })

  if (isLoading) return <Loading />
  const rows = data ?? []
  const pending = rows.filter((r) => r.iyzico_approval_status !== 'approved').reduce((s, r) => s + net(r), 0)
  const sent = rows.filter((r) => r.iyzico_approval_status === 'approved').reduce((s, r) => s + net(r), 0)
  const commission = rows.reduce((s, r) => s + Number(r.commission_amount || 0), 0)
  const withholding = rows.reduce((s, r) => s + Number(r.withholding_amount || 0), 0)

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <View style={{ flexDirection: 'row', gap: space(3) }}>
        <Card style={{ flex: 1 }}>
          <Muted>Bekleyen</Muted>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.warning }}>{fmtTRY(pending)}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Muted>IBAN'a gönderilen</Muted>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.success }}>{fmtTRY(sent)}</Text>
        </Card>
      </View>
      <Card>
        <Row label="Komisyon (KDV hariç)" value={fmtTRY(commission)} />
        <Row label="E-ticaret stopajı (%1)" value={fmtTRY(withholding)} />
        <Muted>
          Ödemeler iyzico üzerinden otomatik yapılır. Teslimden sonra 14 günlük iade süresi dolunca komisyon, stopaj ve
          gerçek kargo bedeli düşülerek kalan tutar IBAN'ınıza gönderilir.
        </Muted>
      </Card>

      <Title>Sipariş bazında</Title>
      {rows.length === 0 ? <Empty text="Henüz ödenmiş sipariş yok" /> : null}
      {rows.map((r) => {
        const approved = r.iyzico_approval_status === 'approved'
        const delivered = r.orders?.delivered_at ? new Date(r.orders.delivered_at) : null
        const release = delivered ? new Date(delivered.getTime() + 14 * 86400000) : null
        return (
          <Card key={r.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space(2) }}>
              <Text style={{ fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
                #{r.orders?.order_number} · {r.quantity} × {r.name}
              </Text>
              <Text style={{ fontWeight: '800' }}>{fmtTRY(net(r))}</Text>
            </View>
            <Muted>
              Satış {fmtTRY(r.total)} · komisyon {fmtTRY(r.commission_amount || 0)}
              {Number(r.withholding_amount) ? ` · stopaj ${fmtTRY(r.withholding_amount!)}` : ''}
              {Number(r.orders?.iyzico_cargo_deducted_amount) ? ` · kargo ${fmtTRY(r.orders!.iyzico_cargo_deducted_amount!)}` : ''}
            </Muted>
            <Badge
              tone={approved ? 'success' : 'warning'}
              label={
                approved
                  ? `IBAN'a gönderildi${r.iyzico_approved_at ? ` · ${fmtDate(r.iyzico_approved_at)}` : ''}`
                  : release
                    ? `Tahmini gönderim: ${fmtDate(release.toISOString())} sonrası`
                    : 'Teslimat bekleniyor'
              }
            />
          </Card>
        )
      })}
    </Screen>
  )
}
