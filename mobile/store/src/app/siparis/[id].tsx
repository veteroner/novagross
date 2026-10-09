import { useState } from 'react'
import { Alert, Linking, Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { File, Paths } from 'expo-file-system'
import { useOrderDetail } from '@/lib/account'
import { WEB_URL, webApiBinary } from '@/lib/api'
import { Badge, Button, Card, Empty, Loading, Muted, Row, Screen, Title } from '@/components/ui'
import { ORDER_STATUS, SHIPMENT_STATUS, fmtDate, fmtTRY, orderStatusTone } from '@/lib/format'
import { colors, space } from '@/lib/theme'

function Timeline({ events }: { events: { status: string; description: string | null; location: string | null; timestamp: string }[] }) {
  const sorted = [...events].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
  return (
    <View style={{ gap: space(3) }}>
      {sorted.map((e, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space(3) }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 4, backgroundColor: i === 0 ? colors.primary : colors.border }} />
            {i < sorted.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: colors.border }} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: space(1) }}>
            <Text style={{ fontWeight: i === 0 ? '700' : '500', color: colors.text }}>
              {e.description || SHIPMENT_STATUS[e.status] || e.status}
            </Text>
            <Muted>
              {fmtDate(e.timestamp, true)}
              {e.location ? ` · ${e.location}` : ''}
            </Muted>
          </View>
        </View>
      ))}
    </View>
  )
}

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading, refetch, isRefetching } = useOrderDetail(id)
  const [downloading, setDownloading] = useState<string | null>(null)

  if (isLoading) return <Loading />
  const o = data?.order
  if (!o) return <Empty text="Sipariş bulunamadı" />

  const openInvoice = async (inv: { id: string; invoice_number: string | null }) => {
    setDownloading(inv.id)
    try {
      const buf = await webApiBinary(`/api/invoices/${inv.id}`)
      const file = new File(Paths.cache, `fatura-${o.order_number}.pdf`)
      file.create({ overwrite: true })
      file.write(new Uint8Array(buf))
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Fatura #${o.order_number}` })
    } catch (e: any) {
      Alert.alert('Fatura açılamadı', e.message)
    } finally {
      setDownloading(null)
    }
  }

  const addr = o.shipping_address ?? {}

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Stack.Screen options={{ title: `#${o.order_number}` }} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title>Sipariş durumu</Title>
          <Badge label={ORDER_STATUS[o.status] ?? o.status} tone={orderStatusTone(o.status)} />
        </View>
        <Muted>{fmtDate(o.created_at, true)}</Muted>
        {o.payment_status === 'refunded' ? (
          <Badge label={`Ödemeniz iade edildi${o.refund_amount ? ` · ${fmtTRY(o.refund_amount)}` : ''}`} tone="success" />
        ) : o.status === 'cancelled' && o.payment_status === 'paid' ? (
          <Muted>Ödemeniz kartınıza iade ediliyor; birkaç dakika içinde onaylanır.</Muted>
        ) : null}
      </Card>

      {data!.shipments.map((s) => (
        <Card key={s.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title>Kargo</Title>
            <Badge label={SHIPMENT_STATUS[s.status] ?? s.status} tone={s.status === 'delivered' ? 'success' : s.status === 'failed' ? 'danger' : 'primary'} />
          </View>
          {s.tracking_number ? <Row label="MNG takip no" value={s.tracking_number} /> : <Muted>Satıcı siparişi hazırlıyor.</Muted>}
          {s.shipping_status_history?.length ? <Timeline events={s.shipping_status_history} /> : null}
          {s.tracking_number ? (
            <Button title="Kargo takip sayfası" variant="outline" onPress={() => Linking.openURL(`${WEB_URL}/kargo-takip/${encodeURIComponent(s.tracking_number)}`)} />
          ) : null}
        </Card>
      ))}

      <Card>
        <Title>Ürünler</Title>
        {(o.order_items ?? []).map((i: any) => (
          <Row key={i.id} label={`${i.quantity} × ${i.name}`} value={fmtTRY(i.total)} />
        ))}
      </Card>

      <Card>
        <Row label="Ara toplam" value={fmtTRY(o.subtotal)} />
        <Row label="Kargo" value={Number(o.shipping_cost) ? fmtTRY(o.shipping_cost) : 'Bedava'} />
        {Number(o.discount_amount) ? <Row label="İndirim" value={`−${fmtTRY(o.discount_amount)}`} /> : null}
        <Row label="Toplam" value={<Text style={{ fontWeight: '800', color: colors.text }}>{fmtTRY(o.total)}</Text>} />
      </Card>

      <Card>
        <Title>Teslimat adresi</Title>
        <Text style={{ color: colors.text }}>
          {[addr.first_name, addr.last_name].filter(Boolean).join(' ')}
          {'\n'}
          {addr.address_line1}
          {'\n'}
          {[addr.district, addr.city].filter(Boolean).join(' / ')}
        </Text>
      </Card>

      {data!.invoices.length ? (
        <Card>
          <Title>Fatura</Title>
          {data!.invoices.map((inv) => (
            <Button
              key={inv.id}
              title={inv.invoice_number ? `Faturayı aç (${inv.invoice_number})` : 'Faturayı aç'}
              variant="outline"
              loading={downloading === inv.id}
              onPress={() => openInvoice(inv)}
            />
          ))}
        </Card>
      ) : o.status !== 'cancelled' ? (
        <Muted>Fatura satıcı tarafından yüklendiğinde burada görünecek.</Muted>
      ) : null}

      {o.status === 'delivered' ? (
        <Button title="İade talebi oluştur" variant="outline" onPress={() => Linking.openURL(`${WEB_URL}/hesabim/siparislerim/${o.id}`)} />
      ) : null}
    </Screen>
  )
}
