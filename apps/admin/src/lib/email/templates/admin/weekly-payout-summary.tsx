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
  Link,
} from '@react-email/components'

type TopStore = { storeName: string; amount: number }

interface WeeklyPayoutSummaryEmailProps {
  runDate: string
  storeCount: number
  totalAmount: number
  reference?: string
  payoutUrl?: string
  topStores?: TopStore[]
}

export const WeeklyPayoutSummaryEmail = ({
  runDate = new Date().toLocaleDateString('tr-TR'),
  storeCount = 0,
  totalAmount = 0,
  reference,
  payoutUrl,
  topStores = [],
}: WeeklyPayoutSummaryEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>📊 Haftalık Payout Özeti</Heading>

          <Text style={text}>
            <strong>Tarih:</strong> {runDate}
          </Text>
          <Text style={text}>
            <strong>Mağaza:</strong> {storeCount}
            <br />
            <strong>Toplam:</strong> ₺{Number(totalAmount).toFixed(2)}
          </Text>

          {reference ? (
            <Text style={text}>
              <strong>Referans:</strong> {reference}
            </Text>
          ) : null}

          {payoutUrl ? (
            <Section style={box}>
              <Text style={textSmall}>
                Admin ekranı: <Link href={payoutUrl}>{payoutUrl}</Link>
              </Text>
            </Section>
          ) : null}

          {topStores.length > 0 ? (
            <Section style={box}>
              <Text style={textSmallStrong}>Top 10 ödeme</Text>
              {topStores.map((s, idx) => (
                <Text key={idx} style={textSmall}>
                  {idx + 1}. {s.storeName} — ₺{Number(s.amount).toFixed(2)}
                </Text>
              ))}
            </Section>
          ) : null}

          <Hr style={hr} />
          <Text style={footer}>Novagross · Otomatik payout bildirimi</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default WeeklyPayoutSummaryEmail

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
  fontSize: '26px',
  fontWeight: 'bold',
  margin: '40px 0 16px',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '10px 0',
}

const box = {
  backgroundColor: '#f0f7ff',
  border: '1px solid #d0e4ff',
  borderRadius: '8px',
  padding: '14px',
  margin: '18px 0',
}

const textSmallStrong = {
  color: '#0f172a',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  margin: '0 0 8px 0',
}

const textSmall = {
  color: '#334155',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '6px 0',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
}

const footer = {
  color: '#8898aa',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '16px 0',
  textAlign: 'center' as const,
}
