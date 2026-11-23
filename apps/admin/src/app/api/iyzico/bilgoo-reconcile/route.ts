import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Yarım kalan BILGOO ödemelerinin iyzico mutabakatı (pg_cron, 10 dk'da bir).
//
// Müşteri iyzico ekranını kapatırsa veya callback gelmezse sipariş 'pending',
// kampanya hakkı 'reserved' kalır; 30 dk temizliği bu siparişleri bilerek atlar.
// Bu iş siparişi hiçbir zaman kendisi kapatmaz. Üç yol vardır:
//
//   1. KESİN SONUÇ — ödeme formu SUCCESS ya da FAILURE döndürür. Token web
//      callback'ine iletilir; callback sonucu iyzico'dan yeniden doğrular ve
//      siparişi normal dönüşle aynı yoldan sonuçlandırır (ödeme kaydı, tutar
//      kontrolü, stok, e-posta; FAILURE'da hak serbest kalır).
//   2. AÇIK / BELİRSİZ — form sonuç vermiyor, token yok, alanlar boş, ağ veya
//      iyzico hatası. Bunların hiçbiri ödemenin alınmadığını kanıtlamaz; hak
//      ayrılmış kalır ve bir sonraki çalışmada yeniden sorulur.
//   3. MANUEL İNCELEME — iyzico'da ödeme kaydı var ama form sonucu alınamıyor,
//      token başka sepete ait ya da REVIEW_AFTER_CHECKS denemede sonuç çıkmadı.
//      needs_review=true işaretlenir. Yönetici iyzico panelinden kontrol edip
//      gerekirse admin /api/iyzico/bilgoo-review ile siparişi kapatır.

const FORM_EXPIRY_MS = 45 * 60 * 1000 // iyzico ödeme formu token'ı 30 dk geçerli; pay bırakıldı
const BATCH = 20
const REVIEW_AFTER_CHECKS = 12 // ~2 saat (10 dk aralık) kesin sonuç yoksa manuel inceleme

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
  [r?.status, r?.paymentStatus, r?.errorCode, r?.errorMessage].filter(Boolean).join(' / ').slice(0, 300) || 'boş yanıt'

type Outcome = { path: 'definitive' | 'open' | 'manual_review'; text: string }

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
    .select('order_id, conversation_id, checkout_token, check_count, needs_review, orders!inner(order_number, payment_status)')
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
    let outcome: Outcome
    try {
      outcome = await check(a, order)
    } catch (e: any) {
      outcome = { path: 'open', text: `hata: ${String(e?.message || e).slice(0, 200)}` }
    }
    const checks = a.check_count + 1
    const review = a.needs_review || outcome.path === 'manual_review' ||
      (outcome.path === 'open' && checks >= REVIEW_AFTER_CHECKS)
    await service.from('bilgoo_coupon_attempts')
      .update({
        checked_at: new Date().toISOString(),
        check_count: checks,
        last_check: `${outcome.path}: ${outcome.text}`.slice(0, 500),
        needs_review: review,
      })
      .eq('order_id', a.order_id).eq('state', 'reserved')
    results.push({ order: order?.order_number, path: outcome.path, needsReview: review, result: outcome.text })
  }

  return NextResponse.json({ ok: true, processed: results.length, results })

  async function check(a: any, order: any): Promise<Outcome> {
    if (order?.payment_status !== 'pending') {
      // Sipariş başka yoldan sonuçlandı ama hak hâlâ reserved: trigger dışı bir değişiklik.
      return { path: 'manual_review', text: `sipariş ${order?.payment_status} iken hak reserved` }
    }
    if (a.checkout_token) {
      const form = await call(iyzipay, 'checkoutForm', 'retrieve', {
        locale: 'tr', conversationId: `bilgoo_reconcile_${order.order_number}`, token: a.checkout_token,
      })
      const definitive = form?.status === 'success' && (form.paymentStatus === 'SUCCESS' || form.paymentStatus === 'FAILURE')
      if (definitive) {
        if (form.basketId !== order.order_number) {
          return { path: 'manual_review', text: `token ${form.basketId ?? 'sepetsiz'} sepetine ait` }
        }
        const res = await fetch(`${webUrl}/api/payment/callback`, {
          method: 'POST',
          body: new URLSearchParams({ token: a.checkout_token }),
          redirect: 'manual',
        })
        return { path: 'definitive', text: `iyzico ${form.paymentStatus}; callback ${res.status} ${res.headers.get('location') ?? ''}`.trim() }
      }
      if (form?.paymentId) {
        return { path: 'manual_review', text: `form ödeme kimliği var ama sonuç belirsiz: ${describe(form)}` }
      }
    }
    // Token yok ya da form sonuçsuz: ödeme kaydını konuşma kimliğiyle ara. Bulunamaması
    // hiçbir zaman "ödeme alınmadı" sayılmaz; yalnız bulunan ödeme incelemeye düşer.
    if (a.conversation_id) {
      const payment = await call(iyzipay, 'payment', 'retrieve', {
        locale: 'tr', conversationId: `bilgoo_reconcile_${order.order_number}`, paymentConversationId: a.conversation_id,
      })
      if (payment?.paymentId) {
        return { path: 'manual_review', text: `iyzico'da ödeme kaydı var (${payment.paymentId}, ${payment.paymentStatus ?? '?'}) ama form sonucu alınamadı` }
      }
      return { path: 'open', text: `form ${a.checkout_token ? 'sonuçsuz' : 'token yok'}; ödeme sorgusu: ${describe(payment)}` }
    }
    return { path: 'open', text: `form ${a.checkout_token ? 'sonuçsuz' : 'token yok'}; konuşma kimliği yok` }
  }
}
