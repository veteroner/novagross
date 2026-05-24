// New Order (Seller) Email Template

import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout, Button, InfoBox, emailStyles } from '../base/layout';

export interface SellerOrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface NewOrderSellerProps {
  storeName?: string;
  orderNumber: string;
  orderDate?: string;
  buyerName?: string;
  items: SellerOrderItem[];
  subtotalAmount: number;
  adminOrderUrl?: string;
}

function formatTRY(amount: number) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} TL`;
  }
}

export default function NewOrderSeller({
  storeName = 'Mağazanız',
  orderNumber,
  orderDate,
  buyerName,
  items,
  subtotalAmount,
  adminOrderUrl,
}: NewOrderSellerProps) {
  const effectiveOrderDate = orderDate || new Date().toLocaleString('tr-TR');

  return (
    <EmailLayout preview={`Yeni sipariş! (#${orderNumber})`}>
      <Heading style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '14px' }}>
        Yeni Sipariş Aldınız
      </Heading>

      <Text style={{ fontSize: '16px', lineHeight: '24px', marginBottom: '18px' }}>
        {storeName} için yeni bir sipariş oluşturuldu.
      </Text>

      <InfoBox
        title="Sipariş Özeti"
        items={[
          { label: 'Sipariş No', value: `#${orderNumber}` },
          { label: 'Sipariş Tarihi', value: effectiveOrderDate },
          ...(buyerName ? [{ label: 'Alıcı', value: buyerName }] : []),
          { label: 'Tutar', value: formatTRY(subtotalAmount) },
        ]}
      />

      <Section style={{ marginTop: '10px', marginBottom: '10px' }}>
        <Text style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 10px 0' }}>
          Sipariş Kalemleri
        </Text>

        {items.map((item, idx) => (
          <Section
            key={idx}
            style={{
              padding: '10px 0',
              borderTop: idx === 0 ? '1px solid #e6ebf1' : undefined,
              borderBottom: '1px solid #e6ebf1',
            }}
          >
            <Text style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#111827' }}>
              {item.name}
            </Text>
            <Text style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#525f7f' }}>
              Adet: {item.quantity} • Birim: {formatTRY(item.price)}
            </Text>
          </Section>
        ))}
      </Section>

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        {adminOrderUrl ? <Button href={adminOrderUrl}>Siparişi Yönet</Button> : null}
      </div>

      <Hr style={emailStyles.hr} />

      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666' }}>
        Siparişi en kısa sürede hazırlayıp kargoya vermeyi unutmayın.
      </Text>
    </EmailLayout>
  );
}
