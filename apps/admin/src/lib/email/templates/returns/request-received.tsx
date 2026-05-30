import * as React from 'react';
import { Section, Text, Button, Hr } from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface ReturnRequestReceivedProps {
  orderNumber: string;
  customerName: string;
  requestId: string;
  myReturnsUrl: string;
  quantity: number;
  reason: string;
}

export default function ReturnRequestReceivedEmail({
  orderNumber = 'NS-2026-001',
  customerName = 'Değerli Müşterimiz',
  requestId = 'xxxxxxxx',
  myReturnsUrl = 'https://novagross.com/hesabim/iadelerim',
  quantity = 1,
  reason = 'Ürün açıklamaya uygun değil',
}: ReturnRequestReceivedProps) {
  return (
    <EmailLayout preview={`İade talebiniz alındı - ${orderNumber}`}>
      <Section>
        <Text style={h1}>İade Talebiniz Alındı</Text>
        <Text style={p}>Merhaba {customerName},</Text>
        <Text style={p}>
          <strong>#{orderNumber}</strong> numaralı siparişiniz için iade talebiniz başarıyla
          alınmıştır.
        </Text>
      </Section>

      <Section style={infoBox}>
        <Text style={infoLabel}>Talep numarası</Text>
        <Text style={infoValue}>#{requestId.slice(0, 8)}</Text>

        <Text style={infoLabel}>İade adedi</Text>
        <Text style={infoValue}>{quantity}</Text>

        <Text style={infoLabel}>Neden</Text>
        <Text style={infoValue}>{reason}</Text>
      </Section>

      <Section>
        <Text style={p}>
          Talebiniz inceleme aşamasındadır. Sonuç en geç <strong>2 iş günü</strong> içinde size
          e-posta ile bildirilecektir.
        </Text>

        <Button href={myReturnsUrl} style={button}>
          İade Taleplerimi Görüntüle
        </Button>
      </Section>

      <Hr style={hr} />
      <Text style={footer}>Bu otomatik bir bilgilendirme e-postasıdır.</Text>
    </EmailLayout>
  );
}

const h1 = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 16px',
};
const p = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 12px' };
const infoBox = {
  background: '#F9FAFB',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};
const infoLabel = { fontSize: '12px', color: '#6B7280', margin: '8px 0 2px' };
const infoValue = { fontSize: '14px', color: '#111827', fontWeight: 600, margin: '0' };
const button = {
  background: '#111827',
  color: '#fff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '14px',
  display: 'inline-block',
  marginTop: '8px',
};
const hr = { border: 'none', borderTop: '1px solid #E5E7EB', margin: '24px 0' };
const footer = { fontSize: '12px', color: '#9CA3AF', margin: '0' };
