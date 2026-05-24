// Order Confirmation (Buyer) Email Template

import { Heading, Hr, Img, Section, Text } from '@react-email/components';
import { EmailLayout, Button, InfoBox, emailStyles } from '../base/layout';

export interface OrderConfirmationItem {
  name: string;
  image?: string;
  quantity: number;
  price: number;
}

export interface OrderConfirmationProps {
  userName?: string;
  orderNumber: string;
  orderDate?: string;
  items: OrderConfirmationItem[];
  totalAmount: number;
  shippingAddress?: string;
  orderUrl?: string;
  trackingUrl?: string;
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

export default function OrderConfirmation({
  userName = 'Değerli Müşterimiz',
  orderNumber,
  orderDate,
  items,
  totalAmount,
  shippingAddress,
  orderUrl,
  trackingUrl,
}: OrderConfirmationProps) {
  const effectiveOrderDate = orderDate || new Date().toLocaleString('tr-TR');

  return (
    <EmailLayout preview={`Siparişiniz alındı! (#${orderNumber})`}>
      <Heading style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '14px' }}>
        Siparişiniz Alındı
      </Heading>

      <Text style={{ fontSize: '16px', lineHeight: '24px', marginBottom: '14px' }}>
        Merhaba {userName},
      </Text>

      <Text style={{ fontSize: '16px', lineHeight: '24px', marginBottom: '18px' }}>
        Siparişiniz başarıyla alındı. Sipariş detaylarınızı aşağıda bulabilirsiniz.
      </Text>

      <InfoBox
        title="Sipariş Bilgileri"
        items={[
          { label: 'Sipariş No', value: `#${orderNumber}` },
          { label: 'Sipariş Tarihi', value: effectiveOrderDate },
          { label: 'Toplam', value: formatTRY(totalAmount) },
        ]}
      />

      <Section style={{ marginTop: '10px', marginBottom: '10px' }}>
        <Text style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 10px 0' }}>
          Ürünler
        </Text>

        {items.map((item, idx) => (
          <Section
            key={idx}
            style={{
              display: 'flex',
              padding: '12px 0',
              borderTop: idx === 0 ? '1px solid #e6ebf1' : undefined,
              borderBottom: '1px solid #e6ebf1',
              gap: '12px',
            }}
          >
            {item.image ? (
              <Img
                src={item.image}
                width="64"
                height="64"
                alt={item.name}
                style={{ borderRadius: '8px', objectFit: 'cover' as const }}
              />
            ) : null}

            <Section style={{ flex: 1 }}>
              <Text style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                {item.name}
              </Text>
              <Text style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#525f7f' }}>
                Adet: {item.quantity}
              </Text>
            </Section>

            <Text style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#111827' }}>
              {formatTRY(item.price)}
            </Text>
          </Section>
        ))}
      </Section>

      {shippingAddress ? (
        <InfoBox title="Teslimat Adresi" items={[{ label: 'Adres', value: shippingAddress }]} />
      ) : null}

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        {orderUrl ? <Button href={orderUrl}>Siparişimi Görüntüle</Button> : null}
        {!orderUrl && trackingUrl ? <Button href={trackingUrl}>Kargo Takip</Button> : null}
      </div>

      <Hr style={emailStyles.hr} />

      <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#666' }}>
        Siparişiniz hazırlanırken sizi bilgilendirmeye devam edeceğiz.
      </Text>
    </EmailLayout>
  );
}
