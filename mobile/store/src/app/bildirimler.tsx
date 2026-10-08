import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { useNotifications, type AppNotification } from '@/lib/account'
import { supabase } from '@/lib/supabase'
import { Card, Empty, Loading, Muted, Screen } from '@/components/ui'
import { timeAgo } from '@/lib/format'
import { colors } from '@/lib/theme'

function open(n: AppNotification) {
  if (n.data?.order_id) router.push({ pathname: '/siparis/[id]', params: { id: String(n.data.order_id) } })
  else if (n.data?.product_id) router.push({ pathname: '/urun/[id]', params: { id: String(n.data.product_id) } })
}

export default function Notifications() {
  const { data, isLoading, refetch, isRefetching } = useNotifications()
  const qc = useQueryClient()

  // Ekran açılınca okunmamışları okundu say
  useEffect(() => {
    const ids = (data ?? []).filter((n) => !n.read_at).map((n) => n.id)
    if (!ids.length) return
    ;(supabase as any)
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
      .then(() => qc.invalidateQueries({ queryKey: ['notifications'] }))
  }, [data, qc])

  if (isLoading) return <Loading />
  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      {data?.length ? (
        data.map((n) => (
          <Card key={n.id} onPress={() => open(n)} style={!n.read_at ? { borderColor: colors.primary } : undefined}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ flex: 1, fontWeight: '700', color: colors.text }}>{n.title}</Text>
              <Muted>{timeAgo(n.created_at)}</Muted>
            </View>
            <Text style={{ color: colors.text }}>{n.body}</Text>
          </Card>
        ))
      ) : (
        <Empty text="Bildiriminiz yok" />
      )}
    </Screen>
  )
}
