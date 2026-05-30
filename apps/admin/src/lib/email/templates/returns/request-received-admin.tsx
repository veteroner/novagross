import * as React from 'react';
import { Section, Text, Button, Hr } from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface ReturnRequestAdminProps {
  orderNumber: string;
  requestId: string;
  quantity: number;
  reason: string;
  reasonCategory: string;
  customerEmail?: string;
  reviewUrl: string;
}

export default function ReturnRequestAdminEmail({
  orderNumber = 'NS-2026-001',
  requestId = 'xxx',
  quantity = 1,
  reason = 'Ürün hasarlı',
  reasonCategory = 'damaged_in_shipping',
  customerEmail = 'musteri@example.com',
  reviewUrl = 'https://admin.novagross.com/iadeler/xxx',
}: ReturnRequestAdminProps) {
  return (
    <EmailLayout preview={`Yeni iade talebi - ${orderNumber}`}>
      <Section>
        <Text style={h1}>Yeni İade Talebi</Text>
        <Text style={p}>
          <strong>#{orderNumber}</strong> numaralı sipariş için yeni bir iade talebi geldi.
        </Text>
      </Section>

      <Section style={infoBox}>
        <Text style={infoLabel}>Talep ID</Text>
        <Text style={infoValue}>#{requestId.slice(0, 8)}</Text>

        <Text style={infoLabel}>Müşteri</Text>
        <Text style={infoValue}>{customerEmail}</Text>

        <Text style={infoLabel}>Adet</Text>
        <Text style={infoValue}>{quantity}</Text>

        <Text style={infoLabel}>Kategori</Text>
        <Text style={infoValue}>{reasonCategory}</Text>

        <Text style={infoLabel}>Açıklama</Text>
        <Text style={infoValue}>{reason}</Text>
      </Section>

      <Section>
        <Button href={reviewUrl} style={button}>
          Talebi İncele
        </Button>
      </Section>

      <Hr style={hr} />
      <Text style={footer}>Novagross admin bildirim sistemi</Text>
    </EmailLayout>
  );
}

const h1 = { fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 16px' };
const p = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 12px' };
const infoBox = {
  background: '#FEF3C7',
  border: '1px solid #FDE68A',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};
const infoLabel = { fontSize: '12px', color: '#92400E', margin: '8px 0 2px' };
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
};
const hr = { border: 'none', borderTop: '1px solid #E5E7EB', margin: '24px 0' };
const footer = { fontSize: '12px', color: '#9CA3AF', margin: '0' };
