import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useCartActions } from '@/lib/cart'
import { Button, Muted } from '@/components/ui'
import { parsePath } from '@/lib/format'
import { colors, space } from '@/lib/theme'

// payment/callback hata kodları (apps/web/src/app/api/payment/callback/route.ts)
const ERRORS: Record<string, string> = {
  invalid_token: 'Ödeme oturumu geçersiz. Lütfen tekrar deneyin.',
  missing_basket_id: 'Sepet bilgisi bulunamadı. Lütfen tekrar deneyin.',
  order_not_found: 'Sipariş bulunamadı. Kartınızdan çekim yapıldıysa bizimle iletişime geçin.',
  amount_mismatch: 'Ödeme tutarı doğrulanamadı; işlem iptal edildi.',
  order_update_failed: 'Ödeme alındı ancak sipariş güncellenemedi. Destek ekibimiz kontrol edecek.',
  payment_update_failed: 'Ödeme alındı ancak kayıt güncellenemedi. Destek ekibimiz kontrol edecek.',
  callback_error: 'Ödeme sonucu alınırken bir hata oluştu.',
}

export default function PaymentResult() {
  const { path = '' } = useLocalSearchParams<{ path: string }>()
  const { clear } = useCartActions()
  const qc = useQueryClient()

  const { pathname, params } = parsePath(path || '/')
  const success = pathname.startsWith('/siparis-basarili')
  const orderId = params.order_id
  const orderNumber = params.order_number
  const code = params.error ?? ''
  const message = ERRORS[code] ?? (code || 'Ödeme tamamlanamadı.')

  useEffect(() => {
    if (!success) return
    clear()
    qc.invalidateQueries({ queryKey: ['orders'] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success])

  return (
    <View style={{ flex: 1, padding: space(6), gap: space(4), justifyContent: 'center', backgroundColor: colors.bg }}>
      <Ionicons
        name={success ? 'checkmark-circle' : 'close-circle'}
        size={72}
        color={success ? colors.success : colors.danger}
        style={{ alignSelf: 'center' }}
      />
      <Text style={{ fontSize: 22, fontWeight: '800', textAlign: 'center', color: colors.text }}>
        {success ? 'Siparişiniz alındı' : 'Ödeme başarısız'}
      </Text>
      <Muted style={{ textAlign: 'center' }}>
        {success
          ? `Sipariş no: #${orderNumber ?? ''}. Satıcı siparişinizi hazırladığında ve kargoya verdiğinde bildirim alacaksınız.`
          : message}
      </Muted>
      {success && orderId ? (
        <Button title="Siparişi görüntüle" onPress={() => router.replace({ pathname: '/siparis/[id]', params: { id: orderId } })} />
      ) : (
        <Button title="Sepete dön" onPress={() => router.replace('/sepet')} />
      )}
      <Button title="Alışverişe devam et" variant="outline" onPress={() => router.replace('/')} />
    </View>
  )
}
