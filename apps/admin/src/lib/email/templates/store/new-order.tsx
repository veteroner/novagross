import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
} from '@react-email/components';

interface NewOrderEmailProps {
  orderNumber: string;
  storeName: string;
  customerName: string;
  totalAmount: number;
  itemsCount: number;
}

export const NewOrderEmail = ({
  orderNumber = '#12345',
  storeName = 'Mağazanız',
  customerName = 'Müşteri',
  totalAmount = 1000,
  itemsCount = 3,
}: NewOrderEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎉 Yeni Sipariş!</Heading>
        
        <Text style={text}>
          Merhaba,
        </Text>

        <Text style={text}>
          <strong>{storeName}</strong> mağazanıza yeni bir sipariş geldi!
        </Text>

        <Section style={highlightBox}>
          <Text style={highlightText}>
            📦 <strong>Sipariş No:</strong> {orderNumber}
          </Text>
          <Text style={highlightText}>
            👤 <strong>Müşteri:</strong> {customerName}
          </Text>
          <Text style={highlightText}>
            📦 <strong>Ürün Sayısı:</strong> {itemsCount} adet
          </Text>
          <Text style={highlightText}>
            💰 <strong>Tutar:</strong> ₺{totalAmount.toFixed(2)}
          </Text>
        </Section>

        <Text style={text}>
          <strong>Sonraki Adımlar:</strong>
        </Text>

        <Text style={listItem}>
          1️⃣ Satıcı panelinizden sipariş detaylarını inceleyin
        </Text>
        <Text style={listItem}>
          2️⃣ Ürünleri hazırlayın ve paketleyin
        </Text>
        <Text style={listItem}>
          3️⃣ Kargo gönderimine başlayın
        </Text>
        <Text style={listItem}>
          4️⃣ Kargo takip numarasını sisteme girin
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          Siparişi satıcı panelinizden görüntüleyebilirsiniz.<br />
          Novagross Ekibi
        </Text>
      </Container>
    </Body>
  </Html>
);

export default NewOrderEmail;

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

const highlightBox = {
  backgroundColor: '#f0f7ff',
  border: '1px solid #d0e4ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const highlightText = {
  color: '#0066cc',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
};

const listItem = {
  color: '#333',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
  paddingLeft: '8px',
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
