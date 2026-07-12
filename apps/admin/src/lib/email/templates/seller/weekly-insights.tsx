import { Text, Button, Section, Hr } from '@react-email/components';
import { EmailLayout } from '../base/layout';

interface ProductRow {
  name: string;
  views: number;
  cartAdds: number;
  abandonedUsers: number;
  purchases: number;
}

interface WeeklyInsightsEmailProps {
  storeName: string;
  weekLabel: string;
  totalViews: number;
  totalCartAdds: number;
  totalPurchases: number;
  totalAbandoned: number;
  topProducts: ProductRow[];
  suggestions: string[];
  panelUrl: string;
}

export default function WeeklyInsightsEmail({
  storeName = 'Mağazanız',
  weekLabel = '',
  totalViews = 0,
  totalCartAdds = 0,
  totalPurchases = 0,
  totalAbandoned = 0,
  topProducts = [],
  suggestions = [],
  panelUrl = 'https://seller.novagross.com',
}: WeeklyInsightsEmailProps) {
  return (
    <EmailLayout preview={`${storeName} haftalık satış içgörüleri`}>
      <Text style={heading}>Haftalık Mağaza Raporu 📊</Text>
      <Text style={paragraph}>
        <strong>{storeName}</strong> — {weekLabel}
      </Text>

      <Section style={statsRow}>
        <Text style={stat}>👁 Görüntülenme: <strong>{totalViews}</strong></Text>
        <Text style={stat}>🛒 Sepete Eklenme: <strong>{totalCartAdds}</strong></Text>
        <Text style={stat}>✅ Satış: <strong>{totalPurchases}</strong></Text>
        <Text style={stat}>⚠️ Sepette Bırakan: <strong>{totalAbandoned}</strong> kullanıcı</Text>
      </Section>

      {topProducts.length > 0 ? (
        <>
          <Hr style={hr} />
          <Text style={subheading}>En Çok İlgi Gören Ürünler</Text>
          {topProducts.map((p, i) => (
            <Text key={i} style={productRow}>
              {i + 1}. <strong>{p.name}</strong> — {p.views} görüntülenme,{' '}
              {p.cartAdds} sepete ekleme, {p.purchases} satış
              {p.abandonedUsers > 0 ? `, ${p.abandonedUsers} kişi sepette bıraktı` : ''}
            </Text>
          ))}
        </>
      ) : null}

      {suggestions.length > 0 ? (
        <>
          <Hr style={hr} />
          <Text style={subheading}>Öneriler 💡</Text>
          {suggestions.map((s, i) => (
            <Text key={i} style={suggestion}>• {s}</Text>
          ))}
        </>
      ) : null}

      <Section style={{ textAlign: 'center' as const, margin: '24px 0 8px' }}>
        <Button style={button} href={panelUrl}>
          Kaçan Satışları Gör ve Teklif Gönder
        </Button>
      </Section>
    </EmailLayout>
  );
}

const heading = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111', margin: '0 0 8px' };
const subheading = { fontSize: '16px', fontWeight: 'bold' as const, color: '#111', margin: '0 0 8px' };
const paragraph = { fontSize: '14px', lineHeight: '22px', color: '#555', margin: '0 0 12px' };
const statsRow = { backgroundColor: '#f8f8f8', borderRadius: '10px', padding: '12px 16px', margin: '12px 0' };
const stat = { fontSize: '14px', color: '#333', margin: '4px 0' };
const productRow = { fontSize: '13px', color: '#444', margin: '4px 0', lineHeight: '20px' };
const suggestion = { fontSize: '13px', color: '#444', margin: '4px 0', lineHeight: '20px' };
const hr = { borderColor: '#eee', margin: '16px 0' };
const button = {
  backgroundColor: '#FF6000',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  padding: '12px 24px',
  display: 'inline-block',
};
