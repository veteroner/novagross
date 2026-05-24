import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Link, Button, Hr, Row, Column } from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface OrderShippedEmailProps {
  orderNumber: string;
  buyerName: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrierName?: string;
  estimatedDelivery?: string;
  items: Array<{
    name: string;
    quantity: number;
    imageUrl?: string;
  }>;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

export default function OrderShippedEmail({
  orderNumber = 'NS-2026-001',
  buyerName = 'Değerli Müşterimiz',
  trackingNumber = 'TR1234567890',
  trackingUrl = 'https://kargo.com/takip/TR1234567890',
  carrierName = 'Aras Kargo',
  estimatedDelivery = '18 Ocak 2026',
  items = [
    { name: 'Örnek Ürün', quantity: 2, imageUrl: 'https://via.placeholder.com/100' },
    { name: 'Başka Ürün', quantity: 1 },
  ],
  shippingAddress = {
    fullName: 'Ahmet Yılmaz',
    addressLine1: 'Atatürk Cad. No: 123',
    city: 'İstanbul',
    state: 'Kadıköy',
    postalCode: '34710',
  },
}: OrderShippedEmailProps) {
  return (
    <EmailLayout
      preview={`Siparişiniz kargoya verildi - ${orderNumber}`}
    >
      <Section style={heroSection}>
        <Text style={heroTitle}>🚚 Siparişiniz Kargoya Verildi!</Text>
        <Text style={heroSubtitle}>
          Harika haberler! <strong>#{orderNumber}</strong> numaralı siparişiniz kargoya teslim edildi.
        </Text>
      </Section>

      <Text style={greeting}>Merhaba {buyerName},</Text>
      
      <Text style={paragraph}>
        Siparişiniz <strong>{carrierName}</strong> tarafından adresinize doğru yola çıktı.
        Kargonuzu aşağıdaki takip numarası ile takip edebilirsiniz.
      </Text>

      {trackingNumber && (
        <Section style={trackingSection}>
          <Text style={trackingLabel}>Kargo Takip Numarası:</Text>
          <Text style={trackingNumberText}>{trackingNumber}</Text>
          {trackingUrl && (
            <Section style={buttonContainer}>
              <Button style={button} href={trackingUrl}>
                Kargonu Takip Et
              </Button>
            </Section>
          )}
        </Section>
      )}

      {estimatedDelivery && (
        <Section style={deliveryInfo}>
          <Text style={deliveryLabel}>📦 Tahmini Teslimat:</Text>
          <Text style={deliveryDate}>{estimatedDelivery}</Text>
        </Section>
      )}

      <Hr style={hr} />

      <Text style={sectionTitle}>Sipariş Özeti</Text>
      
      {items.map((item, index) => (
        <Section key={index} style={itemSection}>
          <Row>
            <Column style={itemColumn}>
              <Text style={itemName}>{item.name}</Text>
              <Text style={itemQuantity}>Adet: {item.quantity}</Text>
            </Column>
          </Row>
        </Section>
      ))}

      <Hr style={hr} />

      <Text style={sectionTitle}>Teslimat Adresi</Text>
      <Section style={addressSection}>
        <Text style={addressText}>
          <strong>{shippingAddress.fullName}</strong><br />
          {shippingAddress.addressLine1}<br />
          {shippingAddress.addressLine2 && <>{shippingAddress.addressLine2}<br /></>}
          {shippingAddress.state}, {shippingAddress.city} {shippingAddress.postalCode}
        </Text>
      </Section>

      <Hr style={hr} />

      <Text style={paragraph}>
        Siparişiniz elinize ulaştığında size bildirim göndereceğiz.
        Herhangi bir sorunuz olursa bizimle iletişime geçmekten çekinmeyin.
      </Text>

      <Text style={footer}>
        Teşekkür ederiz,<br />
        <strong>Novagross Ekibi</strong>
      </Text>
    </EmailLayout>
  );
}

const heroSection = {
  textAlign: 'center' as const,
  padding: '32px 24px',
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  marginBottom: '32px',
};

const heroTitle = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1e40af',
  margin: '0 0 12px 0',
};

const heroSubtitle = {
  fontSize: '16px',
  color: '#475569',
  margin: 0,
};

const greeting = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  marginBottom: '16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
};

const trackingSection = {
  backgroundColor: '#fef3c7',
  borderLeft: '4px solid #f59e0b',
  padding: '24px',
  margin: '24px 0',
  borderRadius: '4px',
};

const trackingLabel = {
  fontSize: '14px',
  color: '#92400e',
  margin: '0 0 8px 0',
  fontWeight: '600',
};

const trackingNumberText = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#92400e',
  margin: '0 0 16px 0',
  fontFamily: 'monospace',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '16px 0 0 0',
};

const button = {
  backgroundColor: '#f59e0b',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const deliveryInfo = {
  textAlign: 'center' as const,
  padding: '16px',
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  margin: '24px 0',
};

const deliveryLabel = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 4px 0',
};

const deliveryDate = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: 0,
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const sectionTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1f2937',
  marginBottom: '16px',
};

const itemSection = {
  marginBottom: '16px',
};

const itemColumn = {
  padding: '12px',
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
};

const itemName = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 4px 0',
};

const itemQuantity = {
  fontSize: '14px',
  color: '#6b7280',
  margin: 0,
};

const addressSection = {
  backgroundColor: '#f9fafb',
  padding: '16px',
  borderRadius: '8px',
};

const addressText = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#374151',
  margin: 0,
};

const footer = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#6b7280',
  marginTop: '32px',
};
