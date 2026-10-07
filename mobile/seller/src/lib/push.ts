import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from './supabase'

// Uygulama ön plandayken de bildirimi göster
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Android kanalları — admin /api/push/dispatch CHANNEL_BY_TYPE ile aynı id'ler
async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('orders', {
    name: 'Yeni siparişler',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 200, 300],
    lightColor: '#EA580C',
    sound: 'default',
  })
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Genel',
    importance: Notifications.AndroidImportance.DEFAULT,
  })
}

let registeredToken: string | null = null

/** İzin ister, Expo push token'ı alır ve push_devices'a kaydeder. Hata fırlatmaz. */
export async function registerForPush(): Promise<{ ok: boolean; reason?: string }> {
  try {
    await ensureAndroidChannels()
    if (!Device.isDevice && Platform.OS === 'android') {
      return { ok: false, reason: 'Android emülatöründe Google Play servisleri gerekli' }
    }

    let { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status
    if (status !== 'granted') return { ok: false, reason: 'Bildirim izni verilmedi' }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
    if (!projectId) return { ok: false, reason: 'EAS projectId tanımlı değil (eas init gerekli)' }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
    const { error } = await supabase.rpc('register_push_device', {
      p_app: 'seller',
      p_token: token,
      p_platform: Platform.OS,
      p_device_name: Device.deviceName ?? Device.modelName ?? null,
      p_app_version: Constants.expoConfig?.version ?? null,
    })
    if (error) return { ok: false, reason: error.message }
    registeredToken = token
    return { ok: true }
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'Push kaydı başarısız' }
  }
}

/** Çıkışta: bu cihaz artık bu kullanıcıya bildirim almasın */
export async function unregisterPush() {
  if (!registeredToken) return
  try {
    await supabase.rpc('unregister_push_device', { p_token: registeredToken })
  } catch {
    // sessiz
  }
  registeredToken = null
}
