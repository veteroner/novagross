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

interface SellerApplicationApprovedEmailProps {
  applicantName: string;
  storeName: string;
  loginUrl: string;
  storeId?: string;
}

export default function SellerApplicationApprovedEmail({
  applicantName = 'Değerli Satıcı',
  storeName = 'Mağaza Adı',
  loginUrl = 'https://admin.novagross.com/seller/dashboard',
  storeId,
}: SellerApplicationApprovedEmailProps) {
  return (
    <EmailLayout preview={`${storeName} - Başvurunuz onaylandı!`}>
      <Text style={heading}>Tebrikler! Başvurunuz Onaylandı! 🎉</Text>

      <Text style={paragraph}>Merhaba {applicantName},</Text>

      <Text style={paragraph}>
        <strong>{storeName}</strong> mağazanız için yaptığınız satıcı başvurusu incelendi ve{' '}
        <strong>ONAYLANDI!</strong>
      </Text>

      <Section style={successBox}>
        <Text style={successTitle}>✅ Mağazanız Artık Aktif!</Text>
        <Text style={successText}>
          Artık Novagross'da satış yapmaya başlayabilirsiniz. Satıcı panelinizden
          ürünlerinizi ekleyebilir, siparişlerinizi yönetebilir ve satış performansınızı
          takip edebilirsiniz.
        </Text>
      </Section>

      <Section style={infoBox}>
        <Text style={infoBoxTitle}>Mağaza Bilgileriniz</Text>
        <Text style={infoBoxText}>
          <strong>Mağaza Adı:</strong> {storeName}
          <br />
          {storeId && (
            <>
              <strong>Mağaza ID:</strong> {storeId}
              <br />
            </>
          )}
          <strong>Yetkili:</strong> {applicantName}
        </Text>
      </Section>

      <Section style={buttonSection}>
        <Button href={loginUrl} style={button}>
          Satıcı Paneline Git
        </Button>
      </Section>

      <Text style={paragraph}>
        <strong>İlk Adımlar:</strong>
      </Text>

      <ul style={list}>
        <li style={listItem}>
          📦 <strong>Ürün Ekleyin:</strong> Satıcı panelinizden ilk ürünlerinizi ekleyin
        </li>
        <li style={listItem}>
          📸 <strong>Görseller Yükleyin:</strong> Kaliteli ürün fotoğrafları ekleyin
        </li>
        <li style={listItem}>
          💰 <strong>Fiyat Belirleyin:</strong> Rekabetçi fiyatlar oluşturun
        </li>
        <li style={listItem}>
          📊 <strong>Performansı Takip Edin:</strong> Satış raporlarınızı inceleyin
        </li>
        <li style={listItem}>
          🚚 <strong>Siparişleri Yönetin:</strong> Siparişlerinizi zamanında gönderin
        </li>
      </ul>

      <Hr style={divider} />

      <Text style={paragraph}>
        <strong>Satıcı Avantajları:</strong>
      </Text>

      <ul style={list}>
        <li style={listItem}>✨ Profesyonel mağaza sayfası</li>
        <li style={listItem}>📊 Detaylı satış raporları ve analizler</li>
        <li style={listItem}>💰 Rekabetçi komisyon oranları</li>
        <li style={listItem}>🚀 Binlerce aktif müşteriye erişim</li>
        <li style={listItem}>🛠️ Kolay ürün ve sipariş yönetimi</li>
        <li style={listItem}>📱 Mobil-uyumlu satıcı paneli</li>
      </ul>

      <Hr style={divider} />

      <Section style={supportBox}>
        <Text style={supportTitle}>💬 Yardıma mı ihtiyacınız var?</Text>
        <Text style={supportText}>
          Satıcı panelini kullanırken herhangi bir sorunla karşılaşırsanız destek
          ekibimizle iletişime geçebilirsiniz:
        </Text>
        <Text style={supportText}>
          📧 Email: seller-support@novagross.com
          <br />
          📞 Telefon: 0850 123 45 67
        </Text>
      </Section>

      <Hr style={divider} />

      <Text style={footerText}>
        Novagross ailesine hoş geldiniz! Başarılı satışlar dileriz.
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

const successBox = {
  backgroundColor: '#f0fdf4',
  border: '2px solid #10b981',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const successTitle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#065f46',
  marginBottom: '8px',
};

const successText = {
  fontSize: '15px',
  color: '#047857',
  lineHeight: '22px',
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
  lineHeight: '28px',
  color: '#374151',
  marginBottom: '8px',
};

const supportBox = {
  backgroundColor: '#eff6ff',
  borderLeft: '4px solid #3b82f6',
  padding: '16px',
  margin: '20px 0',
};

const supportTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1e40af',
  marginBottom: '8px',
};

const supportText = {
  fontSize: '14px',
  color: '#1e3a8a',
  lineHeight: '20px',
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
