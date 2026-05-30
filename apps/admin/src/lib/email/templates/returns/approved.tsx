import * as React from 'react';
import { Section, Text, Button, Hr } from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface ReturnApprovedProps {
  orderNumber: string;
  customerName: string;
  productName: string;
  quantity: number;
  refundAmount: number;
  adminNote?: string;
  myReturnsUrl: string;
}

export default function ReturnApprovedEmail({
  orderNumber = 'NS-2026-001',
  customerName = 'Değerli Müşterimiz',
  productName = 'Örnek Ürün',
  quantity = 1,
  refundAmount = 500,
  adminNote,
  myReturnsUrl = 'https://novagross.com/hesabim/iadelerim',
}: ReturnApprovedProps) {
  return (
    <EmailLayout preview={`İadeniz onaylandı - ${orderNumber}`}>
      <Section>
        <Text style={h1}>✅ İade Talebiniz Onaylandı</Text>
        <Text style={p}>Merhaba {customerName},</Text>
        <Text style={p}>
          <strong>#{orderNumber}</strong> numaralı siparişinizdeki <strong>{productName}</strong>{' '}
          ürünü için iade talebiniz onaylanmıştır.
        </Text>
      </Section>

      <Section style={successBox}>
        <Text style={infoValue}>
          ₺
          {Number(refundAmount).toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
        <Text style={infoLabel}>{quantity} adet · İade tutarı</Text>
      </Section>

      {adminNote ? (
        <Section style={noteBox}>
          <Text style={infoLabel}>Admin notu:</Text>
          <Text style={p}>{adminNote}</Text>
        </Section>
      ) : null}

      <Section>
        <Text style={p}>
          <strong>Sıradaki adım:</strong> Ürünü kargo ile geri gönderim talimatları en geç 1 iş
          günü içinde size iletilecektir. Para iadeniz, ürün satıcıya ulaşıp incelendikten sonra
          orijinal ödeme yönteminize yapılacaktır.
        </Text>

        <Button href={myReturnsUrl} style={button}>
          İade Detayını Görüntüle
        </Button>
      </Section>

      <Hr style={hr} />
      <Text style={footer}>Novagross — Alışverişin Yeni Adresi</Text>
    </EmailLayout>
  );
}

const h1 = { fontSize: '24px', fontWeight: 700, color: '#065F46', margin: '0 0 16px' };
const p = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 12px' };
const successBox = {
  background: '#D1FAE5',
  border: '1px solid #6EE7B7',
  borderRadius: '8px',
  padding: '24px',
  margin: '16px 0',
  textAlign: 'center' as const,
};
const noteBox = {
  background: '#EFF6FF',
  border: '1px solid #BFDBFE',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '16px 0',
};
const infoLabel = { fontSize: '13px', color: '#065F46', margin: '4px 0 0' };
const infoValue = { fontSize: '32px', color: '#065F46', fontWeight: 700, margin: '0' };
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
