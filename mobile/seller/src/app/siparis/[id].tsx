import { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import * as DocumentPicker from 'expo-document-picker'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { File } from 'expo-file-system'
import { useAuth } from '@/providers/auth'
import { useOrders, needsShipping } from '@/lib/queries'
import { sellerApi, sellerApiBinary } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { Badge, Button, Card, Empty, Loading, Muted, Row, Screen, Title } from '@/components/ui'
import { OrderBadge } from '@/components/order-badge'
import { fmtDate, fmtTRY, SHIPMENT_STATUS } from '@/lib/format'
import { space } from '@/lib/theme'

// MNG tek entegre kargo; web paneldeki varsayılanla aynı (shipping_carriers.code = 'mng')
async function mngCarrierAndMethod() {
  const { data: carrier } = await supabase.from('shipping_carriers').select('id').eq('code', 'mng').maybeSingle()
  if (!carrier) throw new Error('MNG kargo tanımı bulunamadı')
  const { data: method } = await supabase
    .from('shipping_methods')
    .select('id')
    .eq('carrier_id', (carrier as any).id)
    .eq('is_active', true)
    .order('code')
    .limit(1)
    .maybeSingle()
  if (!method) throw new Error('MNG kargo yöntemi bulunamadı')
  return { carrierId: (carrier as any).id, methodId: (method as any).id }
}

function toBase64(buf: ArrayBuffer) {
  let bin = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return globalThis.btoa(bin)
}

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { store } = useAuth()
  const qc = useQueryClient()
  const { data: orders, isLoading, isFetching, refetch } = useOrders()
  const [busy, setBusy] = useState<string | null>(null)

  if (isLoading) return <Loading />
  const o = orders?.find((x) => x.id === id)
  if (!o) return <Empty text="Sipariş bulunamadı" />

  const addr = o.shipping_address ?? {}
  const refresh = () => qc.invalidateQueries({ queryKey: ['orders'] })

  const ship = () =>
    Alert.alert('MNG ile kargola', `#${o.order_number} için MNG Kargo gönderisi ve resmi etiket oluşturulsun mu?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kargola',
        onPress: async () => {
          setBusy('ship')
          try {
            const { carrierId, methodId } = await mngCarrierAndMethod()
            await sellerApi(`/api/orders/${o.id}/shipment`, {
              method: 'POST',
              body: { carrierId, methodId, weight: 1, pieceCount: 1, createLabel: true },
            })
            await refresh()
            Alert.alert('Kargo oluşturuldu', 'Etiketi yazdırıp paketi MNG şubesine teslim edin.')
          } catch (e: any) {
            Alert.alert('Kargo oluşturulamadı', e.message)
          } finally {
            setBusy(null)
          }
        },
      },
    ])

  const label = async (mode: 'print' | 'share') => {
    setBusy('label')
    try {
      const png = await sellerApiBinary(`/api/orders/${o.id}/shipment/label`)
      const html = `<html><body style="margin:0"><img src="data:image/png;base64,${toBase64(png)}" style="width:100%"/></body></html>`
      if (mode === 'print') await Print.printAsync({ html })
      else {
        const { uri } = await Print.printToFileAsync({ html })
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Kargo etiketi #${o.order_number}` })
      }
    } catch (e: any) {
      Alert.alert('Etiket alınamadı', e.message)
    } finally {
      setBusy(null)
    }
  }

  const uploadInvoice = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true })
    if (res.canceled || !res.assets?.[0]) return
    const asset = res.assets[0]
    if ((asset.size ?? 0) > 10 * 1024 * 1024) return Alert.alert('Dosya çok büyük', 'Fatura 10 MB üstünde olamaz.')
    setBusy('invoice')
    try {
      const bytes = await new File(asset.uri).arrayBuffer()
      // Web paneliyle aynı yol kuralı (api/orders/[id]/invoice bunu doğrular)
      const path = `${store!.storeId}/${o.id}/invoice_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`
      const { error } = await supabase.storage.from('invoices').upload(path, bytes, { upsert: false, contentType: 'application/pdf' })
      if (error) throw error
      await sellerApi(`/api/orders/${o.id}/invoice`, { method: 'POST', body: { filePath: path, fileSize: bytes.byteLength } })
      await refresh()
      Alert.alert('Fatura yüklendi', 'Müşteriye bildirim gönderildi.')
    } catch (e: any) {
      Alert.alert('Fatura yüklenemedi', e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Screen refreshing={isFetching} onRefresh={refetch}>
      <Stack.Screen options={{ title: `#${o.order_number}` }} />

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title>#{o.order_number}</Title>
          <OrderBadge o={o} />
        </View>
        <Row label="Tarih" value={fmtDate(o.created_at, true)} />
        <Row label="Tutar (bu mağaza)" value={fmtTRY(o.total)} />
      </Card>

      <Card>
        <Title>Ürünler</Title>
        {o.items.map((it) => (
          <View key={it.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space(3) }}>
            <Text style={{ flex: 1 }}>
              {it.quantity} × {it.name}
            </Text>
            <Text style={{ fontWeight: '600' }}>{fmtTRY(it.total)}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Title>Teslimat adresi</Title>
        <Text style={{ fontWeight: '600' }}>
          {addr.first_name} {addr.last_name}
        </Text>
        <Muted>
          {addr.address_line1}
          {addr.district ? `, ${addr.district}` : ''}
          {addr.city ? ` / ${addr.city}` : ''}
        </Muted>
      </Card>

      <Card>
        <Title>Kargo</Title>
        {o.shipment ? (
          <>
            <Row
              label="Durum"
              value={<Badge label={SHIPMENT_STATUS[o.shipment.status] ?? o.shipment.status} tone={o.shipment.status === 'delivered' ? 'success' : 'neutral'} />}
            />
            <Row label="Takip no" value={o.shipment.tracking_number ?? '-'} />
            {o.shipment.provider_code === 'mng' && !o.shipment.mng_shipment_id && o.shipment.status !== 'delivered' ? (
              <Muted>Paket henüz MNG şubesinde okutulmadı — etiketteki resmi barkodla teslim edin.</Muted>
            ) : null}
            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1 }}>
                <Button title="Etiketi yazdır" onPress={() => label('print')} loading={busy === 'label'} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Paylaş (PDF)" variant="outline" onPress={() => label('share')} disabled={busy === 'label'} />
              </View>
            </View>
          </>
        ) : needsShipping(o) ? (
          <Button title="MNG ile kargola" onPress={ship} loading={busy === 'ship'} />
        ) : (
          <Muted>Kargo kaydı yok</Muted>
        )}
      </Card>

      {o.shipment && o.status !== 'cancelled' ? (
        <Card>
          <Title>e-Arşiv fatura</Title>
          {o.invoice ? (
            <Row label="Yüklendi" value={fmtDate(o.invoice.uploaded_at, true)} />
          ) : (
            <Muted>Kargolamadan sonra 7 gün içinde PDF faturayı yükleyin.</Muted>
          )}
          <Button
            title={o.invoice ? 'Faturayı değiştir' : 'Fatura yükle (PDF)'}
            variant={o.invoice ? 'outline' : 'primary'}
            onPress={uploadInvoice}
            loading={busy === 'invoice'}
          />
        </Card>
      ) : null}
    </Screen>
  )
}
