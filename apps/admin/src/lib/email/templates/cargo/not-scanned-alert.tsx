import * as React from 'react'
import { Html, Head, Body, Container, Section, Text, Heading, Hr, Link } from '@react-email/components'

// Kargo etiketi oluşturulduğu halde MNG'de gönderiye dönüşmemiş paketler
// (şubede bizim barkodla okutulmamış) için satıcı + admin uyarısı.

type Row = { orderNumber: string; trackingNumber: string; storeName?: string; labelCreatedAt: string; hours: number }

interface CargoNotScannedAlertProps {
  audience: 'seller' | 'admin'
  rows: Row[]
  panelUrl?: string
}

export const CargoNotScannedAlertEmail = ({ audience = 'seller', rows = [], panelUrl }: CargoNotScannedAlertProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚠️ Kargo şubede okutulmamış</Heading>
        <Text style={text}>
          Aşağıdaki {rows.length === 1 ? 'siparişin' : 'siparişlerin'} kargo etiketi oluşturuldu ama MNG kayıtlarında
          paket henüz gönderiye dönüşmedi. Bu, paketin şubeye teslim edilmediği ya da etiketteki resmi barkod yerine
          başka bir irsaliyeyle gönderildiği anlamına gelir — bu durumda kargo takibi otomatik güncellenemez.
        </Text>

        <Section style={box}>
          {rows.map((r, i) => (
            <Text key={i} style={textSmall}>
              <strong>#{r.orderNumber}</strong>
              {audience === 'admin' && r.storeName ? ` · ${r.storeName}` : ''} · Takip: {r.trackingNumber} · Etiket:{' '}
              {r.labelCreatedAt} ({r.hours} saat önce)
            </Text>
          ))}
        </Section>

        <Text style={text}>
          {audience === 'seller'
            ? 'Paketi etiketteki resmi MNG barkoduyla şubeye teslim ettiğinizden emin olun. Başka bir irsaliyeyle gönderdiyseniz takip numarasını siparişe girmeniz için bizimle iletişime geçin.'
            : 'Satıcıyla iletişime geçip paketin durumunu kontrol edin.'}
        </Text>

        {panelUrl ? (
          <Text style={textSmall}>
            Panel: <Link href={panelUrl}>{panelUrl}</Link>
          </Text>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>Novagross · Otomatik kargo kontrolü</Text>
      </Container>
    </Body>
  </Html>
)

export default CargoNotScannedAlertEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 24px 48px', marginBottom: '64px' }
const h1 = { color: '#333', fontSize: '24px', fontWeight: 'bold', margin: '32px 0 16px', textAlign: 'center' as const }
const text = { color: '#333', fontSize: '15px', lineHeight: '24px', margin: '10px 0' }
const box = { backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '14px', margin: '18px 0' }
const textSmall = { color: '#334155', fontSize: '14px', lineHeight: '22px', margin: '6px 0' }
const hr = { borderColor: '#e6ebf1', margin: '32px 0' }
const footer = { color: '#8898aa', fontSize: '12px', lineHeight: '16px', textAlign: 'center' as const }
