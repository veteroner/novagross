// Ürün davranış olayı izleme (görüntüleme / sepet / favori).
// Sunucu store_id'yi üründen kendisi çözer; istemciden yalnızca olay gelir.
// Best-effort: hata satın alma akışını asla bozmasın.

export type ProductEventType = 'view' | 'add_to_cart' | 'remove_from_cart' | 'favorite' | 'unfavorite'

function getSessionId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    // PageViewTracker ile aynı oturum anahtarı — analitik birleştirilebilir olsun
    let id = sessionStorage.getItem('analytics_session_id')
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`
      sessionStorage.setItem('analytics_session_id', id)
    }
    return id
  } catch {
    return null
  }
}

export function trackProductEvent(
  eventType: ProductEventType,
  productId: string,
  quantity = 1
): void {
  if (typeof window === 'undefined' || !productId) return
  try {
    const payload = JSON.stringify({
      event_type: eventType,
      product_id: productId,
      quantity,
      session_id: getSessionId(),
    })
    // sendBeacon: sayfa kapanırken bile gider, akışı bloklamaz
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/product-event', payload)
    } else {
      void fetch('/api/analytics/product-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      })
    }
  } catch {
    // sessiz — izleme asla UX bozmaz
  }
}
