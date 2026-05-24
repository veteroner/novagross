// Password Reset Email Template

import { Heading, Hr, Link, Text } from '@react-email/components';
import { EmailLayout, Button, InfoBox, emailStyles } from '../base/layout';

interface PasswordResetProps {
  resetUrl: string;
  userName?: string;
  requestedAt?: string;
  ipAddress?: string;
  deviceLabel?: string;
  expiresInMinutes?: number;
}

export default function PasswordReset({
  resetUrl,
  userName = 'Değerli Kullanıcı',
  requestedAt,
  ipAddress,
  deviceLabel,
  expiresInMinutes = 15,
}: PasswordResetProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com';
  
  return (
    <EmailLayout preview="Novagross şifre sıfırlama bağlantınız">
      <Heading style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        Şifre Sıfırlama Talebi
      </Heading>

      <Text style={{ fontSize: '16px', lineHeight: '24px', marginBottom: '20px' }}>
        Merhaba {userName},
      </Text>

      <Text style={{ fontSize: '16px', lineHeight: '24px', marginBottom: '20px' }}>
        Hesabınız için bir şifre sıfırlama talebi aldık. Şifrenizi sıfırlamak için aşağıdaki
        butona tıklayın:
      </Text>

      <div style={{ textAlign: 'center', margin: '30px 0' }}>
        <Button href={resetUrl}>
          Şifremi Sıfırla
        </Button>
      </div>

      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666', marginBottom: '20px' }}>
        Eğer buton çalışmıyorsa, aşağıdaki linki tarayıcınıza kopyalayıp yapıştırın:
      </Text>
      
      <Text style={{ 
        fontSize: '12px', 
        wordBreak: 'break-all',
        backgroundColor: '#f6f9fc',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '20px',
      }}>
        {resetUrl}
      </Text>

      <InfoBox
        title="Güvenlik Bilgileri"
        items={[
          { label: 'Talep Zamanı', value: requestedAt || new Date().toLocaleString('tr-TR') },
          ...(ipAddress ? [{ label: 'IP Adresi', value: ipAddress }] : []),
          ...(deviceLabel ? [{ label: 'Cihaz', value: deviceLabel }] : []),
          { label: 'Geçerlilik Süresi', value: `${expiresInMinutes} dakika` },
        ]}
      />

      <Hr style={emailStyles.hr} />

      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#e74c3c', marginBottom: '10px' }}>
        <strong>⚠️ Önemli Güvenlik Uyarısı:</strong>
      </Text>

      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666', marginBottom: '10px' }}>
        • Bu talebi siz yapmadıysanız, bu e-postayı dikkate almayın.
      </Text>
      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666', marginBottom: '10px' }}>
        • Link {expiresInMinutes} dakika sonra geçersiz olacaktır.
      </Text>
      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666', marginBottom: '20px' }}>
        • Şifrenizi asla kimseyle paylaşmayın.
      </Text>

      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666', marginBottom: '10px' }}>
        Şüpheli bir durum fark ettiyseniz veya yardıma ihtiyacınız varsa, lütfen{' '}
        <Link href={`${siteUrl}/support`} style={emailStyles.link}>
          destek ekibimizle
        </Link>{' '}
        iletişime geçin.
      </Text>
    </EmailLayout>
  );
}
