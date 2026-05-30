import * as React from 'react';
import { Section, Text, Button, Hr } from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface ReturnRejectedProps {
  orderNumber: string;
  customerName: string;
  productName: string;
  rejectionReason: string;
  myReturnsUrl: string;
}

export default function ReturnRejectedEmail({
  orderNumber = 'NS-2026-001',
  customerName = 'Değerli Müşterimiz',
  productName = 'Örnek Ürün',
  rejectionReason = 'Ürün kullanılmış durumda',
  myReturnsUrl = 'https://novagross.com/hesabim/iadelerim',
}: ReturnRejectedProps) {
  return (
    <EmailLayout preview={`İade talebiniz reddedildi - ${orderNumber}`}>
      <Section>
        <Text style={h1}>İade Talebiniz Reddedildi</Text>
        <Text style={p}>Merhaba {customerName},</Text>
        <Text style={p}>
          <strong>#{orderNumber}</strong> numaralı siparişinizdeki <strong>{productName}</strong>{' '}
          ürünü için iade talebiniz incelenmiş ve reddedilmiştir.
        </Text>
      </Section>

      <Section style={errorBox}>
        <Text style={infoLabel}>Red gerekçesi:</Text>
        <Text style={p}>{rejectionReason}</Text>
      </Section>

      <Section>
        <Text style={p}>
          Bu kararın haksız olduğunu düşünüyorsanız <a href="https://novagross.com/iletisim">
            iletişim sayfası
          </a>{' '}
          üzerinden bize ulaşabilirsiniz.
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

const h1 = { fontSize: '24px', fontWeight: 700, color: '#991B1B', margin: '0 0 16px' };
const p = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 12px' };
const errorBox = {
  background: '#FEE2E2',
  border: '1px solid #FECACA',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '16px 0',
};
const infoLabel = { fontSize: '12px', color: '#991B1B', margin: '0 0 4px' };
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
