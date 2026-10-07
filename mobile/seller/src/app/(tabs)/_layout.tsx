import { Tabs } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useNotifications, useOrders, needsShipping } from '@/lib/queries'
import { colors } from '@/lib/theme'

export default function TabsLayout() {
  const { data: orders } = useOrders()
  const { data: notifications } = useNotifications()
  const toShip = orders?.filter(needsShipping).length ?? 0
  const unread = notifications?.filter((n) => !n.read_at).length ?? 0

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Bugün', tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="siparisler"
        options={{
          title: 'Siparişler',
          tabBarBadge: toShip > 0 ? toShip : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="urunler"
        options={{ title: 'Ürünler', tabBarIcon: ({ color, size }) => <Ionicons name="pricetags-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="bildirimler"
        options={{
          title: 'Bildirimler',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="daha"
        options={{ title: 'Daha', tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" color={color} size={size} /> }}
      />
    </Tabs>
  )
}
