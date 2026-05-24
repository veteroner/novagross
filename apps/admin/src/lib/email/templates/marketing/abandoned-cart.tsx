import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Hr,
  Section,
} from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface AbandonedCartEmailProps {
  userName: string;
  cartItems: Array<{
    name: string;
    price: number;
    quantity: number;
    imageUrl: string;
  }>;
  totalAmount: number;
  checkoutUrl: string;
  discountCode?: string;
  discountAmount?: number;
}

export default function AbandonedCartEmail({
  userName = 'Değerli Müşterimiz',
  cartItems = [
    {
      name: 'Örnek Ürün',
      price: 299.99,
      quantity: 1,
      imageUrl: 'https://via.placeholder.com/100',
    },
  ],
  totalAmount = 299.99,
  checkoutUrl = 'https://novagross.com/checkout',
  discountCode,
  discountAmount,
}: AbandonedCartEmailProps) {
  return (
    <EmailLayout preview="Sepetinizdeki ürünler sizi bekliyor">
      <Text style={heading}>Sepetiniz Sizi Bekliyor! 🛒</Text>

      <Text style={paragraph}>Merhaba {userName},</Text>

      <Text style={paragraph}>
        Sepetinizde unuttuğunuz harika ürünler var! Alışverişinizi tamamlamadan ayrıldınız.
      </Text>

      {/* Cart Items */}
      <Section style={cartSection}>
        <Text style={sectionTitle}>Sepetinizdeki Ürünler</Text>
        
        {cartItems.map((item, index) => (
          <div key={index} style={cartItem}>
            <div style={itemInfo}>
              <Text style={itemName}>{item.name}</Text>
              <Text style={itemQuantity}>Adet: {item.quantity}</Text>
            </div>
            <Text style={itemPrice}>₺{item.price.toFixed(2)}</Text>
          </div>
        ))}

        <Hr style={divider} />

        <div style={totalRow}>
          <Text style={totalLabel}>Toplam:</Text>
          <Text style={totalPrice}>₺{totalAmount.toFixed(2)}</Text>
        </div>
      </Section>

      {/* Discount Offer */}
      {discountCode && discountAmount && (
        <Section style={discountBox}>
          <Text style={discountTitle}>🎁 Size Özel İndirim!</Text>
          <Text style={discountText}>
            Alışverişinizi tamamlarsanız <strong>₺{discountAmount.toFixed(2)}</strong> indirim
            kazanın!
          </Text>
          <div style={discountCodeBox}>
            <Text style={discountCodeLabel}>İndirim Kodu:</Text>
            <Text style={discountCodeValue}>{discountCode}</Text>
          </div>
          <Text style={discountExpiry}>
            ⏰ Bu indirim 24 saat geçerlidir
          </Text>
        </Section>
      )}

      {/* CTA Button */}
      <Section style={buttonSection}>
        <Button href={checkoutUrl} style={button}>
          Alışverişe Devam Et
        </Button>
      </Section>

      <Text style={paragraph}>
        Siparişinizi tamamlarsanız:
      </Text>

      <ul style={list}>
        <li style={listItem}>✅ Aynı gün kargo (saat 14:00'e kadar)</li>
        <li style={listItem}>🚚 Ücretsiz teslimat (250₺ üzeri)</li>
        <li style={listItem}>↩️ Kolay iade (14 gün içinde)</li>
        <li style={listItem}>💳 Güvenli ödeme seçenekleri</li>
      </ul>

      <Hr style={divider} />

      <Text style={footerText}>
        Sepetiniz 7 gün boyunca saklanacaktır. Sonrasında ürünleriniz sepetinizden
        kaldırılacaktır.
      </Text>

      <Text style={footerText}>
        Teşekkürler,
        <br />
        Novagross Ekibi
      </Text>
    </EmailLayout>
  );
}

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '20px',
  color: '#000',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  marginBottom: '12px',
};

const sectionTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '16px',
  color: '#111827',
};

const cartSection = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const cartItem = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 0',
  borderBottom: '1px solid #e5e7eb',
};

const itemInfo = {
  flex: 1,
};

const itemName = {
  fontSize: '15px',
  fontWeight: '500',
  color: '#111827',
  margin: 0,
  marginBottom: '4px',
};

const itemQuantity = {
  fontSize: '13px',
  color: '#6b7280',
  margin: 0,
};

const itemPrice = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#111827',
};

const totalRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '12px',
};

const totalLabel = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#111827',
};

const totalPrice = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#059669',
};

const discountBox = {
  backgroundColor: '#fef3c7',
  border: '2px solid #f59e0b',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const discountTitle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#92400e',
  marginBottom: '8px',
};

const discountText = {
  fontSize: '16px',
  color: '#78350f',
  marginBottom: '16px',
};

const discountCodeBox = {
  backgroundColor: '#fff',
  border: '2px dashed #f59e0b',
  borderRadius: '6px',
  padding: '12px',
  margin: '12px 0',
};

const discountCodeLabel = {
  fontSize: '12px',
  color: '#78350f',
  marginBottom: '4px',
  textTransform: 'uppercase' as const,
  fontWeight: '600',
};

const discountCodeValue = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#92400e',
  letterSpacing: '2px',
};

const discountExpiry = {
  fontSize: '13px',
  color: '#92400e',
  marginTop: '8px',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#059669',
  color: '#fff',
  padding: '14px 32px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '16px',
  fontWeight: 'bold',
  display: 'inline-block',
};

const list = {
  paddingLeft: '20px',
  marginBottom: '16px',
};

const listItem = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#374151',
  marginBottom: '8px',
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const footerText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#6b7280',
  marginTop: '16px',
};
