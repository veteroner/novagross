import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
} from '@react-email/components';

interface WithdrawalProcessedEmailProps {
  storeName: string;
  amount: number;
  status: 'completed' | 'rejected';
  iban: string;
  processedAt: string;
  rejectionReason?: string;
}

export const WithdrawalProcessedEmail = ({
  storeName = 'Mağazanız',
  amount = 5000,
  status = 'completed',
  iban = 'TR** **** **** **** **** ***123',
  processedAt = new Date().toLocaleDateString('tr-TR'),
  rejectionReason,
}: WithdrawalProcessedEmailProps) => {
  const isApproved = status === 'completed';

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isApproved ? '✅ Para Çekme İşlemi Tamamlandı' : '❌ Para Çekme İşlemi Reddedildi'}
          </Heading>
          
          <Text style={text}>
            Merhaba,
          </Text>

          {isApproved ? (
            <>
              <Text style={text}>
                <strong>{storeName}</strong> mağazanız için talep ettiğiniz para çekme işlemi tamamlandı.
              </Text>

              <Section style={isApproved ? successBox : warningBox}>
                <Text style={highlightText}>
                  💰 <strong>Tutar:</strong> ₺{amount.toFixed(2)}
                </Text>
                <Text style={highlightText}>
                  🏦 <strong>IBAN:</strong> {iban}
                </Text>
                <Text style={highlightText}>
                  📅 <strong>İşlem Tarihi:</strong> {processedAt}
                </Text>
              </Section>

              <Text style={text}>
                Para 1-3 iş günü içinde hesabınıza geçecektir.
              </Text>
            </>
          ) : (
            <>
              <Text style={text}>
                <strong>{storeName}</strong> mağazanız için talep ettiğiniz para çekme işlemi reddedildi.
              </Text>

              <Section style={warningBox}>
                <Text style={warningTitle}>❌ Red Nedeni:</Text>
                <Text style={warningText}>
                  {rejectionReason || 'Bilgiler hatalı veya eksik'}
                </Text>
              </Section>

              <Section style={highlightBox}>
                <Text style={highlightText}>
                  💰 <strong>Talep Edilen Tutar:</strong> ₺{amount.toFixed(2)}
                </Text>
                <Text style={highlightText}>
                  📅 <strong>Talep Tarihi:</strong> {processedAt}
                </Text>
              </Section>

              <Text style={text}>
                Lütfen banka bilgilerinizi kontrol edin ve tekrar deneyebilirsiniz.
              </Text>
            </>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            Sorularınız için finans@novagross.com adresine yazabilirsiniz.<br />
            Novagross Ekibi
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WithdrawalProcessedEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const successBox = {
  backgroundColor: '#f0fff4',
  border: '1px solid #c6f6d5',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const warningBox = {
  backgroundColor: '#fff5f5',
  border: '1px solid #ffdddd',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const highlightBox = {
  backgroundColor: '#f0f7ff',
  border: '1px solid #d0e4ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const highlightText = {
  color: '#0066cc',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
};

const warningTitle = {
  color: '#c53030',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const warningText = {
  color: '#742a2a',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
};
