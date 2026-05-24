# ============================================================================
# TRENDIKON - KARGO SİSTEMİ KURULUM REHBERİ
# ============================================================================

## 🚚 KURULUM ADIMLARI

### 1. Database Migration
```bash
cd /Volumes/LaCie/nova_store
npx supabase db push --linked
```

✅ Oluşturulan Tablolar:
- shipping_carriers (Yurtiçi, Aras, MNG, PTT, Sürat)
- shipping_methods (Standart, Express teslimat seçenekleri)
- shipping_rates (Fiyatlandırma kuralları)
- store_shipping_settings (Mağaza özel ayarlar)
- order_shipments (Sipariş kargo bilgileri)
- shipping_status_history (Kargo takip geçmişi)

---

### 2. Environment Variables

#### Yurtiçi Kargo API
```env
YURTICI_API_KEY=your-api-key
YURTICI_API_SECRET=your-secret-key
YURTICI_CUSTOMER_ID=your-customer-id
YURTICI_BASE_URL=https://entegrasyon.yurticikargo.com/api
```

**Nasıl Alınır:**
1. https://developer.yurticikargo.com/ adresine git
2. Kurumsal hesap oluştur
3. API credentials al
4. Test için sandbox endpoint kullan

#### Aras Kargo API
```env
ARAS_API_USERNAME=your-username
ARAS_API_PASSWORD=your-password
ARAS_CUSTOMER_ID=your-customer-id
ARAS_BASE_URL=https://eservice.araskargo.com.tr/api
```

**Nasıl Alınır:**
1. https://developer.araskargo.com.tr/ adresine git
2. Kurumsal entegrasyon başvurusu yap
3. API credentials al

#### Webhook Security
```env
CARGO_WEBHOOK_SECRET=your-random-secret-key-min-32-chars
```

**Oluşturma:**
```bash
openssl rand -hex 32
```

---

### 3. Kargo Firması Webhook Ayarları

#### Yurtiçi Kargo
Webhook URL: `https://your-domain.com/api/webhooks/cargo`
Secret Header: `X-Webhook-Secret: your-secret-key`

#### Aras Kargo
Webhook URL: `https://your-domain.com/api/webhooks/cargo`
Secret Header: `X-Webhook-Secret: your-secret-key`

---

## 📦 KULLANIM

### Satıcı Tarafı

#### 1. Sipariş Detayında Kargo Bilgisi Girme
```typescript
import { ShipmentForm } from '@/components/seller/ShipmentForm'

<ShipmentForm
  orderId={order.id}
  orderNumber={order.order_number}
  onSuccess={() => router.refresh()}
/>
```

#### 2. Özellikler
- Kargo firması seçimi (Yurtiçi, Aras, MNG, PTT, Sürat)
- Teslimat türü (Standart, Express)
- Paket ağırlığı girişi
- Koli sayısı
- Otomatik etiket oluşturma (API entegrasyonu)
- Manuel takip numarası girişi

---

### Müşteri Tarafı

#### Kargo Takip Sayfası
URL: `https://your-domain.com/kargo-takip/[trackingNumber]`

Örnek:
```
https://trendikon.com/kargo-takip/TR1234567890
```

#### Görüntülenen Bilgiler:
- Sipariş bilgileri
- Teslimat adresi
- Güncel kargo durumu
- Kargo geçmişi (timeline)
- Tahmini teslimat tarihi
- Kargo firması takip linki

---

## 🔄 KARGO DURUMLARI

| Status | Türkçe | Açıklama |
|--------|--------|----------|
| `pending` | Beklemede | Sipariş henüz kargoya verilmedi |
| `preparing` | Hazırlanıyor | Kargo hazırlanıyor |
| `shipped` | Kargoya Verildi | Kargo firmasına teslim edildi |
| `in_transit` | Dağıtımda | Transfer merkezinde |
| `out_for_delivery` | Dağıtımda | Kurye teslimatta |
| `delivered` | Teslim Edildi | Müşteriye ulaştı |
| `failed` | Başarısız | Teslimat başarısız |
| `returned` | İade | Satıcıya iade edildi |

---

## 🔧 API KULLANIMI

### Kargo Oluşturma
```typescript
import { cargoService } from '@/lib/cargo'

const result = await cargoService.createShipment('yurtici', {
  senderName: 'Mağaza Adı',
  senderAddress: 'Adres...',
  senderCity: 'İstanbul',
  senderDistrict: 'Kadıköy',
  senderPhone: '+905551234567',
  
  receiverName: 'Müşteri Adı',
  receiverAddress: 'Adres...',
  receiverCity: 'Ankara',
  receiverDistrict: 'Çankaya',
  receiverPhone: '+905559876543',
  receiverEmail: 'musteri@example.com',
  
  weight: 2.5,
  pieceCount: 1,
  paymentType: 'SENDER',
  serviceType: 'STANDARD',
  
  description: 'Sipariş #12345',
  invoiceNumber: 'INV-12345',
  invoiceValue: 299.90,
})

if (result.success) {
  console.log('Takip No:', result.trackingNumber)
  console.log('Etiket URL:', result.labelUrl)
}
```

