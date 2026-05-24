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

interface SellerApplicationRejectedEmailProps {
  applicantName: string;
  storeName: string;
  reason: string;
  reapplyUrl: string;
}

export default function SellerApplicationRejectedEmail({
  applicantName = 'Değerli Başvuru Sahibi',
  storeName = 'Mağaza Adı',
  reason = 'Başvurunuz değerlendirme kriterlerimizi karşılayamamıştır.',
  reapplyUrl = 'https://novagross.com/satici-ol',
}: SellerApplicationRejectedEmailProps) {
  return (
    <EmailLayout preview={`${storeName} - Başvuru durumu`}>
      <Text style={heading}>Satıcı Başvurunuz Hakkında</Text>

      <Text style={paragraph}>Merhaba {applicantName},</Text>

      <Text style={paragraph}>
        <strong>{storeName}</strong> mağazası için yaptığınız satıcı başvurusu
        incelendi.
      </Text>

      <Section style={warningBox}>
        <Text style={warningTitle}>⚠️ Başvuru Durumu</Text>
        <Text style={warningText}>
          Maalesef bu aşamada başvurunuzu onaylayamadık.
        </Text>
      </Section>

      <Section style={reasonBox}>
        <Text style={reasonTitle}>Değerlendirme Notu:</Text>
        <Text style={reasonText}>{reason}</Text>
      </Section>

      <Text style={paragraph}>
        <strong>Ne Yapabilirsiniz?</strong>
      </Text>

      <ul style={list}>
        <li style={listItem}>
          📝 <strong>Eksiklikleri Tamamlayın:</strong> Yukarıdaki notları dikkate alarak
          eksik bilgilerinizi tamamlayabilirsiniz
        </li>
        <li style={listItem}>
          🔄 <strong>Tekrar Başvurun:</strong> Gerekli düzenlemeleri yaptıktan sonra
          yeniden başvurabilirsiniz
        </li>
        <li style={listItem}>
          💬 <strong>Destek Alın:</strong> Başvurunuz hakkında daha fazla bilgi almak için
          destek ekibimizle iletişime geçebilirsiniz
        </li>
      </ul>

      <Section style={buttonSection}>
        <Button href={reapplyUrl} style={button}>
          Yeniden Başvur
        </Button>
      </Section>

      <Hr style={divider} />

      <Section style={tipsBox}>
        <Text style={tipsTitle}>💡 Başarılı Başvuru İçin İpuçları</Text>
        
        <div style={tipItem}>
          <Text style={tipNumber}>1</Text>
          <Text style={tipText}>
            <strong>Eksiksiz Bilgi:</strong> Tüm formu dikkatle doldurun, boş alan
            bırakmayın
          </Text>
        </div>

        <div style={tipItem}>
          <Text style={tipNumber}>2</Text>
          <Text style={tipText}>
            <strong>Doğru Belgeler:</strong> Vergi numarası ve banka bilgilerinizi
            doğru girin
          </Text>
        </div>

        <div style={tipItem}>
          <Text style={tipNumber}>3</Text>
          <Text style={tipText}>
            <strong>Net Açıklama:</strong> Mağazanızı ve ürünlerinizi detaylı olarak
            tanıtın
          </Text>
        </div>

        <div style={tipItem}>
          <Text style={tipNumber}>4</Text>
          <Text style={tipText}>
            <strong>İletişim Bilgileri:</strong> Geçerli email ve telefon numarası
            sağlayın
          </Text>
        </div>
      </Section>

      <Hr style={divider} />

      <Section style={supportBox}>
        <Text style={supportTitle}>Sorularınız mı var?</Text>
        <Text style={supportText}>
          Başvurunuz hakkında daha fazla bilgi almak veya yardım almak için bizimle
          iletişime geçebilirsiniz:
        </Text>
        <Text style={supportText}>
          📧 Email: seller-support@novagross.com
          <br />
          📞 Telefon: 0850 123 45 67
        </Text>
      </Section>

      <Hr style={divider} />

      <Text style={footerText}>
        İlginiz için teşekkür ederiz. Gelecekte sizinle çalışmayı umuyoruz.
      </Text>

      <Text style={footerText}>
        Saygılarımızla,
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

const warningBox = {
  backgroundColor: '#fef3c7',
  border: '2px solid #f59e0b',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const warningTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#92400e',
  marginBottom: '8px',
};

const warningText = {
  fontSize: '15px',
  color: '#78350f',
};

const reasonBox = {
  backgroundColor: '#f3f4f6',
  borderLeft: '4px solid #6b7280',
  padding: '16px',
  margin: '20px 0',
};

const reasonTitle = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#111827',
  marginBottom: '8px',
};

const reasonText = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '20px',
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

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
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

const tipsBox = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const tipsTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1e40af',
  marginBottom: '16px',
};

const tipItem = {
  display: 'flex',
  gap: '12px',
  marginBottom: '16px',
  alignItems: 'flex-start',
};

const tipNumber = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#3b82f6',
  backgroundColor: '#dbeafe',
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const tipText = {
  fontSize: '14px',
  color: '#1e3a8a',
  lineHeight: '20px',
};

const supportBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
};

const supportTitle = {
  fontSize: '15px',
  fontWeight: 'bold',
  color: '#111827',
  marginBottom: '8px',
};

const supportText = {
  fontSize: '14px',
  color: '#4b5563',
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
