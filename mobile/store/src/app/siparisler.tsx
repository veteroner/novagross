import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { useOrders } from '@/lib/account'
import { Badge, Card, Empty, Loading, Muted, Screen } from '@/components/ui'
import { ORDER_STATUS, fmtDate, fmtTRY, orderStatusTone } from '@/lib/format'
import { colors } from '@/lib/theme'

export default function Orders() {
  const { data, isLoading, refetch, isRefetching } = useOrders()
  if (isLoading) return <Loading />
  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      {data?.length ? (
        data.map((o) => (
          <Card key={o.id} onPress={() => router.push({ pathname: '/siparis/[id]', params: { id: o.id } })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', color: colors.text }}>#{o.order_number}</Text>
              <Badge label={ORDER_STATUS[o.status] ?? o.status} tone={orderStatusTone(o.status)} />
            </View>
            <Muted>
              {fmtDate(o.created_at)} · {o.items.length} ürün
            </Muted>
            <Text numberOfLines={1} style={{ color: colors.text }}>
              {o.items.map((i) => i.name).join(', ')}
            </Text>
            <Text style={{ fontWeight: '700', color: colors.text }}>{fmtTRY(o.total)}</Text>
          </Card>
        ))
      ) : (
        <Empty text="Henüz siparişiniz yok" />
      )}
    </Screen>
  )
}
