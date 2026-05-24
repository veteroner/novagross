# Push Notifications Entegrasyonu

Push notification sistemi başarıyla tamamlandı! ✅

## 📋 İçerik

- [Kurulum](#kurulum)
- [Özellikler](#özellikler)
- [Dosya Yapısı](#dosya-yapısı)
- [Kullanım](#kullanım)
- [Test Etme](#test-etme)
- [Backend Entegrasyonu](#backend-entegrasyonu)
- [Sorun Giderme](#sorun-giderme)

## 🚀 Kurulum

Push notification sistemi otomatik olarak çalışır:

1. Service Worker otomatik register olur (`/public/sw.js`)
2. 45 saniye sonra izin isteme popup'ı gösterilir
3. Kullanıcı "Aktif Et" dediğinde bildirimler aktif olur
4. Welcome bildirimi otomatik gönderilir

## ✨ Özellikler

### 1. Tarayıcı Desteği Kontrolü
```typescript
import { isPushNotificationSupported } from '@/lib/push-notifications'

if (isPushNotificationSupported()) {
  // Push notifications destekleniyor
}
```

### 2. Bildirim İzni Yönetimi
```typescript
import { 
  getNotificationPermission,
  requestNotificationPermission 
} from '@/lib/push-notifications'

// Mevcut izin durumunu kontrol et
const permission = getNotificationPermission()
// Sonuç: 'default' | 'granted' | 'denied'

// İzin iste
const newPermission = await requestNotificationPermission()
```

### 3. Push Subscription
```typescript
import { 
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isPushSubscribed 
} from '@/lib/push-notifications'

// Subscribe
const subscription = await subscribeToPushNotifications()

// Unsubscribe
const success = await unsubscribeFromPushNotifications()

// Subscription durumunu kontrol et
const isSubscribed = await isPushSubscribed()
```

### 4. Tam Akış (One-Click)
```typescript
import { 
  enablePushNotifications,
  disablePushNotifications 
} from '@/lib/push-notifications'

// Tek tuşla aktif et (izin + subscribe + backend)
const result = await enablePushNotifications()
if (result.success) {
  console.log('Subscription:', result.subscription)
} else {
  console.error('Error:', result.error)
}

// Tek tuşla kapat
const success = await disablePushNotifications()
```

### 5. Test Bildirimleri
```typescript
import { sendTestNotification } from '@/lib/push-notifications'

// Local test notification gönder
await sendTestNotification(
  'Başlık',
  'Mesaj içeriği',
  '/hedef-url'
)
```

## 📁 Dosya Yapısı

```
apps/web/
├── src/
│   ├── lib/
│   │   └── push-notifications.ts          # Ana utility kütüphanesi (325 satır)
│   └── components/
│       └── notifications/
│           └── push-notification-prompt.tsx  # UI komponenti
├── public/
│   └── sw.js                               # Service Worker (push handlers mevcut)
└── app/
    └── layout.tsx                          # PushNotificationPrompt eklendi
```

## 🎯 Kullanım

### Otomatik Prompt (Varsayılan)

Kullanıcı siteye girdiğinde:
1. 45 saniye bekler
2. Sağ alt köşede popup gösterir
3. "Aktif Et" / "Şimdi Değil" seçenekleri sunar
4. Dismiss edilirse `localStorage` ile hatırlanır

### Manuel Kullanım

Herhangi bir komponente push notification özellikleri eklemek:

```tsx
'use client'

import { useState } from 'react'
import { enablePushNotifications } from '@/lib/push-notifications'
import { Button } from '@nova-store/ui'

export function MyComponent() {
  const [loading, setLoading] = useState(false)

  const handleEnable = async () => {
    setLoading(true)
    const result = await enablePushNotifications()
    setLoading(false)
    
    if (result.success) {
      alert('Bildirimler aktif!')
    }
  }

  return (
    <Button onClick={handleEnable} disabled={loading}>
      Bildirimleri Aç
    </Button>
  )
}
```

### Kullanıcı Ayarları Sayfası

```tsx
'use client'

import { useEffect, useState } from 'react'
import { 
  isPushSubscribed,
  enablePushNotifications,
  disablePushNotifications,
  sendTestNotification
} from '@/lib/push-notifications'

export function NotificationSettings() {
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    const checkStatus = async () => {
      const subscribed = await isPushSubscribed()
      setIsSubscribed(subscribed)
    }
    checkStatus()
  }, [])

  const handleToggle = async () => {
    if (isSubscribed) {
      await disablePushNotifications()
      setIsSubscribed(false)
    } else {
      const result = await enablePushNotifications()
      setIsSubscribed(result.success)
    }
  }

  const handleTest = async () => {
    await sendTestNotification('Test', 'Bu bir test mesajıdır')
  }

  return (
    <div>
      <h2>Bildirim Ayarları</h2>
      <label>
        <input
          type="checkbox"
          checked={isSubscribed}
          onChange={handleToggle}
        />
        Push Notifications
      </label>
      
      {isSubscribed && (
        <button onClick={handleTest}>
          Test Bildirimi Gönder
        </button>
      )}
    </div>
  )
}
```

## 🧪 Test Etme

### 1. Local Test

```bash
# Development server'ı başlat
cd apps/web
pnpm dev
```

1. `http://localhost:3000` aç
2. 45 saniye bekle veya browser console'a:
   ```js
   localStorage.removeItem('push-notification-dismissed')
   location.reload()
   ```
3. Popup göründüğünde "Aktif Et"
4. Welcome notification gelecek
5. Dev mode'da sol alt köşede test butonu göreceksiniz

### 2. Browser DevTools Test

#### Chrome DevTools:
1. F12 > Application > Service Workers
2. Push notification gönder:
   ```js
   // Console'da
   const registration = await navigator.serviceWorker.ready
   registration.showNotification('Test', {
     body: 'Manual test notification',
     icon: '/icon-192x192.png'
   })
   ```

#### Firefox DevTools:
1. F12 > Storage > Service Workers
2. "Push" butonuna bas
3. Notification göreceksiniz

### 3. Production Test

```bash
# Build ve preview
pnpm build
pnpm preview
```

Production build'de test et çünkü:
- Service Worker sadece HTTPS veya localhost'ta çalışır
- Push API HTTPS gerektirir

### 4. VAPID Key Test (Opsiyonel)

Gerçek push notification gönderimi için VAPID keys gerekli:

```bash
# VAPID keys oluştur (Node.js)
npx web-push generate-vapid-keys
```

`.env.local`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
```

`subscribeToPushNotifications()` otomatik kullanacak.

## 🔌 Backend Entegrasyonu (Opsiyonel)

Push subscriptions'ı veritabanında saklamak için:

### 1. API Route Oluştur

`apps/web/src/app/api/push/subscribe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json()
    const supabase = createClient()
    
    // Kullanıcı bilgisi al (auth varsa)
    const { data: { user } } = await supabase.auth.getUser()
    
    // Subscription'ı kaydet
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user?.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        created_at: new Date().toISOString(),
      })
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Subscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    )
  }
}
```

`apps/web/src/app/api/push/unsubscribe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { endpoint } = await request.json()
    const supabase = createClient()
    
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    )
  }
}
```

### 2. Supabase Migration

`supabase/migrations/[timestamp]_push_subscriptions.sql`:

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id);
```

