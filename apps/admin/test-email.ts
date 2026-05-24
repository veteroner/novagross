// Test Script - Email Gönderimi
// Bu scripti çalıştırarak email sistemini test edebilirsiniz

import { getEmailService } from './src/lib/email/service';

async function testEmails() {
  const emailService = getEmailService();

  console.log('🚀 Email sistemi test ediliyor...\n');

  // Test 1: Şifre Sıfırlama E-postası
  console.log('📧 Test 1: Şifre sıfırlama e-postası gönderiliyor...');
  try {
    const result1 = await emailService.sendEmail({
      to: 'test@example.com', // Buraya kendi email adresinizi yazın
      subject: 'Novagross | Şifre sıfırlama bağlantısı',
      template: 'auth/password-reset',
      data: {
        resetUrl: 'https://novagross.com/reset-password?token=test_token_123',
        userName: 'Test Kullanıcı',
        requestedAt: new Date().toLocaleString('tr-TR'),
        ipAddress: '192.168.1.100',
        deviceLabel: 'Chrome on macOS',
        expiresInMinutes: 15,
      },
    });

    if (result1.success) {
      console.log('✅ Şifre sıfırlama e-postası gönderildi!');
      console.log(`   Resend ID: ${result1.id}\n`);
    } else {
      console.log('❌ Hata:', result1.error, '\n');
    }
  } catch (error: any) {
    console.log('❌ Hata:', error.message, '\n');
  }

  // Test 2: Şifre Değişti E-postası
  console.log('📧 Test 2: Şifre değişti e-postası gönderiliyor...');
  try {
    const result2 = await emailService.sendEmail({
      to: 'test@example.com', // Buraya kendi email adresinizi yazın
      subject: 'Novagross | Şifreniz değiştirildi',
      template: 'auth/password-changed',
      data: {
        userName: 'Test Kullanıcı',
        changedAt: new Date().toLocaleString('tr-TR'),
        ipAddress: '192.168.1.100',
        deviceLabel: 'Chrome on macOS',
      },
    });

    if (result2.success) {
      console.log('✅ Şifre değişti e-postası gönderildi!');
      console.log(`   Resend ID: ${result2.id}\n`);
    } else {
      console.log('❌ Hata:', result2.error, '\n');
    }
  } catch (error: any) {
    console.log('❌ Hata:', error.message, '\n');
  }

  console.log('✨ Test tamamlandı!');
  console.log('\n📊 Email loglarını kontrol etmek için:');
  console.log('   - Resend Dashboard: https://resend.com/emails');
  console.log('   - Email gelen kutunuzu kontrol edin');
}

testEmails().catch(console.error);
