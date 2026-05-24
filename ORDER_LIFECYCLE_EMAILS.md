# Order Lifecycle Emails - Trendikon

✅ **Tamamlandı: 15 Ocak 2026**

## Genel Bakış

Sipariş yaşam döngüsündeki tüm kritik aşamalar için otomatik email bildirimleri sistemi tamamlandı. Müşteriler siparişlerinin her aşamasında bilgilendirilecek.

## Email Template'leri

### 1. Order Shipped (Sipariş Kargoya Verildi) 🚚

**Template:** `orders/order-shipped.tsx`

**Ne Zaman Gönderilir:**
- Sipariş durumu `shipped` olarak güncellendiğinde
- Satıcı kargo bilgilerini sisteme girdiğinde

**İçerik:**
- 🎨 **Tasarım**: Mavi tema (in-transit durumu)
- 📦 Kargo takip numarası (büyük ve vurgulu)
- 🚚 Kargo firması adı
- 📅 Tahmini teslimat tarihi
- 📦 Sipariş özeti (ürünler + adetler)
- 📍 Teslimat adresi detayları
- 🔗 "Kargonu Takip Et" CTA button (tracking URL)

**Özellikler:**
- Tracking number'ı monospace font ile vurgulu gösterim
- Sarı highlight box ile kargo bilgileri dikkat çekici
- Responsive design, tüm cihazlarda uyumlu

**Props:**
```typescript
{
  orderNumber: string;
  buyerName: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrierName?: string;
  estimatedDelivery?: string;
  items: Array<{name, quantity, imageUrl?}>;
  shippingAddress: {fullName, addressLine1, city, etc.};
}
```

---

### 2. Order Delivered (Sipariş Teslim Edildi) 🎉

**Template:** `orders/order-delivered.tsx`

**Ne Zaman Gönderilir:**
- Sipariş durumu `delivered` olarak güncellendiğinde
- Kargo firması teslimatı onayladığında

**İçerik:**
- 🎨 **Tasarım**: Yeşil tema (başarı durumu)
- 🎉 Kutlama emojisi ve başarı mesajı
- ⏰ Teslimat zamanı (tarih + saat)
- 📦 Sipariş özeti
- 💰 Toplam tutar
- ⭐ **Değerlendirme Talebi**: "Ürünleri Değerlendir" CTA
- 💝 Review teşvik mesajları
- 🆘 Destek bölümü (iade/değişim bilgileri)
- 💡 Bonus ipucu: Hesap özellikleri hatırlatması

**Özellikler:**
- Sarı highlight review section (kullanıcı engagement için)
- Support section: 7/24 destek vurgusu
- Review URL: `{siteUrl}/siparis/{orderNumber}/degerlendirme`
- Support URL: `{siteUrl}/destek`

**Props:**
```typescript
{
  orderNumber: string;
  buyerName: string;
  deliveredAt: string;
  items: Array<{name, productId, quantity}>;
  totalAmount: string;
  reviewUrl?: string;
  supportUrl?: string;
}
```

---

### 3. Order Cancelled (Sipariş İptal Edildi) 🔔

**Template:** `orders/order-cancelled.tsx`

**Ne Zaman Gönderilir:**
- Sipariş durumu `cancelled` olarak güncellendiğinde
- Müşteri veya satıcı iptal talebinde bulunduğunda

**İçerik:**
- 🎨 **Tasarım**: Kırmızı/nötr tema + yeşil refund section
- 📅 İptal tarihi ve nedeni
- 📦 İptal edilen ürünler listesi (fiyatlarıyla)
- 💰 **İade Bilgileri Section** (yeşil vurgulu):
  - İade tutarı
  - İade yöntemi (Kredi Kartı / Banka)
  - Tahmini süre (3-5 iş günü)
  - Detaylı açıklama (banka işlem süreci)
- 🛍️ "Alışverişe Devam Et" CTA
- 🆘 Destek section

**Özellikler:**
- Dual audience: Hem alıcı hem satıcı için kullanılabilir
- Refund section: Yeşil border + background ile dikkat çekici
- Multi-seller support: İptal edilen siparişte satıcılara da bildirim
- Customer retention: "Tekrar sipariş ver" teşviki

