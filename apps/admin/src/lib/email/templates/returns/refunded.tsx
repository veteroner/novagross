import * as React from 'react';
import { Section, Text, Button, Hr } from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface ReturnRefundedProps {
  orderNumber: string;
  customerName: string;
  productName: string;
  refundAmount: number;
  myReturnsUrl: string;
}

export default function ReturnRefundedEmail({
  orderNumber = 'NS-2026-001',
  customerName = 'Değerli Müşterimiz',
  productName = 'Örnek Ürün',
  refundAmount = 500,
  myReturnsUrl = 'https://novagross.com/hesabim/iadelerim',
}: ReturnRefundedProps) {
  return (
    <EmailLayout preview={`Para iadesi tamamlandı - ${orderNumber}`}>
      <Section>
        <Text style={h1}>💸 Para İadeniz Tamamlandı</Text>
        <Text style={p}>Merhaba {customerName},</Text>
        <Text style={p}>
          <strong>#{orderNumber}</strong> numaralı siparişinizdeki <strong>{productName}</strong>{' '}
          ürünü için iade işleminiz başarıyla tamamlanmıştır.
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
        <Text style={infoLabel}>orijinal ödeme yönteminize iade edildi</Text>
      </Section>

      <Section>
        <Text style={p}>
          Para iadeniz banka tarafına bağlı olarak <strong>3-7 iş günü</strong> içinde hesabınıza
          yansıyacaktır. Eğer 7 iş günü içinde paranız yatmazsa lütfen bizimle iletişime geçin.
        </Text>

        <Button href={myReturnsUrl} style={button}>
          Detayları Görüntüle
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
