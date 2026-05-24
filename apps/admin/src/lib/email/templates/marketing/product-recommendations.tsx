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

interface ProductRecommendationEmailProps {
  userName: string;
  recommendationType: 'similar' | 'frequently-bought' | 'trending' | 'personalized';
  products: Array<{
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    rating?: number;
    discount?: number;
  }>;
  baseProductName?: string;
}

export default function ProductRecommendationEmail({
  userName = 'Değerli Müşterimiz',
  recommendationType = 'personalized',
  products = [
    {
      id: '1',
      name: 'Örnek Ürün 1',
      price: 299.99,
      imageUrl: 'https://via.placeholder.com/200',
      rating: 4.5,
    },
    {
      id: '2',
      name: 'Örnek Ürün 2',
      price: 199.99,
      imageUrl: 'https://via.placeholder.com/200',
      rating: 4.8,
      discount: 20,
    },
  ],
  baseProductName,
}: ProductRecommendationEmailProps) {
  const getHeading = () => {
    switch (recommendationType) {
      case 'similar':
        return `${baseProductName} İçin Benzer Ürünler`;
      case 'frequently-bought':
        return `${baseProductName} İle Birlikte Alınanlar`;
      case 'trending':
        return 'En Çok Satanlar';
      default:
        return 'Size Özel Ürün Önerileri';
    }
  };

  const getDescription = () => {
    switch (recommendationType) {
      case 'similar':
        return 'Baktığınız ürüne benzer seçenekler hazırladık.';
      case 'frequently-bought':
        return 'Bu ürünü alanlar genellikle bunları da alıyor.';
      case 'trending':
        return 'En popüler ürünlerimizi keşfedin.';
      default:
        return 'İlgi alanlarınıza göre seçtiğimiz ürünler.';
    }
  };

  return (
    <EmailLayout preview={getHeading()}>
      <Text style={heading}>{getHeading()} ✨</Text>

      <Text style={paragraph}>Merhaba {userName},</Text>

      <Text style={paragraph}>{getDescription()}</Text>

      {/* Product Grid */}
      <Section style={productsSection}>
        {products.map((product) => (
          <div key={product.id} style={productCard}>
            {product.discount && (
              <div style={discountBadge}>%{product.discount} İndirim</div>
            )}
            
            <div style={productImagePlaceholder}>
              <Text style={productImageText}>📷</Text>
            </div>

            <div style={productInfo}>
              <Text style={productName}>{product.name}</Text>

              {product.rating && (
                <div style={ratingRow}>
                  <Text style={stars}>{'⭐'.repeat(Math.floor(product.rating))}</Text>
                  <Text style={ratingText}>{product.rating}</Text>
                </div>
              )}

              <div style={priceRow}>
                {product.discount ? (
                  <>
                    <Text style={oldPrice}>
                      ₺{(product.price / (1 - product.discount / 100)).toFixed(2)}
                    </Text>
                    <Text style={discountPrice}>₺{product.price.toFixed(2)}</Text>
                  </>
                ) : (
                  <Text style={productPrice}>₺{product.price.toFixed(2)}</Text>
                )}
              </div>

              <Button
                href={`https://novagross.com/urun/${product.id}`}
                style={productButton}
              >
                İncele
              </Button>
            </div>
          </div>
        ))}
      </Section>

      <Section style={ctaSection}>
        <Text style={ctaText}>Daha fazla ürün keşfetmek ister misiniz?</Text>
        <Button href="https://novagross.com/kategoriler" style={button}>
          Tüm Ürünleri Görüntüle
        </Button>
      </Section>

      <Hr style={divider} />

      <Section style={benefitsBox}>
        <Text style={benefitsTitle}>Neden Novagross?</Text>
        <ul style={list}>
          <li style={listItem}>✅ Güvenli ve hızlı teslimat</li>
          <li style={listItem}>💳 Taksit seçenekleri</li>
          <li style={listItem}>↩️ 14 gün koşulsuz iade</li>
          <li style={listItem}>🎁 250₺ üzeri ücretsiz kargo</li>
        </ul>
      </Section>

      <Hr style={divider} />

      <Text style={footerText}>
        Bu önerileri beğenmediniz mi? Email tercihlerinizi{' '}
        <a href="https://novagross.com/ayarlar/bildirimler" style={link}>
          buradan
        </a>{' '}
        güncelleyebilirsiniz.
      </Text>

      <Text style={footerText}>
        İyi alışverişler,
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

const productsSection = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '20px',
  margin: '24px 0',
};

const productCard = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  position: 'relative' as const,
};

const discountBadge = {
  position: 'absolute' as const,
  top: '12px',
  right: '12px',
  backgroundColor: '#ef4444',
  color: '#fff',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 'bold',
};

const productImagePlaceholder = {
  width: '100%',
  height: '180px',
  backgroundColor: '#f3f4f6',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '12px',
};

const productImageText = {
  fontSize: '48px',
};

const productInfo = {
  textAlign: 'left' as const,
};

const productName = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#111827',
  marginBottom: '8px',
  display: '-webkit-box',
  WebkitLineClamp: '2',
  WebkitBoxOrient: 'vertical' as const,
  overflow: 'hidden',
};

const ratingRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginBottom: '8px',
};

const stars = {
  fontSize: '14px',
  lineHeight: '1',
};

const ratingText = {
  fontSize: '13px',
  color: '#6b7280',
  fontWeight: '500',
};

const priceRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '12px',
};

const productPrice = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#059669',
};

const oldPrice = {
  fontSize: '14px',
  color: '#9ca3af',
  textDecoration: 'line-through',
};

const discountPrice = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#ef4444',
};

const productButton = {
  backgroundColor: '#059669',
  color: '#fff',
  padding: '10px 20px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '600',
  display: 'inline-block',
  width: '100%',
  textAlign: 'center' as const,
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
};

const ctaText = {
  fontSize: '16px',
  color: '#374151',
  marginBottom: '16px',
};

const button = {
  backgroundColor: '#3b82f6',
  color: '#fff',
  padding: '14px 32px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '16px',
  fontWeight: 'bold',
  display: 'inline-block',
};

const benefitsBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const benefitsTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#065f46',
  marginBottom: '12px',
};

const list = {
  paddingLeft: '20px',
  margin: 0,
};

const listItem = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#047857',
  marginBottom: '6px',
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const footerText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#6b7280',
  marginTop: '16px',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
};