**Props:**
```typescript
{
  orderNumber: string;
  buyerName: string;
  cancelledAt: string;
  cancellationReason?: string;
  items: Array<{name, quantity, price}>;
  totalAmount: string;
  refundAmount: string;
  refundMethod: string;
  refundEta?: string;
  supportUrl?: string;
}
```

---

## API Endpoint: Order Status Update

**Endpoint:** `POST /api/orders/update-status`

### Request Body:
```typescript
{
  orderId: string;              // Required
  status: OrderStatus;          // 'shipped' | 'delivered' | 'cancelled'
  trackingNumber?: string;      // For shipped
  trackingUrl?: string;         // For shipped
  carrierName?: string;         // For shipped
  estimatedDelivery?: string;   // For shipped
  cancellationReason?: string;  // For cancelled
}
```

### İşleyiş:

1. **Order Fetch**: Siparişi tüm detaylarıyla çeker
   - Order items
   - Products
   - Stores (multi-seller)
   - Buyer profile

2. **Status Update**: Database'de order.status günceller
   - Tracking bilgilerini kaydeder
   - Updated_at timestamp'ini günceller

3. **Email Trigger**: Status'e göre email queue'ya ekler

**Status → Email Mapping:**

| Status      | Buyer Email | Seller Email | Template |
|-------------|-------------|--------------|----------|
| `shipped`   | ✅ Yes      | ❌ No        | order-shipped |
| `delivered` | ✅ Yes      | ❌ No        | order-delivered |
| `cancelled` | ✅ Yes      | ✅ Yes       | order-cancelled |
| `pending`   | ❌ No       | ❌ No        | - |
| `processing`| ❌ No       | ❌ No        | - |

**Multi-Seller Handling:**
- Cancelled durumunda siparişteki her satıcıya ayrı email
- Ürünler store'lara göre gruplandırılır
- Her satıcı sadece kendi ürünlerini görür

### Response:
```json
{
  "success": true,
  "message": "Order status updated to shipped",
  "emailsQueued": 1
}
```

### Example Usage:

**Kargoya Verme:**
```bash
POST /api/orders/update-status
{
  "orderId": "uuid-123",
  "status": "shipped",
  "trackingNumber": "TR1234567890",
  "trackingUrl": "https://aras.com.tr/takip/TR1234567890",
  "carrierName": "Aras Kargo",
  "estimatedDelivery": "18 Ocak 2026"
}
```

**Teslim Etme:**
```bash
POST /api/orders/update-status
{
  "orderId": "uuid-123",
  "status": "delivered"
}
```

**İptal Etme:**
```bash
POST /api/orders/update-status
{
  "orderId": "uuid-123",
  "status": "cancelled",
  "cancellationReason": "Stokta kalmadı"
}
```

---

## Entegrasyon Noktaları

