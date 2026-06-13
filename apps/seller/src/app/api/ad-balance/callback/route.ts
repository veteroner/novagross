import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getOrigin(request: NextRequest): string {
  const proto = (request.headers.get('x-forwarded-proto') || '').split(',')[0]?.trim()
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0]?.trim()
  if (proto && host) return `${proto}://${host}`
  return process.env.NEXT_PUBLIC_SELLER_URL || 'https://seller.novagross.com'
}

export async function POST(request: NextRequest) {
  const siteUrl = getOrigin(request)
  try {
    const apiKey = process.env.IYZICO_API_KEY
    const secretKey = process.env.IYZICO_SECRET_KEY
    const baseUrl = process.env.IYZICO_BASE_URL

    const formData = await request.formData()
    const token = formData.get('token') as string
    if (!token) {
      return NextResponse.redirect(new URL('/reklam?topup=error', siteUrl), 303)
    }

    const IyzipayModule: any = await import(/* webpackIgnore: true */ 'iyzipay')
    const Iyzipay = IyzipayModule?.default || IyzipayModule
    const iyzipay = new Iyzipay({ apiKey, secretKey, uri: baseUrl })

    const result = await new Promise<any>((resolve, reject) => {
      iyzipay.checkoutForm.retrieve(
        { locale: 'tr', conversationId: `retrieve_${Date.now()}`, token },
        (err: any, res: any) => {
          if (err) reject(err)
          else resolve(res)
        }
      )
    })

    const db = createServiceRoleClient()

    if (result.status !== 'success' || result.paymentStatus !== 'SUCCESS') {
      if (result.basketId) {
        await (db as any).from('ad_balance_topups').update({ status: 'failed' }).eq('basket_id', result.basketId)
      }
      return NextResponse.redirect(new URL('/reklam?topup=failed', siteUrl), 303)
    }

    const basketId = result.basketId as string
    const { data: topup } = await (db as any)
      .from('ad_balance_topups')
      .select('id, store_id, amount, status')
      .eq('basket_id', basketId)
      .maybeSingle()

    if (!topup) {
      return NextResponse.redirect(new URL('/reklam?topup=error', siteUrl), 303)
    }

    // Idempotency: zaten işlendiyse tekrar kredi ekleme
    if (topup.status === 'paid') {
      return NextResponse.redirect(new URL('/reklam?topup=success', siteUrl), 303)
    }

    // Tutar doğrulama
    const paid = Number(result.paidPrice)
    if (Math.abs(paid - Number(topup.amount)) > 0.01) {
      await (db as any).from('ad_balance_topups').update({ status: 'failed' }).eq('id', topup.id)
      return NextResponse.redirect(new URL('/reklam?topup=mismatch', siteUrl), 303)
    }

    // Atomik claim: pending → paid (yarış koruması)
    const { data: claimed } = await (db as any)
      .from('ad_balance_topups')
      .update({ status: 'paid', payment_id: result.paymentId, paid_at: new Date().toISOString() })
      .eq('id', topup.id)
      .eq('status', 'pending')
      .select('id')

    if (!claimed || claimed.length === 0) {
      // Başka çağrı önce işledi
      return NextResponse.redirect(new URL('/reklam?topup=success', siteUrl), 303)
    }

    // Bakiyeye kredi ekle
    await (db as any).rpc('credit_ad_balance', {
      p_store_id: topup.store_id,
      p_amount: Number(topup.amount),
      p_type: 'topup_iyzico',
      p_description: 'Kartla reklam bakiyesi yükleme',
      p_payment_id: result.paymentId,
    })

    return NextResponse.redirect(new URL('/reklam?topup=success', siteUrl), 303)
  } catch (e) {
    console.error('[ad-balance callback] error:', e)
    return NextResponse.redirect(new URL('/reklam?topup=error', siteUrl), 303)
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
