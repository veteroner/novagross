import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Link, Button, Hr, Row, Column } from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface OrderCancelledEmailProps {
  orderNumber: string;
  buyerName: string;
  cancelledAt: string;
  cancellationReason?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  totalAmount: string;
  refundAmount: string;
  refundMethod: string;
  refundEta?: string;
  supportUrl?: string;
}

export default function OrderCancelledEmail({
  orderNumber = 'NS-2026-001',
  buyerName = 'Değerli Müşterimiz',
  cancelledAt = '15 Ocak 2026, 14:30',
  cancellationReason = 'Müşteri talebi',
  items = [
    { name: 'Örnek Ürün', quantity: 2, price: '₺500,00' },
    { name: 'Başka Ürün', quantity: 1, price: '₺750,00' },
  ],
  totalAmount = '₺1.250,00',
  refundAmount = '₺1.250,00',
  refundMethod = 'Kredi Kartı',
  refundEta = '3-5 iş günü',
  supportUrl = 'https://novagross.com/destek',
}: OrderCancelledEmailProps) {
  return (
    <EmailLayout
      preview={`Siparişiniz iptal edildi - ${orderNumber}`}
    >
      <Section style={heroSection}>
        <Text style={heroEmoji}>🔔</Text>
        <Text style={heroTitle}>Siparişiniz İptal Edildi</Text>
        <Text style={heroSubtitle}>
          <strong>#{orderNumber}</strong> numaralı siparişiniz iptal edilmiştir.
        </Text>
      </Section>

      <Text style={greeting}>Merhaba {buyerName},</Text>
      
      <Text style={paragraph}>
        <strong>#{orderNumber}</strong> numaralı siparişinizin iptal edildiğini 
        bildirmek isteriz. İptal işlemi başarıyla tamamlanmıştır.
      </Text>

      <Section style={infoBox}>
        <Row>
          <Column style={infoColumn}>
            <Text style={infoLabel}>İptal Tarihi:</Text>
            <Text style={infoValue}>{cancelledAt}</Text>
          </Column>
        </Row>
        {cancellationReason && (
          <Row>
            <Column style={infoColumn}>
              <Text style={infoLabel}>İptal Nedeni:</Text>
              <Text style={infoValue}>{cancellationReason}</Text>
            </Column>
          </Row>
        )}
      </Section>

      <Hr style={hr} />

      <Text style={sectionTitle}>İptal Edilen Ürünler</Text>
      
      {items.map((item, index) => (
        <Section key={index} style={itemSection}>
          <Row>
            <Column style={itemNameColumn}>
              <Text style={itemName}>{item.name}</Text>
              <Text style={itemQuantity}>Adet: {item.quantity}</Text>
            </Column>
            <Column align="right" style={itemPriceColumn}>
              <Text style={itemPrice}>{item.price}</Text>
            </Column>
          </Row>
        </Section>
      ))}

      <Section style={totalSection}>
        <Row>
          <Column>
            <Text style={totalLabel}>İptal Edilen Tutar:</Text>
          </Column>
          <Column align="right">
            <Text style={totalAmountStyle}>{totalAmount}</Text>
          </Column>
        </Row>
      </Section>

      <Hr style={hr} />

      <Text style={sectionTitle}>💰 İade Bilgileri</Text>

      <Section style={refundSection}>
        <Text style={refundTitle}>İade işleminiz başlatıldı</Text>
        
        <Section style={refundDetails}>
          <Row>
            <Column style={refundDetailColumn}>
              <Text style={refundLabel}>İade Tutarı:</Text>
              <Text style={refundValue}>{refundAmount}</Text>
            </Column>
          </Row>
          
          <Row>
            <Column style={refundDetailColumn}>
              <Text style={refundLabel}>İade Yöntemi:</Text>
              <Text style={refundValue}>{refundMethod}</Text>
            </Column>
          </Row>
          
          {refundEta && (
            <Row>
              <Column style={refundDetailColumn}>
                <Text style={refundLabel}>Tahmini Süre:</Text>
                <Text style={refundValue}>{refundEta}</Text>
              </Column>
            </Row>
          )}
        </Section>

        <Section style={refundNotice}>
          <Text style={refundNoticeText}>
            ℹ️ İade işlemi, ödeme yaptığınız kartın veya hesabın banka işlem sürecine 
            bağlı olarak değişiklik gösterebilir. İade tutarı otomatik olarak ödeme 
            yaptığınız kartınıza veya hesabınıza yansıyacaktır.
          </Text>
        </Section>
      </Section>

      <Hr style={hr} />

      <Text style={sectionTitle}>Tekrar Sipariş Vermek İster misiniz?</Text>
      
      <Text style={paragraph}>
        İptal ettiğiniz ürünler hala mevcut! Dilediğiniz zaman yeniden sipariş 
        verebilir veya benzer ürünlere göz atabilirsiniz.
      </Text>

      <Section style={buttonContainer}>
        <Button style={shopButton} href="https://novagross.com">
          Alışverişe Devam Et
        </Button>
      </Section>

      <Hr style={hr} />

      {supportUrl && (
        <>
          <Section style={supportSection}>
            <Text style={supportTitle}>Yardıma mı İhtiyacınız Var?</Text>
            <Text style={supportText}>
              • İptal işleminizle ilgili sorularınız mı var?<br />
              • İade sürecinizi takip etmek mi istiyorsunuz?<br />
              • Destek ekibimiz size yardımcı olmak için burada!
            </Text>
            <Section style={buttonContainer}>
              <Button style={supportButton} href={supportUrl}>
                Destek Ekibine Ulaş
              </Button>
            </Section>
          </Section>

          <Hr style={hr} />
        </>
      )}

      <Text style={paragraph}>
        Bu siparişi iptal etmenizi gerektirecek bir durum yaşadıysak üzgünüz. 
        Gelecekteki alışverişlerinizde size daha iyi hizmet sunmak için buradayız.
      </Text>

      <Text style={footer}>
        Saygılarımızla,<br />
        <strong>Novagross Ekibi</strong>
      </Text>
    </EmailLayout>
  );
}

