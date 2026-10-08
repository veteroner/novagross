import { useRef, useState } from 'react'
import { ActivityIndicator, Alert, Text, View } from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { WebView } from 'react-native-webview'
import { colors, space } from '@/lib/theme'
import { parsePath } from '@/lib/format'

// iyzico ortak ödeme sayfası (3D Secure dahil) uygulama içinde açılır. Ödeme bitince
// novagross.com/api/payment/callback?client=mobile → 303 novagross://odeme/sonuc?path=…
// Bu adresi WebView'da yakalayıp sonuç ekranına geçiyoruz (WebView özel şemayı yükleyemez).
const RESULT_PREFIX = 'novagross://odeme/sonuc'

export default function IyzicoPayment() {
  const { url } = useLocalSearchParams<{ url: string }>()
  const [loading, setLoading] = useState(true)
  const done = useRef(false)

  const finish = (resultUrl: string) => {
    if (done.current) return
    done.current = true
    const path = parsePath(resultUrl).params.path ?? ''
    router.replace({ pathname: '/odeme/sonuc', params: { path } })
  }

  const cancel = () =>
    Alert.alert('Ödemeden çıkılsın mı?', 'Ödemeyi tamamlamadıysanız siparişiniz oluşturulmaz, sepetiniz korunur.', [
      { text: 'Devam et', style: 'cancel' },
      { text: 'Çık', style: 'destructive', onPress: () => router.back() },
    ])

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ headerRight: () => (
            <Text onPress={cancel} style={{ color: colors.primary, fontSize: 16 }}>
              Vazgeç
            </Text>
          ), }} />
      <WebView
        source={{ uri: url }}
        originWhitelist={['https://*', 'http://*', 'novagross://*']}
        onShouldStartLoadWithRequest={(req) => {
          if (req.url.startsWith(RESULT_PREFIX)) {
            finish(req.url)
            return false
          }
          return true
        }}
        // Android'de yönlendirme bazen onShouldStart'a düşmez → hata olarak gelir
        onError={(e) => e.nativeEvent.url?.startsWith(RESULT_PREFIX) && finish(e.nativeEvent.url)}
        onNavigationStateChange={(s) => s.url.startsWith(RESULT_PREFIX) && finish(s.url)}
        onLoadEnd={() => setLoading(false)}
        sharedCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
      />
      {loading ? (
        <View style={{ position: 'absolute', top: space(10), left: 0, right: 0, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : null}
    </View>
  )
}
