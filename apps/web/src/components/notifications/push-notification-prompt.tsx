'use client'

import { useEffect, useState } from 'react'
import { Button } from '@novagross/ui'
import { Bell, BellOff, X } from 'lucide-react'
import {
  isPushNotificationSupported,
  getNotificationPermission,
  enablePushNotifications,
  disablePushNotifications,
  isPushSubscribed,
  sendTestNotification,
} from '@/lib/push-notifications'

/**
 * Push Notification Permission Component
 * 
 * Features:
 * - Auto-detect browser support
 * - Show permission prompt after delay
 * - One-click enable/disable
 * - Test notification button
 * - Persistent dismissal (localStorage)
 * 
 * Usage: Add to layout.tsx or specific pages
 */
export function PushNotificationPrompt() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check support and subscription status
  useEffect(() => {
    const checkStatus = async () => {
      const supported = isPushNotificationSupported()
      setIsSupported(supported)

      if (!supported) return

      const perm = getNotificationPermission()
      setPermission(perm)

      const subscribed = await isPushSubscribed()
      setIsSubscribed(subscribed)

      // Check if user dismissed the prompt
      const dismissed = localStorage.getItem('push-notification-dismissed')
      
      // Show prompt after 45 seconds if:
      // - Supported
      // - Not dismissed
      // - Permission not granted
      // - Not already subscribed
      if (!dismissed && perm === 'default' && !subscribed) {
        setTimeout(() => setIsVisible(true), 45000) // 45 seconds
      }
    }

    checkStatus()
  }, [])

  const handleEnable = async () => {
    setIsLoading(true)
    try {
      const result = await enablePushNotifications()
      
      if (result.success) {
        setPermission('granted')
        setIsSubscribed(true)
        setIsVisible(false)
        
        // Send welcome notification
        await sendTestNotification(
          'Bildirimler Aktif! 🎉',
          'Kampanyalar ve özel fırsatlardan haberdar olacaksınız.',
          '/'
        )
      } else {
        alert(result.error || 'Bildirimler etkinleştirilemedi')
      }
    } catch (error) {
      console.error('Error enabling notifications:', error)
      alert('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable = async () => {
    setIsLoading(true)
    try {
      const success = await disablePushNotifications()
      
      if (success) {
        setIsSubscribed(false)
        setPermission('default')
        alert('Bildirimler devre dışı bırakıldı')
      } else {
        alert('Bildirimler kapatılamadı')
      }
    } catch (error) {
      console.error('Error disabling notifications:', error)
      alert('Bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem('push-notification-dismissed', 'true')
  }

  const handleTest = async () => {
    await sendTestNotification(
      'Test Bildirimi',
      'Bu bir test bildirimidir. Bildirimler çalışıyor!',
      '/'
    )
  }

  // Don't render if not supported
  if (!isSupported) {
    return null
  }

  // Show permission prompt banner
  if (isVisible && permission === 'default' && !isSubscribed) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">
                Bildirimleri Aktif Et
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Özel kampanyalar, indirimler ve yeni ürünlerden anında haberdar olun!
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleEnable}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Etkinleştiriliyor...' : 'Aktif Et'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  disabled={isLoading}
                >
                  Şimdi Değil
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show settings button if subscribed (optional, can be in user settings)
  if (isSubscribed && process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-3 space-y-2">
          <p className="text-xs font-semibold">Bildirimler Aktif ✅</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleTest}>
              Test
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDisable}
              disabled={isLoading}
            >
              <BellOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
