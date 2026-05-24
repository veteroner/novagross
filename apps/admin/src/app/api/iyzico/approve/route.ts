import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * iyzico Pazaryeri Onay Verme
 * POST /api/iyzico/approve
 * Body: { orderItemId: string }
 *
 * iyzico docs: POST https://api.iyzipay.com/payment/iyzipos/item/approve
 * Para, onay verilene dek iyzico korumalı havuz hesabında bekler.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin role check
    const service = createServiceRoleClient()
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = (profile as any)?.role
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { orderItemId } = body

    if (!orderItemId) {
      return NextResponse.json({ error: 'orderItemId gerekli' }, { status: 400 })
    }

    // Fetch order item with paymentTransactionId
    const { data: item, error: itemError } = await service
      .from('order_items')
      .select('id, iyzico_payment_transaction_id, iyzico_approval_status')
      .eq('id', orderItemId)
      .maybeSingle()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Sipariş kalemi bulunamadı' }, { status: 404 })
    }

    const paymentTransactionId = (item as any).iyzico_payment_transaction_id
    if (!paymentTransactionId) {
      return NextResponse.json(
        { error: 'Bu kalem için iyzico paymentTransactionId kaydedilmemiş. Ödeme bilgisi eksik.' },
        { status: 422 }
      )
    }

    if ((item as any).iyzico_approval_status === 'approved') {
      return NextResponse.json({ ok: true, alreadyApproved: true, paymentTransactionId })
    }

    // Call iyzico approve API
    const apiKey = process.env.IYZICO_API_KEY
    const secretKey = process.env.IYZICO_SECRET_KEY
    const baseUrl = process.env.IYZICO_BASE_URL || 'https://api.iyzipay.com'

    if (!apiKey || !secretKey) {
      return NextResponse.json({ error: 'iyzico API kimlik bilgileri eksik' }, { status: 500 })
    }

    const IyzipayModule: any = await import(/* webpackIgnore: true */ 'iyzipay')
    const Iyzipay = IyzipayModule?.default || IyzipayModule
    const iyzipay = new Iyzipay({ apiKey, secretKey, uri: baseUrl })

    const iyzicoResult = await new Promise<any>((resolve, reject) => {
      iyzipay.approval.create(
        {
          locale: 'tr',
          conversationId: `approve_${orderItemId.slice(0, 8)}_${Date.now()}`,
          paymentTransactionId,
        },
        (err: any, result: any) => {
          if (err) reject(err)
          else resolve(result)
        }
      )
    })

    if (iyzicoResult.status !== 'success') {
      console.error('[iyzico Approve] Failed:', {
        errorCode: iyzicoResult.errorCode,
        errorMessage: iyzicoResult.errorMessage,
        paymentTransactionId,
      })
      return NextResponse.json(
        {
          error: iyzicoResult.errorMessage || 'iyzico onay başarısız',
          errorCode: iyzicoResult.errorCode,
        },
        { status: 502 }
      )
    }

    // Update DB
    await service
      .from('order_items')
      .update({
        iyzico_approval_status: 'approved',
        iyzico_approved_at: new Date().toISOString(),
      } as any)
      .eq('id', orderItemId)

    console.log('[iyzico Approve] Success:', { orderItemId, paymentTransactionId })
    return NextResponse.json({ ok: true, paymentTransactionId })
  } catch (error: any) {
    console.error('[iyzico Approve] Error:', error)
    return NextResponse.json({ error: error?.message || 'Sunucu hatası' }, { status: 500 })
  }
}
