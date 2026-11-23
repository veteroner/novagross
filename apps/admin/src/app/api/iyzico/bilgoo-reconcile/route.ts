import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Yarım kalan BILGOO ödemelerinin iyzico mutabakatı (pg_cron, 10 dk'da bir).
//
// Müşteri iyzico ekranını kapatırsa veya callback gelmezse sipariş 'pending',
// kampanya hakkı 'reserved' kalır; 30 dk temizliği bu siparişleri bilerek atlar.
// Süre dolması tek başına ödemenin alınmadığını kanıtlamaz. Bu iş sonucu
// iyzico'dan sorar:
//   - Ödeme formu bir sonuç döndürürse (SUCCESS ya da FAILURE) token web
//     callback'ine iletilir; sipariş, iyzico'nun normal dönüşüyle aynı yoldan
//     (tutar doğrulama, ödeme kaydı, stok, e-posta) sonuçlanır.
//   - Form sonuç vermiyorsa ve form süresi dolmuşsa ödeme ayrıca konuşma
//     kimliğiyle sorgulanır. İki sorgu da ödeme bulunmadığını söylerse sipariş
//     kapatılır, hak ve stok serbest kalır.
//     "Ödeme yok" hata kodları BILGOO_RECONCILE_NOT_FOUND_CODES ile verilir; sandbox'ta
//     doğrulanmadan tanımlanmamalıdır.
//   - Ağ hatası, belirsiz yanıt veya tutarsız sonuçta hiçbir şey değişmez;
//     bir sonraki çalışmada yeniden denenir ve son durum last_check'e yazılır.

const FORM_EXPIRY_MS = 45 * 60 * 1000 // iyzico ödeme formu token'ı 30 dk geçerli; pay bırakıldı
const BATCH = 20
const ALERT_AFTER_CHECKS = 12 // ~2 saat sonuç alınamazsa kayıtta görünür uyarı

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.IYZICO_CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

function call(iyzipay: any, resource: string, method: string, request: any): Promise<any> {
  return new Promise((resolve, reject) => {
    iyzipay[resource][method](request, (err: any, res: any) => (err ? reject(err) : resolve(res)))
  })
}

const describe = (r: any) =>
  [r?.status, r?.paymentStatus, r?.errorCode, r?.errorMessage].filter(Boolean).join(' / ').slice(0, 300)

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const apiKey = process.env.IYZICO_API_KEY
  const secretKey = process.env.IYZICO_SECRET_KEY
  const baseUrl = process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'
  const webUrl = (process.env.NEXT_PUBLIC_WEB_SITE_URL || 'https://novagross.com').replace(/\/$/, '')
  if (!apiKey || !secretKey) {
    return NextResponse.json({ ok: false, error: 'iyzico API kimlik bilgileri eksik' }, { status: 500 })
  }

  const service: any = createServiceRoleClient()
  const cutoff = new Date(Date.now() - FORM_EXPIRY_MS).toISOString()
  const { data: queue, error } = await service
    .from('bilgoo_coupon_attempts')
    .select('order_id, conversation_id, checkout_token, reserved_at, check_count, orders!inner(order_number, payment_status, total)')
    .eq('state', 'reserved')
    .lt('reserved_at', cutoff)
    .order('checked_at', { ascending: true, nullsFirst: true })
    .limit(BATCH)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const IyzipayModule: any = await import(/* webpackIgnore: true */ 'iyzipay')
  const Iyzipay = IyzipayModule?.default || IyzipayModule
  const iyzipay = new Iyzipay({ apiKey, secretKey, uri: baseUrl })

  const results: any[] = []
  for (const a of (queue || []) as any[]) {
    const order = a.orders
    const note = async (text: string) => {
      const alert = a.check_count + 1 >= ALERT_AFTER_CHECKS ? 'MANUEL KONTROL: ' : ''
      await service.from('bilgoo_coupon_attempts')
        .update({ checked_at: new Date().toISOString(), check_count: a.check_count + 1, last_check: alert + text })
        .eq('order_id', a.order_id).eq('state', 'reserved')
      results.push({ order: order?.order_number, result: alert + text })
    }

    try {
      if (order?.payment_status !== 'pending') {
        // Sipariş başka yoldan sonuçlandı; settle trigger hakkı zaten güncellemiş olmalı.
        await note(`sipariş durumu ${order?.payment_status}, işlem yapılmadı`)
        continue
      }

      let formSaysNoPayment = false
      if (a.checkout_token) {
        const form = await call(iyzipay, 'checkoutForm', 'retrieve', {
          locale: 'tr', conversationId: `bilgoo_reconcile_${order.order_number}`, token: a.checkout_token,
        })
        if (form?.status === 'success' && (form.paymentStatus === 'SUCCESS' || form.paymentStatus === 'FAILURE')) {
          if (form.basketId && form.basketId !== order.order_number) {
            await note(`token başka sepete ait (${form.basketId}), işlem yapılmadı`)
            continue
          }
          // Kesin sonuç: web callback'i aynı token'ı iyzico'dan yeniden doğrular ve siparişi sonuçlandırır.
          const res = await fetch(`${webUrl}/api/payment/callback`, {
            method: 'POST',
            body: new URLSearchParams({ token: a.checkout_token }),
            redirect: 'manual',
          })
          await note(`iyzico ${form.paymentStatus}; callback ${res.status} ${res.headers.get('location') ?? ''}`.trim())
          continue
        }
        // Form sonuç döndürmedi: ödeme hiç tamamlanmamış ya da form süresi dolmuş olabilir.
        formSaysNoPayment = !form?.paymentId && !form?.paymentStatus
        if (!formSaysNoPayment) {
          await note(`belirsiz form yanıtı: ${describe(form)}`)
          continue
        }
      }

      if (!a.conversation_id) {
        await note('konuşma kimliği yok; ödeme ikinci kez doğrulanamadı')
        continue
      }
      const payment = await call(iyzipay, 'payment', 'retrieve', {
        locale: 'tr', conversationId: `bilgoo_reconcile_${order.order_number}`, paymentConversationId: a.conversation_id,
      })
      if (payment?.status === 'success' && payment.paymentId) {
        // Ödeme var ama form sonucu alınamadı: otomatik kapatma yok, insan bakmalı.
        await note(`MANUEL KONTROL: iyzico'da ödeme var (paymentId ${payment.paymentId}, ${payment.paymentStatus ?? '?'}) ama form sonucu alınamadı`)
        continue
      }
      // Yalnız sandbox'ta "ödeme yok" anlamına geldiği doğrulanmış iyzico hata kodları
      // kapatma yapar. Liste boşsa (varsayılan) sipariş açık kalır ve elle kontrol beklenir;
      // yetki, imza veya geçici hatalar hiçbir zaman ödeme yok sayılmaz.
      const notFoundCodes = (process.env.BILGOO_RECONCILE_NOT_FOUND_CODES || '')
        .split(',').map((c) => c.trim()).filter(Boolean)
      if (payment?.status !== 'failure' || !notFoundCodes.includes(String(payment?.errorCode ?? ''))) {
        await note(`belirsiz ödeme sorgusu: ${describe(payment)}`)
        continue
      }
      // İki bağımsız sorgu da ödeme bulunmadığını söylüyor ve form süresi doldu.
      const reason = `iyzico ödeme yok (form: ${a.checkout_token ? 'sonuçsuz' : 'token yok'}; ödeme sorgusu: ${describe(payment)})`
      const { data: closed, error: closeError } = await service.rpc('close_unpaid_bilgoo_order', {
        p_order_id: a.order_id, p_reason: reason,
      })
      if (closeError) {
        await note(`kapatma hatası: ${closeError.message}`)
        continue
      }
      results.push({ order: order.order_number, result: closed ? `kapatıldı: ${reason}` : 'zaten sonuçlanmış' })
    } catch (e: any) {
      await note(`hata: ${String(e?.message || e).slice(0, 200)}`)
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
