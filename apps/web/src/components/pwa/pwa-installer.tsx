'use client'

import { useEffect } from 'react'

export function PWAInstaller() {
  // TEMPORARILY DISABLED: Service Worker causing cache corruption issues
  // Will re-enable after proper testing and cache strategy validation
  useEffect(() => {
    // Service Worker registration disabled.
    // Also proactively unregister existing SW registrations + remove novagross caches
    // to recover users stuck with corrupted cached assets.
    console.log('[PWA] Service Worker temporarily disabled for stability')

    let cancelled = false

    async function cleanup() {
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map((r) => r.unregister()))
        }

        if ('caches' in window) {
          const keys = await caches.keys()
          const novagrossKeys = keys.filter((k) => k.startsWith('novagross-'))
          await Promise.all(novagrossKeys.map((k) => caches.delete(k)))
        }

        if (!cancelled) {
          console.log('[PWA] Cleaned up old Service Worker registrations/caches')
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[PWA] Cleanup failed (safe to ignore):', err)
        }
      }
    }

    cleanup()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
