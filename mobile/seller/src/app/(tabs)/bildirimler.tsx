import { useCallback } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import * as Notifications from 'expo-notifications'
import { markNotificationsRead, useNotifications, type AppNotification } from '@/lib/queries'
import { Card, Empty, Muted } from '@/components/ui'
import { timeAgo } from '@/lib/format'
import { colors, space } from '@/lib/theme'

function open(n: AppNotification) {
  if (n.data?.order_id) router.push({ pathname: '/siparis/[id]', params: { id: String(n.data.order_id) } })
}

export default function NotificationsTab() {
  const qc = useQueryClient()
  const { data = [], isFetching, refetch } = useNotifications()

  // Ekran açılınca okunmamışları okundu yap + uygulama rozetini sıfırla
  useFocusEffect(
    useCallback(() => {
      const unread = data.filter((n) => !n.read_at).map((n) => n.id)
      Notifications.setBadgeCountAsync(0).catch(() => {})
      if (unread.length === 0) return
      markNotificationsRead(unread).then(() => qc.invalidateQueries({ queryKey: ['notifications'] }))
    }, [data, qc])
  )

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space(4), gap: space(3) }}
      data={data}
      keyExtractor={(n) => n.id}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
      ListEmptyComponent={<Empty text="Henüz bildirim yok" />}
      renderItem={({ item: n }) => (
        <Card onPress={n.data?.order_id ? () => open(n) : undefined} style={!n.read_at ? { borderColor: colors.primary } : undefined}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space(2) }}>
            <Text style={{ fontWeight: '700', flex: 1 }}>{n.title}</Text>
            <Muted>{timeAgo(n.created_at)}</Muted>
          </View>
          <Text style={{ color: colors.text }}>{n.body}</Text>
        </Card>
      )}
    />
  )
}