const heroSection = {
  textAlign: 'center' as const,
  padding: '32px 24px',
  backgroundColor: '#fef2f2',
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
  color: '#991b1b',
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

const infoBox = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
};

const infoColumn = {
  padding: '8px 0',
};

const infoLabel = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 4px 0',
};

const infoValue = {
  fontSize: '16px',
  fontWeight: '600',
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
  padding: '12px',
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
};

const itemNameColumn = {
  width: '70%',
};

const itemPriceColumn = {
  width: '30%',
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

const itemPrice = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1f2937',
  margin: 0,
};

const totalSection = {
  marginTop: '16px',
  padding: '16px',
  backgroundColor: '#fee2e2',
  borderRadius: '8px',
};

const totalLabel = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#991b1b',
  margin: 0,
};

const totalAmountStyle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#991b1b',
  margin: 0,
};

const refundSection = {
  backgroundColor: '#f0fdf4',
  padding: '24px',
  borderRadius: '8px',
  border: '2px solid #86efac',
};

const refundTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#15803d',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
};

const refundDetails = {
  marginBottom: '20px',
};

const refundDetailColumn = {
  padding: '8px 0',
};

const refundLabel = {
  fontSize: '14px',
  color: '#166534',
  margin: '0 0 4px 0',
  fontWeight: '600',
};

const refundValue = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#15803d',
  margin: 0,
};

const refundNotice = {
  backgroundColor: '#dcfce7',
  padding: '16px',
  borderRadius: '6px',
  borderLeft: '4px solid #22c55e',
};

const refundNoticeText = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#166534',
  margin: 0,
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const shopButton = {
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

const supportSection = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '8px',
};

const supportTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0 0 12px 0',
};

const supportText = {
  fontSize: '15px',
  lineHeight: '28px',
  color: '#374151',
  margin: '0 0 16px 0',
};

const supportButton = {
  backgroundColor: '#6366f1',
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
