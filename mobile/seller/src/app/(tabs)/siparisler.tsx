import { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useOrders, needsInvoice, needsShipping, type SellerOrder } from '@/lib/queries'
import { Badge, Card, Empty, Muted } from '@/components/ui'
import { OrderBadge } from '@/components/order-badge'
import { fmtTRY, fmtDate } from '@/lib/format'
import { colors, space } from '@/lib/theme'

const FILTERS = [
  { key: 'ship', label: 'Kargolanacak', fn: needsShipping },
  { key: 'transit', label: 'Kargoda', fn: (o: SellerOrder) => !!o.shipment && !['delivered', 'returned'].includes(o.shipment.status) },
  { key: 'done', label: 'Teslim', fn: (o: SellerOrder) => o.shipment?.status === 'delivered' || o.status === 'delivered' },
  { key: 'all', label: 'Tümü', fn: () => true },
] as const

export default function Orders() {
  const { data: orders = [], isFetching, refetch } = useOrders()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('ship')
  const list = useMemo(() => orders.filter(FILTERS.find((f) => f.key === filter)!.fn), [orders, filter])

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(4), gap: space(3) }}
      data={list}
      keyExtractor={(o) => o.id}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
      ListHeaderComponent={
        <View style={{ flexDirection: 'row', gap: space(2), flexWrap: 'wrap' }}>
          {FILTERS.map((f) => {
            const active = f.key === filter
            const count = orders.filter(f.fn).length
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? colors.primary : '#fff',
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>
                  {f.label} {count > 0 ? `(${count})` : ''}
                </Text>
              </Pressable>
            )
          })}
        </View>
      }
      ListEmptyComponent={<Empty text="Bu filtrede sipariş yok" />}
      renderItem={({ item: o }) => (
        <Card onPress={() => router.push({ pathname: '/siparis/[id]', params: { id: o.id } })}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: 15 }}>#{o.order_number}</Text>
            <OrderBadge o={o} />
          </View>
          <Muted>
            {o.items[0]?.name}
            {o.items.length > 1 ? ` +${o.items.length - 1} ürün` : ''}
          </Muted>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted>
              {fmtDate(o.created_at, true)} · {o.shipping_address?.city ?? ''}
            </Muted>
            <Text style={{ fontWeight: '700' }}>{fmtTRY(o.total)}</Text>
          </View>
          {needsInvoice(o) ? <Badge label="Fatura yüklenmedi" tone="warning" /> : null}
        </Card>
      )}
    />
  )
}
