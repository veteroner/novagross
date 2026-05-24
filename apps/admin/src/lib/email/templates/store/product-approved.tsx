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

interface ProductApprovedEmailProps {
  productName: string;
  productSlug: string;
  storeName: string;
}

export const ProductApprovedEmail = ({
  productName = 'Örnek Ürün',
  productSlug = 'ornek-urun',
  storeName = 'Mağazanız',
}: ProductApprovedEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ Ürününüz Onaylandı!</Heading>
        
        <Text style={text}>
          Merhaba,
        </Text>

        <Text style={text}>
          <strong>{productName}</strong> ürününüz onaylandı ve artık mağazanızda satışa sunuldu.
        </Text>

        <Section style={highlightBox}>
          <Text style={highlightText}>
            📦 <strong>Ürün:</strong> {productName}
          </Text>
          <Text style={highlightText}>
            🏪 <strong>Mağaza:</strong> {storeName}
          </Text>
          <Text style={highlightText}>
            🔗 <strong>Ürün Linki:</strong> novagross.com/urun/{productSlug}
          </Text>
        </Section>

        <Text style={text}>
          Ürününüz şimdi müşterileriniz tarafından görülebilir ve satın alınabilir.
        </Text>

        <Button
          style={button}
          href={`${process.env.NEXT_PUBLIC_SITE_URL}/urun/${productSlug}`}
        >
          Ürünü Görüntüle
        </Button>

        <Hr style={hr} />

        <Text style={footer}>
          Novagross Ekibi
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ProductApprovedEmail;

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
  backgroundColor: '#f0fff4',
  border: '1px solid #c6f6d5',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const highlightText = {
  color: '#22543d',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
};

const button = {
  backgroundColor: '#48bb78',
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
