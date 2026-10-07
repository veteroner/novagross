import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/providers/auth'
import { useOrders, needsInvoice, needsShipping, type SellerOrder } from '@/lib/queries'
import { Badge, Card, Empty, Muted, Screen, Title } from '@/components/ui'
import { fmtTRY, timeAgo } from '@/lib/format'
import { colors, space } from '@/lib/theme'

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <Card style={{ flex: 1 }}>
      <Muted>{label}</Muted>
      <Text style={{ fontSize: 24, fontWeight: '800', color: tone ?? colors.text }}>{value}</Text>
    </Card>
  )
}

function OrderLine({ o }: { o: SellerOrder }) {
  return (
    <Card onPress={() => router.push({ pathname: '/siparis/[id]', params: { id: o.id } })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontWeight: '700' }}>#{o.order_number}</Text>
        <Text style={{ fontWeight: '700' }}>{fmtTRY(o.total)}</Text>
      </View>
      <Muted>
        {o.items[0]?.name}
        {o.items.length > 1 ? ` +${o.items.length - 1} ürün` : ''} · {timeAgo(o.created_at)}
      </Muted>
    </Card>
  )
}

export default function Today() {
  const { store } = useAuth()
  const { data: orders = [], isFetching, refetch } = useOrders()

  const today = new Date().toDateString()
  const todays = orders.filter((o) => new Date(o.created_at).toDateString() === today)
  const toShip = orders.filter(needsShipping)
  const toInvoice = orders.filter(needsInvoice)

  return (
    <Screen refreshing={isFetching} onRefresh={refetch}>
      <View>
        <Muted>Merhaba 👋</Muted>
        <Title>{store?.storeName}</Title>
      </View>

      <View style={{ flexDirection: 'row', gap: space(3) }}>
        <Stat label="Bugünkü sipariş" value={todays.length} />
        <Stat label="Bugünkü ciro" value={fmtTRY(todays.reduce((a, o) => a + o.total, 0))} />
      </View>
      <View style={{ flexDirection: 'row', gap: space(3) }}>
        <Stat label="Kargolanacak" value={toShip.length} tone={toShip.length ? colors.primary : undefined} />
        <Stat label="Fatura bekleyen" value={toInvoice.length} tone={toInvoice.length ? colors.warning : undefined} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2), marginTop: space(2) }}>
        <Title>Kargolanacak siparişler</Title>
        {toShip.length > 0 ? <Badge label={String(toShip.length)} tone="primary" /> : null}
      </View>
      {toShip.length === 0 ? <Empty text="Kargolanacak sipariş yok 🎉" /> : toShip.map((o) => <OrderLine key={o.id} o={o} />)}

      {toInvoice.length > 0 ? (
        <>
          <Title>Fatura yüklenecek</Title>
          {toInvoice.map((o) => (
            <OrderLine key={o.id} o={o} />
          ))}
        </>
      ) : null}
    </Screen>
  )
}
