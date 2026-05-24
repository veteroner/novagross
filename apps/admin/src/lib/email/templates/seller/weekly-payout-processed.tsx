import * as React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
} from '@react-email/components'

interface WeeklyPayoutProcessedEmailProps {
  storeName: string
  amount: number
  iban?: string
  runDate: string
  reference?: string
}

export const WeeklyPayoutProcessedEmail = ({
  storeName = 'Mağazanız',
  amount = 0,
  iban,
  runDate = new Date().toLocaleDateString('tr-TR'),
  reference,
}: WeeklyPayoutProcessedEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>✅ Haftalık Ödeme İşlemi Tamamlandı</Heading>

          <Text style={text}>Merhaba,</Text>

          <Text style={text}>
            <strong>{storeName}</strong> mağazanız için haftalık ödeme işlemi tamamlandı.
          </Text>

          <Section style={successBox}>
            <Text style={highlightText}>
              💰 <strong>Tutar:</strong> ₺{Number(amount).toFixed(2)}
            </Text>
            <Text style={highlightText}>
              📅 <strong>Batch Tarihi:</strong> {runDate}
            </Text>
            {iban ? (
              <Text style={highlightText}>
                🏦 <strong>IBAN:</strong> {iban}
              </Text>
            ) : null}
            {reference ? (
              <Text style={highlightText}>
                🧾 <strong>Referans:</strong> {reference}
              </Text>
            ) : null}
          </Section>

          <Text style={text}>Para 1-3 iş günü içinde hesabınıza geçecektir.</Text>

          <Hr style={hr} />

          <Text style={footer}>
            Sorularınız için finans@novagross.com adresine yazabilirsiniz.
            <br />
            Novagross Ekibi
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default WeeklyPayoutProcessedEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#333',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const successBox = {
  backgroundColor: '#f0fff4',
  border: '1px solid #c6f6d5',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const highlightText = {
  color: '#0066cc',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
}

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
}