### 3. Backend'den Notification Gönderme

`apps/web/src/lib/send-push.ts`:

```typescript
import webpush from 'web-push'

// VAPID keys'leri ayarla
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushNotification(
  subscription: PushSubscription,
  title: string,
  body: string,
  url?: string
) {
  const payload = JSON.stringify({
    title,
    body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    url: url || '/',
  })

  try {
    await webpush.sendNotification(subscription, payload)
    return { success: true }
  } catch (error) {
    console.error('Error sending push:', error)
    return { success: false, error }
  }
}
```

### 4. Toplu Notification Gönderme

`apps/web/src/app/api/admin/send-notification/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/send-push'

export async function POST(request: NextRequest) {
  try {
    const { title, body, url } = await request.json()
    const supabase = createClient()
    
    // Admin kontrolü
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Tüm subscriptions'ları al
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys')
    
    if (!subscriptions?.length) {
      return NextResponse.json({ error: 'No subscriptions found' }, { status: 404 })
    }
    
    // Tüm kullanıcılara gönder
    const results = await Promise.allSettled(
      subscriptions.map(sub => 
        sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          } as PushSubscription,
          title,
          body,
          url
        )
      )
    )
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    return NextResponse.json({
      success: true,
      total: subscriptions.length,
      successful,
      failed,
    })
  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
```

## 🐛 Sorun Giderme

### Service Worker Register Olmuyor

**Sorun:** Console'da "Service Worker registration failed"

**Çözüm:**
```bash
# localhost'ta mı çalışıyorsun?
# HTTPS gerekli (localhost hariç)

# Service Worker dosyası var mı?
ls -la apps/web/public/sw.js

# Browser cache temizle
# Chrome: DevTools > Application > Clear storage > Clear site data
```

### Push API Kullanılamıyor

**Sorun:** `isPushNotificationSupported()` false dönüyor

**Çözüm:**
- Chrome/Edge/Firefox en son sürüm kullan
- Safari'de Settings > Notifications > Allow websites to ask permission
- Incognito/private mode'da push notification çalışmaz
- HTTP'de çalışmaz, HTTPS gerekli

### Notification Gösterilmiyor

**Sorun:** Permission granted ama notification görünmüyor

