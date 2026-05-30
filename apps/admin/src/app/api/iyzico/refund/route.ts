import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * iyzico Refund (Para İadesi)
 * POST /api/iyzico/refund
 * Body: { returnRequestId: string }
 *
 * Akış:
 *  1. Admin kontrolü
 *  2. return_request bulunur (status='approved' olmalı)
 *  3. İlgili order_item üzerinden iyzico_payment_transaction_id alınır
 *  4. iyzico /payment/refund endpoint'i çağrılır
 *  5. Başarı: mark_return_refunded RPC + iyzico fields
 *     Başarısız: error fields güncellenir, status değişmez
 *
 * iyzipay refund.create({ paymentTransactionId, price, currency, ip })
 */
export async function POST(request: NextRequest) {
  try {
    // Auth
    const sessionClient = await createClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    // Admin check
    const service = createServiceRoleClient()
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = (profile as any)?.role
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Yalnızca yöneticiler refund başlatabilir' }, { status: 403 })
    }

    const { returnRequestId } = await request.json()
    if (!returnRequestId) {
      return NextResponse.json({ error: 'returnRequestId gerekli' }, { status: 400 })
    }

    // Fetch return request + linked order_item
    const { data: req, error: reqErr } = await (service as any)
      .from('return_requests')
      .select(
        `
        id,
        status,
        refund_amount,
        order_item_id,
        order_items ( iyzico_payment_transaction_id, price )
      `
      )
      .eq('id', returnRequestId)
      .maybeSingle()

    if (reqErr || !req) {
      return NextResponse.json({ error: 'İade talebi bulunamadı' }, { status: 404 })
    }

    if (req.status === 'refunded') {
      return NextResponse.json({ ok: true, alreadyRefunded: true })
    }

    if (req.status !== 'approved') {
      return NextResponse.json(
        { error: `Refund için talep 'approved' durumunda olmalı (mevcut: ${req.status})` },
        { status: 422 }
      )
    }

    const paymentTransactionId = req.order_items?.iyzico_payment_transaction_id
    if (!paymentTransactionId) {
      return NextResponse.json(
        {
          error:
            'Bu kalem için iyzico paymentTransactionId bulunmuyor. Manuel refund + "Mark Refunded" kullanın.',
        },
        { status: 422 }
      )
    }

    const refundAmount = Number(req.refund_amount)
    if (!refundAmount || refundAmount <= 0) {
      return NextResponse.json({ error: 'Geçersiz iade tutarı' }, { status: 422 })
    }

    // iyzico env
    const apiKey = process.env.IYZICO_API_KEY
    const secretKey = process.env.IYZICO_SECRET_KEY
    const baseUrl = process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'

    if (!apiKey || !secretKey) {
      return NextResponse.json({ error: 'iyzico API kimlik bilgileri eksik' }, { status: 500 })
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'

    // Update DB: attempt timestamp
    await (service as any)
      .from('return_requests')
      .update({ iyzico_refund_attempted_at: new Date().toISOString() })
      .eq('id', returnRequestId)

    // Call iyzipay
    const IyzipayModule: any = await import(/* webpackIgnore: true */ 'iyzipay')
    const Iyzipay = IyzipayModule?.default || IyzipayModule
    const iyzipay = new Iyzipay({ apiKey, secretKey, uri: baseUrl })

    const iyzicoResult: any = await new Promise((resolve, reject) => {
      iyzipay.refund.create(
        {
          locale: 'tr',
          conversationId: `refund_${returnRequestId.slice(0, 8)}_${Date.now()}`,
          paymentTransactionId,
          price: refundAmount.toFixed(2),
          currency: 'TRY',
          ip,
        },
        (err: any, result: any) => {
          if (err) reject(err)
          else resolve(result)
        }
      )
    })

    if (iyzicoResult.status !== 'success') {
      console.error('[iyzico Refund] failed:', {
        returnRequestId,
        paymentTransactionId,
        errorCode: iyzicoResult.errorCode,
        errorMessage: iyzicoResult.errorMessage,
      })

      await (service as any)
        .from('return_requests')
        .update({
          iyzico_refund_error_code: iyzicoResult.errorCode || 'unknown',
          iyzico_refund_error_message:
            iyzicoResult.errorMessage || 'iyzico hata mesajı dönmedi',
        })
        .eq('id', returnRequestId)

      return NextResponse.json(
        {
          error: iyzicoResult.errorMessage || 'iyzico refund başarısız',
          errorCode: iyzicoResult.errorCode,
        },
        { status: 502 }
      )
    }

    // Success — mark as refunded via RPC + save iyzico ids
    const iyzicoRefundPaymentId =
      iyzicoResult.paymentId || iyzicoResult.payment_id || null

    const { error: rpcErr } = await (service as any).rpc('mark_return_refunded', {
      p_request_id: returnRequestId,
      p_iyzico_refund_id: iyzicoRefundPaymentId,
    })

    if (rpcErr) {
      console.error('[iyzico Refund] DB mark failed but iyzico OK:', rpcErr)
      return NextResponse.json(
        {
          error: 'iyzico refund başarılı ancak DB güncellemesi hatalı: ' + rpcErr.message,
          iyzicoSuccess: true,
        },
        { status: 500 }
      )
    }

    await (service as any)
      .from('return_requests')
      .update({
        iyzico_refund_payment_id: iyzicoRefundPaymentId,
        iyzico_refund_error_code: null,
        iyzico_refund_error_message: null,
      })
      .eq('id', returnRequestId)

    console.log('[iyzico Refund] success:', {
      returnRequestId,
      paymentTransactionId,
      iyzicoPaymentId: iyzicoRefundPaymentId,
      amount: refundAmount,
    })

    return NextResponse.json({
      ok: true,
      iyzicoPaymentId: iyzicoRefundPaymentId,
      amount: refundAmount,
    })
  } catch (error: any) {
    console.error('[iyzico Refund] uncaught error:', error)
    return NextResponse.json({ error: error?.message || 'Sunucu hatası' }, { status: 500 })
  }
}