### Kargo Takip
```typescript
const tracking = await cargoService.trackShipment('yurtici', 'TR1234567890')

console.log('Durum:', tracking.statusDescription)
console.log('Konum:', tracking.currentLocation)
console.log('Geçmiş:', tracking.history)
```

### Kargo İptali
```typescript
const cancel = await cargoService.cancelShipment('aras', 'AR9876543210')

if (cancel.success) {
  console.log('Kargo iptal edildi')
}
```

---

## 📊 FİYATLANDIRMA SİSTEMİ

### Otomatik Fiyat Hesaplama
```sql
SELECT calculate_shipping_cost(
  p_store_id := 'store-uuid',
  p_method_id := 'method-uuid',
  p_order_value := 500.00,
  p_weight := 2.0,
  p_region := 'all'
);
```

### Mağaza Özel Fiyatlandırma
```typescript
// Mağaza kendi kargo fiyatını belirleyebilir
await supabase.from('store_shipping_settings').insert({
  store_id: storeId,
  method_id: methodId,
  custom_base_price: 35.00,
  custom_free_shipping_threshold: 750.00,
  is_enabled: true,
})
```

---

## ⚠️ ÖNEMLİ NOTLAR

### 1. API Limitler
- Yurtiçi Kargo: Test ortamında günlük 1000 istek
- Aras Kargo: Test ortamında günlük 500 istek
- Production'da limitleri kontrol et

### 2. Webhook Güvenliği
- HTTPS zorunlu
- Secret key kullan
- IP whitelist yapılandır (opsiyonel)

### 3. Hata Yönetimi
- API bağlantı hatalarında manuel girişe izin ver
- Retry mekanizması kur (exponential backoff)
- Hataları log'la (Sentry)

### 4. Email Bildirimleri
TODO: Aşağıdaki durumlarda email gönder:
- ✅ Kargo bilgisi girildi (shipped)
- ⬜ Kargo dağıtımda (out_for_delivery)
- ⬜ Teslim edildi (delivered)
- ⬜ Teslimat başarısız (failed)

---

## 🧪 TEST SENARYOLARI

### 1. Manuel Kargo Girişi
```
✅ Satıcı sipariş detayında "Kargoya Ver" butonuna tıklar
✅ Kargo firması seçer (örn: Yurtiçi)
✅ Teslimat türü seçer (Standart)
✅ Ağırlık girer (2 kg)
✅ "Otomatik etiket oluştur" seçeneğini KAPALI bırakır
✅ Form submit edilir
✅ Sipariş "shipped" durumuna geçer
✅ Müşteriye email gönderilir (TODO)
```

### 2. Otomatik Etiket Oluşturma
```
✅ Satıcı "Otomatik etiket oluştur" seçeneğini AÇIK bırakır
✅ Form submit edilir
⚠️ Kargo API'si çağrılır
✅ Takip numarası otomatik oluşturulur
✅ PDF etiket URL'i alınır
✅ Database'e kaydedilir
```

### 3. Kargo Takip
```
✅ Müşteri takip numarasını girer veya email'deki linke tıklar
✅ /kargo-takip/[trackingNumber] sayfası açılır
✅ Sipariş bilgileri görüntülenir
✅ Güncel durum gösterilir
✅ Kargo geçmişi listelenir (timeline)
```

### 4. Webhook Test
```bash
# Test webhook gönderimi
curl -X POST https://your-domain.com/api/webhooks/cargo \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{
    "trackingNumber": "TR1234567890",
    "status": "delivered",
    "statusDescription": "Teslim edildi",
    "location": "Kadıköy Şubesi",
    "timestamp": "2026-01-16T14:30:00Z"
  }'
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Supabase migration push edildi
- [ ] Environment variables eklendi (Yurtiçi, Aras)
- [ ] Webhook secret oluşturuldu
- [ ] Kargo firması webhook URL'leri yapılandırıldı
- [ ] Test kargo oluşturuldu
- [ ] Takip sayfası test edildi
- [ ] Email bildirimleri entegre edildi
- [ ] Error tracking aktif (Sentry)
- [ ] API rate limiting ayarlandı

---

## 📞 DESTEK

### Yurtiçi Kargo
- Developer Portal: https://developer.yurticikargo.com/
- Email: entegrasyon@yurticikargo.com
- Tel: 444 9 999

### Aras Kargo
- Developer Portal: https://developer.araskargo.com.tr/
- Email: api@araskargo.com.tr
- Tel: 444 25 52

---

## 📝 YAPILACAKLAR (TODO)

### Kısa Vadeli
- [ ] Email bildirimleri (kargo durumu değiştiğinde)
- [ ] Admin panelde kargo raporları
- [ ] Toplu kargo etiket yazdırma
- [ ] MNG, PTT, Sürat API entegrasyonları

### Uzun Vadeli
- [ ] Kargo fiyat karşılaştırma (en ucuz seçim)
- [ ] Otomasyon: Sipariş onaylandığında otomatik kargo oluştur
- [ ] SMS bildirimleri (teslimat yaklaştığında)
- [ ] Kargo sigorta entegrasyonu
- [ ] İade kargo sistemi
