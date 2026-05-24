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

interface WelcomeEmailProps {
  userName: string;
  emailStep: 'welcome' | 'getting-started' | 'tips';
}

export default function WelcomeEmail({
  userName = 'Değerli Müşterimiz',
  emailStep = 'welcome',
}: WelcomeEmailProps) {
  if (emailStep === 'welcome') {
    return (
      <EmailLayout preview="Novagross'a Hoş Geldiniz!">
        <Text style={heading}>Hoş Geldiniz! 🎉</Text>

        <Text style={paragraph}>Merhaba {userName},</Text>

        <Text style={paragraph}>
          Novagross ailesine katıldığınız için çok mutluyuz! Binlerce kaliteli ürünün
          bulunduğu platformumuzda harika bir alışveriş deneyimi sizi bekliyor.
        </Text>

        <Section style={highlightBox}>
          <Text style={highlightTitle}>✨ İlk Alışverişinizde %15 İndirim!</Text>
          <Text style={highlightText}>
            Size özel hoş geldin hediyemiz olarak ilk alışverişinizde %15 indirim
            kazanıyorsunuz.
          </Text>
          <div style={codeBox}>
            <Text style={codeLabel}>İndirim Kodu:</Text>
            <Text style={codeValue}>HOSGELDIN15</Text>
          </div>
          <Text style={codeExpiry}>7 gün geçerlidir</Text>
        </Section>

        <Text style={paragraph}>
          <strong>Neler Yapabilirsiniz?</strong>
        </Text>

        <ul style={list}>
          <li style={listItem}>🛍️ Binlerce ürün arasından seçim yapın</li>
          <li style={listItem}>⭐ Favorilerinize ürün ekleyin</li>
          <li style={listItem}>🔔 Fiyat düşüşlerinde bildirim alın</li>
          <li style={listItem}>📦 Siparişlerinizi takip edin</li>
          <li style={listItem}>💬 Ürünleri değerlendirin ve yorum yapın</li>
        </ul>

        <Section style={buttonSection}>
          <Button href="https://novagross.com/kategoriler" style={button}>
            Alışverişe Başla
          </Button>
        </Section>

        <Hr style={divider} />

        <Text style={footerText}>
          Önümüzdeki günlerde size Novagross'u keşfetmeniz için ipuçları göndereceğiz.
        </Text>

        <Text style={footerText}>
          İyi alışverişler,
          <br />
          Novagross Ekibi
        </Text>
      </EmailLayout>
    );
  }

  if (emailStep === 'getting-started') {
    return (
      <EmailLayout preview="Novagross'da İlk Alışverişinizi Yapın">
        <Text style={heading}>İlk Alışverişinizi Yapmaya Hazır mısınız? 🚀</Text>

        <Text style={paragraph}>Merhaba {userName},</Text>

        <Text style={paragraph}>
          Novagross'a kaydolduktan 2 gün geçti. Size platformumuzu daha iyi tanıtmak
          istiyoruz!
        </Text>

        <Section style={tipsSection}>
          <Text style={sectionTitle}>💡 Hızlı İpuçları</Text>

          <div style={tipItem}>
            <Text style={tipNumber}>1</Text>
            <div style={tipContent}>
              <Text style={tipTitle}>Favorilere Ekleyin</Text>
              <Text style={tipText}>
                Beğendiğiniz ürünleri favorilerinize ekleyerek daha sonra kolayca
                bulabilirsiniz.
              </Text>
            </div>
          </div>

          <div style={tipItem}>
            <Text style={tipNumber}>2</Text>
            <div style={tipContent}>
              <Text style={tipTitle}>Kategorileri Keşfedin</Text>
              <Text style={tipText}>
                Elektronik, moda, ev & yaşam ve daha fazla kategoriyi keşfedin.
              </Text>
            </div>
          </div>

          <div style={tipItem}>
            <Text style={tipNumber}>3</Text>
            <div style={tipContent}>
              <Text style={tipTitle}>Güvenli Alışveriş</Text>
              <Text style={tipText}>
                3D Secure ödeme, SSL sertifikası ve 14 gün koşulsuz iade garantisi.
              </Text>
            </div>
          </div>
        </Section>

        <Section style={reminderBox}>
          <Text style={reminderText}>
            💰 Unutmayın! <strong>HOSGELDIN15</strong> kodunuz hala geçerli.
            İlk alışverişinizde %15 indirim kazanın!
          </Text>
        </Section>

        <Section style={buttonSection}>
          <Button href="https://novagross.com/kategoriler" style={button}>
            Kategorilere Göz At
          </Button>
        </Section>

        <Hr style={divider} />

        <Text style={footerText}>
          İyi alışverişler,
          <br />
          Novagross Ekibi
        </Text>
      </EmailLayout>
    );
  }

  // emailStep === 'tips'
  return (
    <EmailLayout preview="Novagross'dan Alışveriş İpuçları">
      <Text style={heading}>Daha İyi Alışveriş İçin İpuçları 💡</Text>

      <Text style={paragraph}>Merhaba {userName},</Text>

      <Text style={paragraph}>
        Novagross'da bir haftayı geride bıraktık! Size alışveriş deneyiminizi
        iyileştirecek ipuçları hazırladık.
      </Text>

      <Section style={tipsSection}>
        <div style={tipItem}>
          <Text style={tipEmoji}>📱</Text>
          <div style={tipContent}>
            <Text style={tipTitle}>Mobil Uygulamayı İndirin</Text>
            <Text style={tipText}>
              iOS ve Android uygulamalarımızla her yerden alışveriş yapın. Özel
              uygulama indirimleri sizi bekliyor!
            </Text>
          </div>
        </div>

        <div style={tipItem}>
          <Text style={tipEmoji}>🔔</Text>
          <div style={tipContent}>
            <Text style={tipTitle}>Bildirimler Aktif Edin</Text>
            <Text style={tipText}>
              Favorilerinizdeki ürünlerde fiyat düşüşü olduğunda anında haberdar olun.
            </Text>
          </div>
        </div>

        <div style={tipItem}>
          <Text style={tipEmoji}>💳</Text>
          <div style={tipContent}>
            <Text style={tipTitle}>Ödeme Bilgilerinizi Kaydedin</Text>
            <Text style={tipText}>
              Güvenli bir şekilde saklanan kart bilgilerinizle tek tıkla ödeme yapın.
            </Text>
          </div>
        </div>

        <div style={tipItem}>
          <Text style={tipEmoji}>📦</Text>
          <div style={tipContent}>
            <Text style={tipTitle}>Hızlı Kargo</Text>
            <Text style={tipText}>
              Saat 14:00'e kadar verilen siparişler aynı gün kargoda! 250₺ ve üzeri
              alışverişlerde kargo bedava.
            </Text>
          </div>
        </div>
      </Section>

      <Section style={highlightBox}>
        <Text style={highlightTitle}>🎁 Arkadaşını Davet Et, Kazan!</Text>
        <Text style={highlightText}>
          Arkadaşlarınızı Novagross'a davet edin. Her başarılı davet için hem siz
          hem de arkadaşınız 50₺ indirim kuponu kazanın!
        </Text>
        <Section style={buttonSection}>
          <Button href="https://novagross.com/davet-et" style={secondaryButton}>
            Arkadaşını Davet Et
          </Button>
        </Section>
      </Section>

      <Hr style={divider} />

      <Text style={footerText}>
        Sorularınız için müşteri hizmetlerimizle iletişime geçebilirsiniz.
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

const highlightBox = {
  backgroundColor: '#f0fdf4',
  border: '2px solid #10b981',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const highlightTitle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#065f46',
  marginBottom: '8px',
};

const highlightText = {
  fontSize: '15px',
  color: '#047857',
  marginBottom: '16px',
};

const codeBox = {
  backgroundColor: '#fff',
  border: '2px dashed #10b981',
  borderRadius: '6px',
  padding: '12px',
  margin: '12px 0',
};

const codeLabel = {
  fontSize: '12px',
  color: '#047857',
  marginBottom: '4px',
  textTransform: 'uppercase' as const,
  fontWeight: '600',
};

const codeValue = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#065f46',
  letterSpacing: '2px',
};

const codeExpiry = {
  fontSize: '13px',
  color: '#047857',
  marginTop: '8px',
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

const buttonSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
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

const secondaryButton = {
  backgroundColor: '#3b82f6',
  color: '#fff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: '600',
  display: 'inline-block',
};

const tipsSection = {
  margin: '24px 0',
};

const sectionTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '16px',
  color: '#111827',
};

const tipItem = {
  display: 'flex',
  gap: '16px',
  marginBottom: '20px',
  padding: '16px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
};

const tipNumber = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#059669',
  backgroundColor: '#d1fae5',
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const tipEmoji = {
  fontSize: '28px',
  width: '36px',
  flexShrink: 0,
};

const tipContent = {
  flex: 1,
};

const tipTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#111827',
  marginBottom: '4px',
};

const tipText = {
  fontSize: '14px',
  color: '#6b7280',
  lineHeight: '20px',
};

const reminderBox = {
  backgroundColor: '#fef3c7',
  borderLeft: '4px solid #f59e0b',
  padding: '16px',
  margin: '20px 0',
};

const reminderText = {
  fontSize: '15px',
  color: '#78350f',
  margin: 0,
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
