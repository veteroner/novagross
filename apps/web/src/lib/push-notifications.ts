/**
 * Push Notification Utilities
 * 
 * Handles browser push notification subscriptions and management
 * Uses Web Push API with service workers
 */

/**
 * Check if push notifications are supported in the browser
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isPushNotificationSupported()) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    return 'denied'
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return 'denied'
  }
}

/**
 * Convert base64 VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Subscribe to push notifications
 * 
 * @param vapidPublicKey - VAPID public key from environment variable
 * @returns PushSubscription object or null if failed
 */
export async function subscribeToPushNotifications(
  vapidPublicKey?: string
): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications not supported')
    return null
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      return existingSubscription
    }

    // Subscribe to push notifications
    const publicKey = vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    
    if (!publicKey) {
      console.warn('VAPID public key not found. Using default subscription.')
      // For demo purposes, create subscription without VAPID key
      // In production, you MUST use VAPID keys
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
      })
      return subscription
    }

    const applicationServerKey = urlBase64ToUint8Array(publicKey)
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    })

    return subscription
  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    return null
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      return true
    }
    return false
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    return false
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch (error) {
    console.error('Error getting push subscription:', error)
    return null
  }
}

/**
 * Check if user is currently subscribed
 */
export async function isPushSubscribed(): Promise<boolean> {
  const subscription = await getPushSubscription()
  return subscription !== null
}

/**
 * Send test notification (local, not push)
 */
export async function sendTestNotification(
  title: string = 'Test Bildirimi',
  body: string = 'Bu bir test bildirimidir',
  url: string = '/'
): Promise<void> {
  if (!isPushNotificationSupported()) {
    console.warn('Notifications not supported')
    return
  }

  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    console.warn('Notification permission denied')
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'test-notification',
      data: { url },
    })
  } catch (error) {
    console.error('Error sending test notification:', error)
  }
}

/**
 * Save subscription to backend (optional)
 */
export async function saveSubscriptionToBackend(
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    })

    return response.ok
  } catch (error) {
    console.error('Error saving subscription to backend:', error)
    return false
  }
}

/**
 * Remove subscription from backend (optional)
 */
export async function removeSubscriptionFromBackend(
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    })

    return response.ok
  } catch (error) {
    console.error('Error removing subscription from backend:', error)
    return false
  }
}

/**
 * Complete subscription flow: request permission + subscribe + save
 */
export async function enablePushNotifications(): Promise<{
  success: boolean
  subscription: PushSubscription | null
  error?: string
}> {
  try {
    // Check support
    if (!isPushNotificationSupported()) {
      return {
        success: false,
        subscription: null,
        error: 'Push notifications not supported in this browser',
      }
    }

    // Request permission
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      return {
        success: false,
        subscription: null,
        error: 'Notification permission denied',
      }
    }

    // Subscribe
    const subscription = await subscribeToPushNotifications()
    if (!subscription) {
      return {
        success: false,
        subscription: null,
        error: 'Failed to create push subscription',
      }
    }

    // Save to backend (optional)
    await saveSubscriptionToBackend(subscription)

    return {
      success: true,
      subscription,
    }
  } catch (error) {
    return {
      success: false,
      subscription: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Complete unsubscription flow: unsubscribe + remove from backend
 */
export async function disablePushNotifications(): Promise<boolean> {
  try {
    // Get current subscription
    const subscription = await getPushSubscription()
    if (!subscription) {
      return true // Already unsubscribed
    }

    // Remove from backend
    await removeSubscriptionFromBackend(subscription)

    // Unsubscribe locally
    return await unsubscribeFromPushNotifications()
  } catch (error) {
    console.error('Error disabling push notifications:', error)
    return false
  }
}
