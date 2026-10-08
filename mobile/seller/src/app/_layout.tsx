import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Notifications from 'expo-notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/providers/auth'
import { Loading } from '@/components/ui'
import { colors } from '@/lib/theme'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

// Bildirime dokunulunca ilgili ekran (data notify()'dan gelir: type, order_id, ...)
function openFromNotification(data: Record<string, any> | undefined) {
  if (!data) return
  if (data.order_id) router.push({ pathname: '/siparis/[id]', params: { id: String(data.order_id) } })
  else router.push('/bildirimler')
}

function useNotificationTaps(enabled: boolean) {
  const last = Notifications.useLastNotificationResponse()
  useEffect(() => {
    if (!enabled || !last) return
    openFromNotification(last.notification.request.content.data as any)
    queryClient.invalidateQueries()
  }, [enabled, last])

  useEffect(() => {
    // Uygulama açıkken gelen bildirim: listeleri tazele
    const sub = Notifications.addNotificationReceivedListener(() => queryClient.invalidateQueries())
    return () => sub.remove()
  }, [])
}

function RootNavigator() {
  const { loading, session, store, twoFactor } = useAuth()
  const hasStore = !!session && !!store
  const signedIn = hasStore && twoFactor === 'ok'
  const needsCode = hasStore && twoFactor === 'required'
  useNotificationTaps(signedIn)

  if (loading || (hasStore && twoFactor === 'checking')) return <Loading />

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.bg },
        headerBackTitle: 'Geri',
      }}
    >
      <Stack.Protected guard={!hasStore}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={needsCode}>
        <Stack.Screen name="dogrulama" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="siparis/[id]" options={{ title: 'Sipariş' }} />
        <Stack.Screen name="bildirim-ayarlari" options={{ title: 'Bildirim ayarları' }} />
        <Stack.Screen name="urun/[id]" options={{ title: 'Ürün' }} />
        <Stack.Screen name="urun/yeni" options={{ title: 'Yeni ürün', presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  )
}
