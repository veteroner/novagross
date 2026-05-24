// OTP Code Email Template

import { Heading, Hr, Text } from '@react-email/components';
import { EmailLayout, InfoBox, emailStyles } from '../base/layout';

export interface OtpCodeProps {
  userName?: string;
  otpCode: string;
  purpose?: string;
  requestedAt?: string;
  ipAddress?: string;
  deviceLabel?: string;
  expiresInMinutes?: number;
}

export default function OtpCode({
  userName = 'Değerli Kullanıcı',
  otpCode,
  purpose = 'Giriş doğrulama',
  requestedAt,
  ipAddress,
  deviceLabel,
  expiresInMinutes = 10,
}: OtpCodeProps) {
  return (
    <EmailLayout preview={`Novagross doğrulama kodunuz: ${otpCode}`}> 
      <Heading style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        Doğrulama Kodu
      </Heading>

      <Text style={{ fontSize: '16px', lineHeight: '24px', marginBottom: '16px' }}>
        Merhaba {userName},
      </Text>

      <Text style={{ fontSize: '16px', lineHeight: '24px', marginBottom: '16px' }}>
        {purpose} işlemi için doğrulama kodunuz aşağıdadır:
      </Text>

      <div
        style={{
          textAlign: 'center',
          margin: '24px 0',
          padding: '16px',
          backgroundColor: '#f6f9fc',
          borderRadius: '8px',
          letterSpacing: '6px',
          fontSize: '28px',
          fontWeight: 700,
          color: '#111827',
        }}
      >
        {otpCode}
      </div>

      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666', marginBottom: '16px' }}>
        Bu kod {expiresInMinutes} dakika boyunca geçerlidir. Bu kodu kimseyle paylaşmayın.
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

      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666' }}>
        Bu işlemi siz başlatmadıysanız hesabınızın şifresini değiştirmenizi öneririz.
      </Text>
    </EmailLayout>
  );
}
