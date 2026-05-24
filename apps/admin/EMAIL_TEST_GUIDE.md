# Email Sistemi - Test ve Kullanım Kılavuzu

## ✅ Kurulum Tamamlandı!

Resend API key başarıyla eklendi ve sistem kullanıma hazır.

## 🧪 Sistemin Test Edilmesi

### 1. Email Şablonlarını Tarayıcıda Önizleyin

Development server çalışırken şu URL'leri ziyaret edin:

- **Şifre Sıfırlama:** http://localhost:3001/api/email/preview?template=auth/password-reset
- **Şifre Değişti:** http://localhost:3001/api/email/preview?template=auth/password-changed

### 2. Test E-postası Gönderin

#### Curl ile API Test:

```bash
curl -X POST http://localhost:3001/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "SIZIN_EMAIL@example.com",
    "subject": "Test Email - Trendikon",
    "template": "auth/password-reset",
    "data": {
      "resetUrl": "https://trendikon.com/reset?token=test123",
      "userName": "Test User"
    }
  }'
```

#### TypeScript ile Test:

1. `test-email.ts` dosyasını düzenleyin - `test@example.com` yerine kendi email adresinizi yazın
2. Çalıştırın:

```bash
cd apps/admin
npx tsx test-email.ts
```

### 3. Resend Dashboard'u Kontrol Edin

1. https://resend.com/emails adresine gidin
2. Gönderilen e-postaları görüntüleyin
3. Delivery status, open rate gibi metrikleri kontrol edin

## 📧 Kullanım Örnekleri

### Kod İçinde Email Gönderme

```typescript
import { getEmailService } from '@/lib/email/service';

// API route veya server action içinde
export async function sendPasswordResetEmail(userId: string, email: string) {
  const emailService = getEmailService();
  
  // Reset token oluştur
  const resetToken = generateSecureToken();
  const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${resetToken}`;
  
  // Email gönder
  const result = await emailService.sendEmail({
    to: email,
    subject: 'Trendikon | Şifre sıfırlama bağlantısı',
    template: 'auth/password-reset',
    data: {
      resetUrl,
      userName: 'Kullanıcı',
      requestedAt: new Date().toLocaleString('tr-TR'),
      expiresInMinutes: 15,
    },
  });
  
  if (!result.success) {
    throw new Error('Email gönderilemedi: ' + result.error);
  }
  
  return result.id;
}
```

### Rate Limit Kontrolü

Sistem otomatik olarak rate limit kontrolü yapar:
- **Saatlik limit:** 10 email/kullanıcı
- **Günlük limit:** 50 email/kullanıcı

Limiti aşan istekler hata döner.

## 🎯 Sıradaki Şablonlar

Plana göre şimdi şu şablonları ekleyebiliriz:

### Kritik Öncelikli:
1. ✅ `auth/password-reset` - Tamamlandı
2. ✅ `auth/password-changed` - Tamamlandı
3. ⬜ `auth/otp-code` - 2FA doğrulama
4. ⬜ `orders/order-confirmation` - Sipariş onayı (alıcı)
5. ⬜ `orders/new-order-seller` - Yeni sipariş (satıcı)

### Orta Öncelikli:
6. ⬜ `orders/order-shipped` - Kargo çıkışı
7. ⬜ `products/product-approved` - Ürün onayı
8. ⬜ `products/stock-alert` - Stok uyarısı
9. ⬜ `finance/payment-received` - Ödeme alındı
10. ⬜ `marketing/welcome` - Hoş geldin

## 🔧 Sorun Giderme

### Email Gönderilmiyor

1. **API Key'i kontrol edin:**
   ```bash
   grep RESEND_API_KEY apps/admin/.env.local
   ```

2. **Server'ı yeniden başlatın:**
   ```bash
   # Terminal'de Ctrl+C ile durdurun, sonra:
   cd apps/admin
   pnpm dev
   ```

3. **Resend hesap limitlerini kontrol edin:**
   - Free plan: 100 email/gün
   - Sadece doğrulanmış domain'lerden gönderim

### Email Gelmedi

1. Spam klasörünü kontrol edin
2. Resend Dashboard'da delivery status'ü kontrol edin
3. Test için farklı bir email adresi deneyin

### Şablon Render Hatası

1. Template dosyasının doğru yolda olduğundan emin olun
2. React Email component'lerinin import edildiğini kontrol edin
3. Data props'larının template ile eşleştiğinden emin olun

## 📊 Metrikler

Email başarı oranını Resend Dashboard'dan takip edebilirsiniz:
- Delivery Rate
- Open Rate
- Click Rate
- Bounce Rate

## 🚀 Production'a Geçiş

Production'da kullanmadan önce:

1. **Domain Doğrulama:** Resend'de kendi domain'inizi ekleyin ve DNS ayarlarını yapın
2. **From Email:** `bildirim@trendikon.com` yerine kendi domain'inizi kullanın
3. **Webhook'ları Ayarlayın:** Email tracking için Resend webhook'ları yapılandırın
4. **Migration'ı Çalıştırın:** `supabase/migrations/20260115000000_email_system.sql`

## 📚 Dokümantasyon

- [Resend Email Plan](../../../RESEND_EMAIL_PLAN.md) - Detaylı proje planı
- [Email Service README](src/lib/email/README.md) - Teknik dokümantasyon
- [Resend Docs](https://resend.com/docs) - Resend API dokümantasyonu
