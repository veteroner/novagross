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

interface SellerApplicationReceivedEmailProps {
  applicantName: string;
  storeName: string;
  applicationId: string;
  estimatedReviewTime: string;
}

export default function SellerApplicationReceivedEmail({
  applicantName = 'Değerli Satıcı',
  storeName = 'Mağaza Adı',
  applicationId = 'APP-12345',
  estimatedReviewTime = '1-2 iş günü',
}: SellerApplicationReceivedEmailProps) {
  return (
    <EmailLayout preview={`${storeName} - Satıcı başvurunuz alındı`}>
      <Text style={heading}>Başvurunuz Alındı! 🎉</Text>

      <Text style={paragraph}>Merhaba {applicantName},</Text>

      <Text style={paragraph}>
        <strong>{storeName}</strong> mağazası için yaptığınız satıcı başvurusu başarıyla alınmıştır.
      </Text>

      <Section style={infoBox}>
        <Text style={infoBoxTitle}>Başvuru Bilgileri</Text>
        <Text style={infoBoxText}>
          <strong>Başvuru No:</strong> {applicationId}
          <br />
          <strong>Mağaza Adı:</strong> {storeName}
          <br />
          <strong>Tahmini İnceleme Süresi:</strong> {estimatedReviewTime}
        </Text>
      </Section>

      <Text style={paragraph}>
        <strong>Sıradaki Adımlar:</strong>
      </Text>

      <ul style={list}>
        <li style={listItem}>
          Başvurunuz ekibimiz tarafından {estimatedReviewTime} içinde incelenecektir
        </li>
        <li style={listItem}>
          Onay durumunuz hakkında email ile bilgilendirileceksiniz
        </li>
        <li style={listItem}>
          Onay sonrası satıcı panelinize giriş bilgileriniz gönderilecektir
        </li>
        <li style={listItem}>
          Satıcı panelinizden ürün eklemeye ve satış yapmaya başlayabilirsiniz
        </li>
      </ul>

      <Hr style={divider} />

      <Text style={paragraph}>
        <strong>Satıcı Olmanın Avantajları:</strong>
      </Text>

      <ul style={list}>
        <li style={listItem}>✨ Kendi mağaza sayfanız</li>
        <li style={listItem}>📊 Detaylı satış raporları ve analizler</li>
        <li style={listItem}>💰 Rekabetçi komisyon oranları</li>
        <li style={listItem}>🚀 Geniş müşteri kitlesine erişim</li>
        <li style={listItem}>🛠️ Kolay ürün ve sipariş yönetimi</li>
      </ul>

      <Hr style={divider} />

      <Text style={footerText}>
        Başvurunuzla ilgili sorularınız için destek ekibimizle iletişime geçebilirsiniz.
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

const infoBox = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const infoBoxTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  marginBottom: '12px',
  color: '#111827',
};

const infoBoxText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#4b5563',
  margin: 0,
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
  margin: '24px 0',
};

const footerText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#6b7280',
  marginTop: '16px',
};
