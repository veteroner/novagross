import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth'
import { supabase } from '@/lib/supabase'
import { Badge, Card, Empty, Loading, Muted, Screen } from '@/components/ui'
import { fmtDate, fmtTRY } from '@/lib/format'
import { space } from '@/lib/theme'

// İade talepleri admin tarafından onaylanır/reddedilir (web satıcı paneliyle aynı);
// satıcı burada durumu ve iade kargo bilgisini izler. RLS: is_store_member.
const STATUS: Record<string, { label: string; tone: 'warning' | 'primary' | 'success' | 'danger' | 'neutral' }> = {
  pending: { label: 'İnceleniyor', tone: 'warning' },
  approved: { label: 'Onaylandı', tone: 'primary' },
  refunded: { label: 'İade edildi', tone: 'success' },
  rejected: { label: 'Reddedildi', tone: 'danger' },
  cancelled: { label: 'Müşteri vazgeçti', tone: 'neutral' },
}

export default function Returns() {
  const { store } = useAuth()
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['returns', store?.storeId],
    enabled: !!store?.storeId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('return_requests')
        .select(
          'id, order_id, status, reason, reason_category, customer_note, refund_amount, rejection_reason, created_at, return_tracking_number, order_items(name, quantity), orders(order_number)'
        )
        .eq('store_id', store!.storeId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as any[]
    },
  })

  if (isLoading) return <Loading />
  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Muted>İade talepleri Novagross ekibi tarafından incelenir. Onaylanan iadelerde müşteri ürünü MNG ile geri gönderir.</Muted>
      {data?.length ? (
        data.map((r) => {
          const s = STATUS[r.status] ?? { label: r.status, tone: 'neutral' as const }
          return (
            <Card key={r.id} onPress={() => router.push({ pathname: '/siparis/[id]', params: { id: r.order_id } })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space(2) }}>
                <Text style={{ fontWeight: '700' }}>#{r.orders?.order_number}</Text>
                <Badge label={s.label} tone={s.tone} />
              </View>
              <Text numberOfLines={1}>
                {r.order_items?.quantity} × {r.order_items?.name}
              </Text>
              <Muted>
                {fmtDate(r.created_at)} · {r.reason || r.reason_category}
                {r.refund_amount ? ` · ${fmtTRY(r.refund_amount)}` : ''}
              </Muted>
              {r.customer_note ? <Muted>“{r.customer_note}”</Muted> : null}
              {r.return_tracking_number ? <Muted>İade kargo takip: {r.return_tracking_number}</Muted> : null}
              {r.rejection_reason ? <Muted>Red gerekçesi: {r.rejection_reason}</Muted> : null}
            </Card>
          )
        })
      ) : (
        <Empty text="İade talebi yok" />
      )}
    </Screen>
  )
}