### 1. Satıcı Admin Paneli
Satıcılar şu işlemleri yapabilir:
- Sipariş kargoya verildi olarak işaretle → Kargo bilgileri gir
- Teslimat onayı (manuel veya kargo API'den otomatik)
- Sipariş iptali (neden seçimi)

### 2. Kargo Firması Webhook
Kargo firmalarından gelen webhook'lar:
```javascript
// Teslimat webhook'u
app.post('/webhook/cargo/delivered', async (req) => {
  const { trackingNumber, status } = req.body;
  
  if (status === 'delivered') {
    // Find order by tracking number
    const order = await findOrderByTracking(trackingNumber);
    
    // Trigger email
    await fetch('/api/orders/update-status', {
      method: 'POST',
      body: JSON.stringify({
        orderId: order.id,
        status: 'delivered'
      })
    });
  }
});
```

### 3. Müşteri İptal Butonu
Web sitesindeki "Siparişi İptal Et" butonu:
```javascript
async function cancelOrder(orderId: string, reason: string) {
  await fetch('/api/orders/update-status', {
    method: 'POST',
    body: JSON.stringify({
      orderId,
      status: 'cancelled',
      cancellationReason: reason
    })
  });
}
```

---

## Email Queue Integration

Tüm email'ler queue sistemi üzerinden gönderilir:
- **Priority**: 
  - shipped/cancelled: `high` (hemen gönderilir)
  - delivered: `normal` (sırayla gönderilir)
- **Bulk Sending**: Multi-seller durumunda `queueBulkEmails` kullanılır
- **Retry Logic**: Queue sistemi otomatik retry yapar

---

## Tasarım Özellikleri

### Renk Temaları:
- **Shipped**: Mavi (#2563eb) - Hareket/yolda
- **Delivered**: Yeşil (#15803d) - Başarı/tamamlandı
- **Cancelled**: Kırmızı (#991b1b) - İptal/durduruldu
  - Refund section: Yeşil (#22c55e) - Pozitif/geri ödeme

### Responsive Design:
- Tüm template'ler mobile-first
- Email client uyumluluğu (Gmail, Outlook, Apple Mail)
- Inline CSS (email client desteği için)

### CTA Buttonları:
- Büyük ve belirgin
- Yüksek kontrast renkler
- Açık aksiyon ifadeleri ("Kargonu Takip Et", "Ürünleri Değerlendir")

---

## Kullanım Örnekleri

### Test Email Gönderimi:

```bash
# Admin panel'den test
cd apps/admin
pnpm tsx test-order-emails.ts

# API üzerinden manuel test
curl -X POST http://localhost:3000/api/orders/update-status \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-order-id",
    "status": "shipped",
    "trackingNumber": "TEST123456",
    "carrierName": "Test Kargo"
  }'
```

---

## Monitoring & Analytics

Email queue sisteminde tracking:
```sql
-- Gönderilen order email'lerini görüntüle
SELECT 
  template,
  status,
  COUNT(*) as count
FROM email_queue
WHERE template LIKE 'orders/%'
GROUP BY template, status;

-- Son 24 saatte gönderilen order email'leri
SELECT 
  template,
  to_email,
  status,
  created_at
FROM email_queue
WHERE template LIKE 'orders/%'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## Sonraki Adımlar (Opsiyonel)

### Potansiyel Geliştirmeler:
1. **SMS Notifications**: Kritik durumlarda (shipped, delivered) SMS de gönder
2. **Push Notifications**: Mobile app entegrasyonu
3. **Email Preferences**: Kullanıcı hangi email'leri almak istediğini seçebilsin
4. **A/B Testing**: Email template'leri optimize et
5. **Advanced Tracking**: Email açılma/tıklama analytics
6. **Multi-language**: İngilizce/diğer dil desteği
7. **Return/Exchange Emails**: İade/değişim süreçleri için email'ler

---

## Dosya Yapısı

```
apps/admin/src/lib/email/templates/orders/
├── order-shipped.tsx         # Kargoya verildi template (YENİ)
├── order-delivered.tsx       # Teslim edildi template (YENİ)
├── order-cancelled.tsx       # İptal edildi template (YENİ)
├── order-confirmation.tsx    # Sipariş onayı (MEVCUT)
└── new-order-seller.tsx      # Satıcı bildirimi (MEVCUT)

apps/web/src/app/api/orders/
└── update-status/
    └── route.ts              # Status update + email trigger (YENİ)
```

---

## İstatistikler

- **Templates Added**: 3 (shipped, delivered, cancelled)
- **API Endpoints Added**: 1 (/api/orders/update-status)
- **Total Code Lines**: +1,648
- **Email Scenarios Covered**: 5/5 (confirmation, seller notification, shipped, delivered, cancelled)

---

## Commit Bilgisi

**Commit Hash**: `fd7bb7c`  
**Message**: `feat(orders): Add order lifecycle email templates and status update API`  
**Date**: 15 Ocak 2026  
**Branch**: main → origin/main (pushed) ✅

---

## Özet

Order lifecycle email sistemi artık production-ready! 🎉

**Tamamlanan İşler:**
- ✅ Order shipped email (tracking info)
- ✅ Order delivered email (review request)
- ✅ Order cancelled email (refund details)
- ✅ Status update API endpoint
- ✅ Multi-seller email handling
- ✅ Queue system integration

**Email Journey:**
1. Order placed → `order-confirmation` (✅ DONE)
2. Seller notified → `new-order-seller` (✅ DONE)
3. Order shipped → `order-shipped` (✅ DONE)
4. Order delivered → `order-delivered` (✅ DONE)
5. Order cancelled → `order-cancelled` (✅ DONE)

**Tüm sipariş yaşam döngüsü email'lerle kapsanmış durumda!** 🚀
