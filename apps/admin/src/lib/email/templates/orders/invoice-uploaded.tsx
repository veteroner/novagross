import * as React from 'react';
import { Section, Text, Button } from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface InvoiceUploadedEmailProps {
  orderNumber: string;
  storeName: string;
  orderUrl: string;
}

export default function InvoiceUploadedEmail({
  orderNumber = 'NS-2026-001',
  storeName = 'Örnek Mağaza',
  orderUrl = 'https://novagross.com/hesabim/siparislerim',
}: InvoiceUploadedEmailProps) {
  return (
    <EmailLayout preview={`#${orderNumber} siparişinizin faturası hazır`}>
      <Section style={heroSection}>
        <Text style={heroTitle}>📄 Faturanız Hazır</Text>
        <Text style={heroSubtitle}>
          <strong>{storeName}</strong>, <strong>#{orderNumber}</strong> numaralı siparişinizin
          faturasını sisteme yükledi.
        </Text>
      </Section>

      <Text style={paragraph}>
        Faturanızı sipariş detay sayfasından PDF olarak indirebilirsiniz.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={orderUrl}>
          Faturayı Görüntüle
        </Button>
      </Section>

      <Text style={footer}>
        Teşekkür ederiz,
        <br />
        <strong>Novagross Ekibi</strong>
      </Text>
    </EmailLayout>
  );
}

const heroSection = {
  textAlign: 'center' as const,
  padding: '32px 24px',
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  marginBottom: '32px',
};

const heroTitle = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#166534',
  margin: '0 0 12px 0',
};

const heroSubtitle = {
  fontSize: '16px',
  color: '#475569',
  margin: 0,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button = {
  backgroundColor: '#16A34A',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const footer = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#6b7280',
  marginTop: '32px',
};