**Çözüm:**
1. **Browser Settings:**
   - Chrome: Settings > Privacy > Site settings > Notifications
   - Firefox: Preferences > Privacy > Permissions > Notifications
   - Site için notification'lar engellenmiş olabilir

2. **OS Settings:**
   - macOS: System Preferences > Notifications > Chrome
   - Windows: Settings > System > Notifications > Chrome
   - Browser'a notification izni verilmemiş olabilir

3. **Do Not Disturb:**
   - macOS/Windows Do Not Disturb mode aktif olabilir

### VAPID Key Hatası

**Sorun:** "No VAPID key found" veya subscription başarısız

**Çözüm:**
```bash
# VAPID keys oluştur
npx web-push generate-vapid-keys

# .env.local'e ekle
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=yyy

# Server'ı restart et
pnpm dev
```

### Subscription Kaydedilemiyor (Backend)

**Sorun:** `/api/push/subscribe` 500 error

**Çözüm:**
```typescript
// push-notifications.ts içinde backend URL'i kontrol et
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || ''

// .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Service Worker Push Event Çalışmıyor

**Sorun:** Backend'den push gönderilince hiçbir şey olmuyor

**Çözüm:**
1. DevTools > Application > Service Workers > "Push" test et
2. `sw.js` içinde `console.log` ekle:
   ```js
   self.addEventListener('push', function(event) {
     console.log('Push received:', event)
     // ...
   })
   ```
3. Service Worker update et:
   ```js
   // DevTools > Application > Service Workers > Update
   ```

## 📊 Analytics (Opsiyonel)

Push notification kullanımını track etmek:

```typescript
import { trackEvent } from '@/lib/analytics'

// Permission granted
trackEvent('Notification', 'Permission Granted', 'Push Notifications')

// Subscribed
trackEvent('Notification', 'Subscribed', 'Push Notifications')

// Unsubscribed
trackEvent('Notification', 'Unsubscribed', 'Push Notifications')

// Notification clicked
trackEvent('Notification', 'Clicked', notification.data.url)
```

## 🎯 Kullanım Senaryoları

### 1. Kampanya Bildirimleri
```typescript
// Admin panelinden kampanya başlatıldığında
await sendBulkNotification({
  title: '🎉 Flash Sale Başladı!',
  body: 'Seçili ürünlerde %50\'ye varan indirim - 2 saat!',
  url: '/kampanyalar/flash-sale'
})
```

### 2. Sipariş Durumu
```typescript
// Sipariş durumu değiştiğinde
await sendToUser(userId, {
  title: 'Siparişiniz Kargoya Verildi 📦',
  body: 'Sipariş #12345 kargoya verildi. Takip numarası: XXX',
  url: '/siparislerim/12345'
})
```

### 3. Abandoned Cart
```typescript
// Sepet abandoned ise (1 saat sonra)
await sendToUser(userId, {
  title: 'Sepetinizde Ürünler Bekliyor 🛒',
  body: '3 ürün sepetinizde - Hemen satın alın!',
  url: '/sepet'
})
```

### 4. Stok Uyarısı
```typescript
// İstek listesindeki ürün stoka girince
await sendToUser(userId, {
  title: 'İstediğiniz Ürün Stoklarda! ✨',
  body: 'iPhone 15 Pro tekrar stokta - Kaçırmayın!',
  url: '/urunler/iphone-15-pro'
})
```

## 📚 Kaynaklar

- [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [MDN Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [web-push NPM](https://www.npmjs.com/package/web-push)
- [VAPID Keys](https://developers.google.com/web/fundamentals/push-notifications/web-push-protocol)
- [Service Worker Lifecycle](https://web.dev/service-worker-lifecycle/)

## ✅ Tamamlanan Özellikler

- ✅ Service Worker push handlers
- ✅ Push notification utilities (15+ functions)
- ✅ Permission request UI component
- ✅ Auto-timing (45 second delay)
- ✅ Subscription management (enable/disable)
- ✅ Test notification functionality
- ✅ LocalStorage dismissal tracking
- ✅ Development mode test UI
- ✅ Welcome notification
- ✅ Browser support detection
- ✅ Error handling
- ✅ TypeScript types
- ✅ Documentation

## 🔜 İsteğe Bağlı Geliştirmeler

- ⏳ Backend API endpoints (subscribe/unsubscribe)
- ⏳ Database storage (Supabase)
- ⏳ Bulk notification sending
- ⏳ Notification scheduling
- ⏳ User preferences (notification types)
- ⏳ A/B testing
- ⏳ Analytics integration

---

**Not:** Push notifications şu anda tamamen client-side çalışıyor. Backend entegrasyonu opsiyonel - gerçek push notification gönderimi için VAPID keys + backend API gerekli. Local test notifications şimdilik yeterli.
