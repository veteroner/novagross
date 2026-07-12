import { Text, Button, Section, Hr } from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface ProductOfferEmailProps {
  customerName: string;
  productName: string;
  productUrl: string;
  storeName: string;
  discountValue: number;
  couponCode: string;
  expiresAt: string;
}

export default function ProductOfferEmail({
  customerName = 'Değerli Müşterimiz',
  productName = 'Ürün',
  productUrl = 'https://novagross.com',
  storeName = 'Novagross Mağazası',
  discountValue = 10,
  couponCode = 'FIRSAT-XXXXXXXX',
  expiresAt = '',
}: ProductOfferEmailProps) {
  return (
    <EmailLayout preview={`${productName} için size özel %${discountValue} indirim`}>
      <Text style={heading}>Size Özel Bir Fırsat! 🎁</Text>

      <Text style={paragraph}>Merhaba {customerName},</Text>

      <Text style={paragraph}>
        İlgilendiğiniz <strong>{productName}</strong> için {storeName} size özel{' '}
        <strong>%{discountValue} indirim</strong> tanımladı.
      </Text>

      <Section style={codeBox}>
        <Text style={codeLabel}>İndirim Kodunuz</Text>
        <Text style={codeText}>{couponCode}</Text>
        {expiresAt ? (
          <Text style={codeExpiry}>Son kullanım: {expiresAt}</Text>
        ) : null}
      </Section>

      <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
        <Button style={button} href={productUrl}>
          Ürüne Git ve Kodu Kullan
        </Button>
      </Section>

      <Hr style={hr} />

      <Text style={smallText}>
        Kod tek kullanımlıktır ve yalnızca size özeldir. Ödeme adımında
        &quot;Kupon Kodu&quot; alanına girerek indirimden yararlanabilirsiniz.
      </Text>
    </EmailLayout>
  );
}

const heading = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111', margin: '0 0 16px' };
const paragraph = { fontSize: '15px', lineHeight: '24px', color: '#333', margin: '0 0 12px' };
const codeBox = {
  backgroundColor: '#FFF4EC',
  border: '2px dashed #FF6000',
  borderRadius: '10px',
  padding: '16px',
  textAlign: 'center' as const,
  margin: '20px 0',
};
const codeLabel = { fontSize: '12px', color: '#9a5b2d', margin: '0 0 4px' };
const codeText = { fontSize: '24px', fontWeight: 'bold' as const, letterSpacing: '2px', color: '#FF6000', margin: '0' };
const codeExpiry = { fontSize: '12px', color: '#9a5b2d', margin: '6px 0 0' };
const button = {
  backgroundColor: '#FF6000',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  padding: '12px 28px',
  display: 'inline-block',
};
const hr = { borderColor: '#eee', margin: '20px 0' };
const smallText = { fontSize: '12px', color: '#888', lineHeight: '18px' };
