// Service Worker for PWA offline support
// Bump VERSION to force cache invalidation on deploys.
const VERSION = 'v2-2026-01-28'
const STATIC_CACHE = `novagross-static-${VERSION}`
const DYNAMIC_CACHE = `novagross-dynamic-${VERSION}`

// Static assets to cache on install
const STATIC_ASSETS = [
  '/offline',
  '/manifest.json',
  '/site.webmanifest',
  '/icon.png',
  '/favicon.ico',
]

function shouldCacheResponse(request, response) {
  if (!response || !response.ok) return false
  // Only cache same-origin, non-opaque responses
  if (response.type && response.type !== 'basic') return false

  const contentType = (response.headers.get('content-type') || '').toLowerCase()

  if (request.destination === 'style') return contentType.includes('text/css')
  if (request.destination === 'script') {
    return (
      contentType.includes('javascript') ||
      contentType.includes('ecmascript') ||
      contentType.includes('application/x-javascript')
    )
  }
  if (request.destination === 'font') return contentType.includes('font/')
  if (request.destination === 'image') return contentType.startsWith('image/')

  return true
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch event - implement cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return
  }

  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || !networkResponse.ok || (networkResponse.type && networkResponse.type !== 'basic')) {
            return networkResponse
          }
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, networkResponse.clone())
            return networkResponse
          })
        })
        .catch(() => {
          return caches.match(request)
        })
    )
    return
  }

  // Cache-first for static assets
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response
        }
        return fetch(request).then((networkResponse) => {
          if (!shouldCacheResponse(request, networkResponse)) {
            return networkResponse
          }
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, networkResponse.clone())
            return networkResponse
          })
        })
      })
    )
    return
  }

  // Network-first for HTML pages
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (!networkResponse || !networkResponse.ok) {
          return networkResponse
        }
        return caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, networkResponse.clone())
          return networkResponse
        })
      })
      .catch(() => {
        return caches.match(request).then((response) => {
          if (response) {
            return response
          }
          // Show offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/offline')
          }
        })
      })
  )
})

// Handle push notifications (future enhancement)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const options = {
    body: data.body || 'Yeni bildirim',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: data.url || '/',
    },
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Novagross', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
})
