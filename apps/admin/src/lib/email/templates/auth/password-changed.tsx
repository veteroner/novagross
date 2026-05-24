// Password Changed Confirmation Email

import { Heading, Hr, Link, Text } from '@react-email/components';
import { EmailLayout, Button, InfoBox, emailStyles } from '../base/layout';

interface PasswordChangedProps {
  userName?: string;
  changedAt?: string;
  ipAddress?: string;
  deviceLabel?: string;
}

export default function PasswordChanged({
  userName = 'Değerli Kullanıcı',
  changedAt,
  ipAddress,
  deviceLabel,
}: PasswordChangedProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com';
  
  return (
    <EmailLayout preview="Novagross şifreniz değiştirildi">
      <Heading style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        ✅ Şifreniz Başarıyla Değiştirildi
      </Heading>

      <Text style={{ fontSize: '16px', lineHeight: '24px', marginBottom: '20px' }}>
        Merhaba {userName},
      </Text>

      <Text style={{ fontSize: '16px', lineHeight: '24px', marginBottom: '20px' }}>
        Hesabınızın şifresi başarıyla değiştirildi. Bu değişikliği siz yaptıysanız,
        herhangi bir işlem yapmanıza gerek yok.
      </Text>

      <InfoBox
        title="Değişiklik Detayları"
        items={[
          { label: 'Değişiklik Zamanı', value: changedAt || new Date().toLocaleString('tr-TR') },
          ...(ipAddress ? [{ label: 'IP Adresi', value: ipAddress }] : []),
          ...(deviceLabel ? [{ label: 'Cihaz', value: deviceLabel }] : []),
        ]}
      />

      <Hr style={emailStyles.hr} />

      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#e74c3c', marginBottom: '10px' }}>
        <strong>🚨 Bu İşlemi Siz Yapmadıysanız:</strong>
      </Text>

      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666', marginBottom: '20px' }}>
        Hesabınız güvenlik riski altında olabilir. Lütfen derhal aşağıdaki adımları uygulayın:
      </Text>

      <div style={{ textAlign: 'center', margin: '30px 0' }}>
        <Button href={`${siteUrl}/account/security`}>
          Hesabımı Güvenli Hale Getir
        </Button>
      </div>

      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666', marginBottom: '10px' }}>
        1. Hemen{' '}
        <Link href={`${siteUrl}/forgot-password`} style={emailStyles.link}>
          şifrenizi değiştirin
        </Link>
      </Text>
      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666', marginBottom: '10px' }}>
        2. Tüm aktif oturumları sonlandırın
      </Text>
      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666', marginBottom: '10px' }}>
        3. İki faktörlü doğrulamayı (2FA) aktifleştirin
      </Text>
      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666', marginBottom: '20px' }}>
        4.{' '}
        <Link href={`${siteUrl}/support`} style={emailStyles.link}>
          Destek ekibimizle
        </Link>{' '}
        iletişime geçin
      </Text>

      <Hr style={emailStyles.hr} />

      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666' }}>
        Güvenliğiniz bizim için önceliklidir. Hesabınızla ilgili herhangi bir şüphe
        duyduğunuzda bize ulaşmaktan çekinmeyin.
      </Text>
    </EmailLayout>
  );
}
