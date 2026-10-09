import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as Notifications from 'expo-notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/providers/auth'
import { Loading } from '@/components/ui'
import { colors } from '@/lib/theme'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } })

// Bildirime dokunulunca (notify() data: order_id, product_id, ...)
function openFromNotification(data: Record<string, any> | undefined) {
  if (!data) return
  if (data.order_id) router.push({ pathname: '/siparis/[id]', params: { id: String(data.order_id) } })
  else if (data.product_id) router.push({ pathname: '/urun/[id]', params: { id: String(data.product_id) } })
  else router.push('/bildirimler')
}

function Navigator() {
  const { loading, session } = useAuth()
  const last = Notifications.useLastNotificationResponse()

  useEffect(() => {
    if (!session || !last) return
    openFromNotification(last.notification.request.content.data as any)
    queryClient.invalidateQueries()
  }, [session, last])

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => queryClient.invalidateQueries())
    return () => sub.remove()
  }, [])

  if (loading) return <Loading />
  const signedIn = !!session

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.bg },
        headerBackTitle: 'Geri',
      }}
    >
      {/* Herkese açık: gezinme */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="urun/[id]" options={{ title: '' }} />
      <Stack.Screen name="kategori/[id]" options={{ title: 'Kategori' }} />

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="giris" options={{ title: 'Giriş yap', presentation: 'modal' }} />
        <Stack.Screen name="kayit" options={{ title: 'Üye ol', presentation: 'modal' }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="odeme/index" options={{ title: 'Ödeme' }} />
        <Stack.Screen name="odeme/iyzico" options={{ title: 'Güvenli ödeme', headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="odeme/sonuc" options={{ title: 'Sipariş', headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="siparisler" options={{ title: 'Siparişlerim' }} />
        <Stack.Screen name="siparis/[id]" options={{ title: 'Sipariş' }} />
        <Stack.Screen name="adresler" options={{ title: 'Adreslerim' }} />
        <Stack.Screen name="adres-yeni" options={{ title: 'Yeni adres', presentation: 'modal' }} />
        <Stack.Screen name="bildirimler" options={{ title: 'Bildirimler' }} />
        <Stack.Screen name="bildirim-ayarlari" options={{ title: 'Bildirim ayarları' }} />
        <Stack.Screen name="profil" options={{ title: 'Profilim' }} />
        <Stack.Screen name="iade/[itemId]" options={{ title: 'İade talebi', presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Navigator />
      </AuthProvider>
    </QueryClientProvider>
  )
}
