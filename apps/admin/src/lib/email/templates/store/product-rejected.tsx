import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
} from '@react-email/components';

interface ProductRejectedEmailProps {
  productName: string;
  storeName: string;
  rejectionReason: string;
}

export const ProductRejectedEmail = ({
  productName = 'Örnek Ürün',
  storeName = 'Mağazanız',
  rejectionReason = 'Ürün açıklaması yetersiz',
}: ProductRejectedEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Ürün Onay Durumu</Heading>
        
        <Text style={text}>
          Merhaba,
        </Text>

        <Text style={text}>
          <strong>{productName}</strong> ürününüz maalesef onaylanamamıştır.
        </Text>

        <Section style={warningBox}>
          <Text style={warningTitle}>❌ Red Nedeni:</Text>
          <Text style={warningText}>{rejectionReason}</Text>
        </Section>

        <Text style={text}>
          <strong>Ne yapabilirsiniz?</strong>
        </Text>

        <Text style={listItem}>
          1️⃣ Ürün bilgilerini red nedenine göre düzenleyin
        </Text>
        <Text style={listItem}>
          2️⃣ Gerekli düzeltmeleri yapın
        </Text>
        <Text style={listItem}>
          3️⃣ Ürünü tekrar onaya gönderin
        </Text>

        <Button
          style={button}
          href={`${process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.novagross.com'}/seller/products`}
        >
          Ürünleri Düzenle
        </Button>

        <Hr style={hr} />

        <Text style={footer}>
          Sorularınız için satıcı destek ekibimizle iletişime geçebilirsiniz.<br />
          Novagross Ekibi
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ProductRejectedEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const warningBox = {
  backgroundColor: '#fff5f5',
  border: '1px solid #ffdddd',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const warningTitle = {
  color: '#c53030',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const warningText = {
  color: '#742a2a',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
};

const listItem = {
  color: '#333',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
  paddingLeft: '8px',
};

const button = {
  backgroundColor: '#0066cc',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '24px 0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
};
