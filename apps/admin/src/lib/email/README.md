# Email System - README

## 🚀 Kurulum Tamamlandı!

Trendikon admin paneline Resend e-posta sistemi başarıyla entegre edildi.

## 📦 Kurulu Paketler

- `resend` - E-posta gönderim servisi
- `@react-email/components` - React ile email şablonları
- `@react-email/render` - Email render engine

## 🗂️ Dosya Yapısı

```
src/lib/email/
├── types.ts              # Type definitions
├── logger.ts             # Email logging utility
├── service.ts            # Core EmailService class
└── templates/
    ├── base/
    │   └── layout.tsx    # Base email layout
    └── auth/
        ├── password-reset.tsx
        └── password-changed.tsx
```

## 🔧 Yapılandırma

`.env.local` dosyasında şu değişkenler eklendi:

```env
RESEND_API_KEY=re_123456789_REPLACE_WITH_YOUR_KEY
RESEND_FROM_EMAIL=bildirim@trendikon.com
RESEND_FROM_NAME=Trendikon
```

**ÖNEMLİ:** `RESEND_API_KEY` değerini gerçek API key ile değiştirin!

### Resend API Key Alma:

1. https://resend.com adresine gidin
2. Hesap oluşturun (ücretsiz plan mevcut)
3. Dashboard > API Keys bölümünden yeni key oluşturun
4. Key'i kopyalayıp `.env.local` dosyasına yapıştırın

## 📧 Kullanım

### E-posta Gönderme

```typescript
import { getEmailService } from '@/lib/email/service';

const emailService = getEmailService();

await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Şifre Sıfırlama',
  template: 'auth/password-reset',
  data: {
    resetUrl: 'https://trendikon.com/reset?token=xyz',
    userName: 'Ahmet Yılmaz',
  },
});
```

### Şablon Önizleme

Tarayıcıda şablon önizlemesi için:

```
http://localhost:3001/api/email/preview?template=auth/password-reset
```

### API ile E-posta Gönderme

```bash
curl -X POST http://localhost:3001/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "template": "auth/password-reset",
    "data": {
      "resetUrl": "https://example.com/reset",
      "userName": "Test User"
    }
  }'
```

## 🧪 Test

### 1. Paketleri Kur

```bash
cd apps/admin
pnpm install
```

### 2. Development Server

```bash
pnpm dev
```

### 3. Şablon Önizle

Tarayıcıda aç:
- http://localhost:3001/api/email/preview?template=auth/password-reset
- http://localhost:3001/api/email/preview?template=auth/password-changed

## ✅ Tamamlanan Görevler

- [x] Resend ve React Email paketleri kuruldu
- [x] Environment değişkenleri yapılandırıldı
- [x] Email klasör yapısı oluşturuldu
- [x] EmailService class'ı yazıldı
- [x] Base email layout oluşturuldu
- [x] İlk 2 kritik şablon hazırlandı (password-reset, password-changed)
- [x] API endpoints oluşturuldu (send, preview)

## 🔜 Sonraki Adımlar

1. **Veritabanı Migration:** Email tabloları oluşturulacak
2. **Daha Fazla Şablon:** Sipariş, ürün, finansal e-postalar
3. **Queue Sistemi:** Toplu e-posta gönderimi
4. **Webhook Integration:** Resend webhook'ları
5. **Analytics Dashboard:** E-posta metrikleri

## 📚 Kaynaklar

- [Resend Docs](https://resend.com/docs)
- [React Email Docs](https://react.email/docs)
- [Proje Planı](../../../RESEND_EMAIL_PLAN.md)
