import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Link, Button, Hr } from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface EmailVerificationEmailProps {
  verificationUrl: string;
  userName: string;
  expiresInHours: number;
}

export default function EmailVerificationEmail({
  verificationUrl = 'https://novagross.com/api/auth/verify-email?token=abc123',
  userName = 'Değerli Müşterimiz',
  expiresInHours = 24,
}: EmailVerificationEmailProps) {
  return (
    <EmailLayout
      preview="E-posta adresinizi doğrulayın"
    >
      <Text style={paragraph}>Merhaba {userName},</Text>
      
      <Text style={paragraph}>
        Novagross hesabınızı oluşturduğunuz için teşekkür ederiz! Hesabınızı
        aktifleştirmek için e-posta adresinizi doğrulamanız gerekmektedir.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={verificationUrl}>
          E-posta Adresimi Doğrula
        </Button>
      </Section>

      <Text style={paragraph}>
        veya aşağıdaki bağlantıyı tarayıcınıza kopyalayın:
      </Text>
      
      <Text style={linkText}>
        <Link href={verificationUrl} style={link}>
          {verificationUrl}
        </Link>
      </Text>

      <Hr style={hr} />

      <Text style={footer}>
        Bu bağlantı <strong>{expiresInHours} saat</strong> boyunca geçerlidir.
        <br />
        Bu e-postayı siz talep etmediyseniz, güvenle yok sayabilirsiniz.
      </Text>
    </EmailLayout>
  );
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const linkText = {
  fontSize: '14px',
  color: '#6b7280',
  wordBreak: 'break-all' as const,
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footer = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#6b7280',
};
