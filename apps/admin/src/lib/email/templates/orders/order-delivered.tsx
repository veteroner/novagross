import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Link, Button, Hr, Row, Column } from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface OrderDeliveredEmailProps {
  orderNumber: string;
  buyerName: string;
  deliveredAt: string;
  items: Array<{
    name: string;
    productId: string;
    quantity: number;
  }>;
  totalAmount: string;
  reviewUrl?: string;
  supportUrl?: string;
}

export default function OrderDeliveredEmail({
  orderNumber = 'NS-2026-001',
  buyerName = 'Değerli Müşterimiz',
  deliveredAt = '15 Ocak 2026, 14:30',
  items = [
    { name: 'Örnek Ürün', productId: '123', quantity: 2 },
    { name: 'Başka Ürün', productId: '456', quantity: 1 },
  ],
  totalAmount = '₺1.250,00',
  reviewUrl = 'https://novagross.com/siparis/NS-2026-001/degerlendirme',
  supportUrl = 'https://novagross.com/destek',
}: OrderDeliveredEmailProps) {
  return (
    <EmailLayout
      preview={`Siparişiniz teslim edildi - ${orderNumber}`}
    >
      <Section style={heroSection}>
        <Text style={heroEmoji}>🎉</Text>
        <Text style={heroTitle}>Siparişiniz Teslim Edildi!</Text>
        <Text style={heroSubtitle}>
          <strong>#{orderNumber}</strong> numaralı siparişiniz başarıyla teslim edildi.
        </Text>
      </Section>

      <Text style={greeting}>Merhaba {buyerName},</Text>
      
      <Text style={paragraph}>
        Siparişinizin elinize ulaştığını görmek bizi çok mutlu etti! 
        Ürünlerinizin keyifle kullanmanızı dileriz.
      </Text>

      <Section style={deliveryInfo}>
        <Text style={deliveryLabel}>📦 Teslimat Zamanı:</Text>
        <Text style={deliveryDate}>{deliveredAt}</Text>
      </Section>

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

      <Section style={totalSection}>
        <Row>
          <Column>
            <Text style={totalLabel}>Toplam Tutar:</Text>
          </Column>
          <Column align="right">
            <Text style={totalAmountStyle}>{totalAmount}</Text>
          </Column>
        </Row>
      </Section>

      <Hr style={hr} />

      {reviewUrl && (
        <>
          <Section style={reviewSection}>
            <Text style={reviewTitle}>💝 Deneyiminizi Paylaşın</Text>
            <Text style={reviewText}>
              Ürünlerimiz hakkındaki düşünceleriniz bizim için çok değerli!
              Birkaç dakikanızı ayırıp değerlendirme yapar mısınız?
            </Text>
            <Section style={buttonContainer}>
              <Button style={reviewButton} href={reviewUrl}>
                ⭐ Ürünleri Değerlendir
              </Button>
            </Section>
            <Text style={reviewNote}>
              Değerlendirmeniz diğer müşterilere yardımcı olacak ve bize hizmet kalitemizi
              artırma konusunda yol gösterecektir.
            </Text>
          </Section>

          <Hr style={hr} />
        </>
      )}

      <Text style={sectionTitle}>Yardıma mı İhtiyacınız Var?</Text>
      
      <Section style={supportSection}>
        <Text style={supportText}>
          • Ürünlerinizle ilgili herhangi bir sorun mu yaşıyorsunuz?<br />
          • İade veya değişim talebiniz mi var?<br />
          • Sorularınız için destek ekibimiz 7/24 hizmetinizde!
        </Text>
        {supportUrl && (
          <Section style={buttonContainer}>
            <Button style={supportButton} href={supportUrl}>
              Destek Ekibine Ulaş
            </Button>
          </Section>
        )}
      </Section>

      <Hr style={hr} />

      <Text style={paragraph}>
        Novagross'u tercih ettiğiniz için teşekkür ederiz. 
        Sizlere en iyi alışveriş deneyimini sunmak için buradayız!
      </Text>

      <Text style={footer}>
        Sevgilerle,<br />
        <strong>Novagross Ekibi</strong>
      </Text>

      <Section style={bonusSection}>
        <Text style={bonusText}>
          💡 <strong>İpucu:</strong> Hesap sayfanızdan tüm siparişlerinizi görebilir,
          faturalarınızı indirebilir ve destek taleplerini takip edebilirsiniz.
        </Text>
      </Section>
    </EmailLayout>
  );
}

const heroSection = {
  textAlign: 'center' as const,
  padding: '32px 24px',
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  marginBottom: '32px',
};

const heroEmoji = {
  fontSize: '48px',
  margin: '0 0 16px 0',
};

const heroTitle = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#15803d',
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
  marginBottom: '12px',
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

const totalSection = {
  marginTop: '16px',
  padding: '16px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
};

const totalLabel = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: 0,
};

const totalAmountStyle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#15803d',
  margin: 0,
};

const reviewSection = {
  backgroundColor: '#fef3c7',
  padding: '24px',
  borderRadius: '8px',
  textAlign: 'center' as const,
};

const reviewTitle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#92400e',
  margin: '0 0 12px 0',
};

const reviewText = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#78350f',
  margin: '0 0 20px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '16px 0',
};

const reviewButton = {
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

const reviewNote = {
  fontSize: '13px',
  color: '#92400e',
  margin: '16px 0 0 0',
  fontStyle: 'italic',
};

const supportSection = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '8px',
};

const supportText = {
  fontSize: '15px',
  lineHeight: '28px',
  color: '#374151',
  margin: '0 0 16px 0',
};

const supportButton = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const footer = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#6b7280',
  marginTop: '32px',
};

const bonusSection = {
  marginTop: '32px',
  padding: '16px',
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  borderLeft: '4px solid #2563eb',
};

const bonusText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#1e40af',
  margin: 0,
};
