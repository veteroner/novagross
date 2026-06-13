import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getOrigin(request: NextRequest): string {
  const proto = (request.headers.get('x-forwarded-proto') || '').split(',')[0]?.trim()
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0]?.trim()
  if (proto && host) return `${proto}://${host}`
  try {
    return request.nextUrl.origin
  } catch {
    return process.env.NEXT_PUBLIC_SELLER_URL || 'https://seller.novagross.com'
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.IYZICO_API_KEY
    const secretKey = process.env.IYZICO_SECRET_KEY
    const baseUrl = process.env.IYZICO_BASE_URL
    const isMock = process.env.PAYMENT_MOCK_MODE === 'true'

    if (!isMock && (!apiKey || !secretKey || !baseUrl)) {
      return NextResponse.json({ error: 'Ödeme sistemi yapılandırılmamış.' }, { status: 500 })
    }

    const body = await request.json()
    const amount = Math.floor(Number(body?.amount))
    if (!Number.isFinite(amount) || amount < 50 || amount > 100000) {
      return NextResponse.json({ error: 'Tutar 50 ₺ ile 100.000 ₺ arasında olmalı.' }, { status: 400 })
    }

    // Oturum + mağaza
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 })

    const db = createServiceRoleClient()
    const { data: store } = await (db as any)
      .from('stores')
      .select('id, store_name, email, phone, city, address, tax_number')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!store) return NextResponse.json({ error: 'Mağaza bulunamadı.' }, { status: 403 })

    const conversationId = `adbal_${Date.now()}`
    const basketId = `ADBAL-${store.id.slice(0, 8)}-${Date.now()}`
    const priceStr = amount.toFixed(2)
    const siteUrl = getOrigin(request)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'

    // Bekleyen top-up kaydı
    await (db as any).from('ad_balance_topups').insert({
      store_id: store.id,
      amount,
      conversation_id: conversationId,
      basket_id: basketId,
      status: 'pending',
    })

    const identity = /^\d{11}$/.test(String(store.tax_number || '')) ? String(store.tax_number) : '11111111111'

    const checkoutFormRequest = {
      locale: 'tr',
      conversationId,
      price: priceStr,
      paidPrice: priceStr,
      currency: 'TRY',
      basketId,
      paymentGroup: 'PRODUCT',
      buyer: {
        id: user.id,
        name: store.store_name?.split(' ')[0] || 'Magaza',
        surname: 'Satici',
        gsmNumber: (store.phone || '+905000000000').replace(/\s/g, ''),
        email: store.email || user.email || 'satici@novagross.com',
        identityNumber: identity,
        registrationAddress: store.address || 'Türkiye',
        ip,
        city: store.city || 'İstanbul',
        country: 'Turkey',
        zipCode: '34000',
      },
      shippingAddress: {
        contactName: store.store_name || 'Mağaza',
        city: store.city || 'İstanbul',
        country: 'Turkey',
        address: store.address || 'Türkiye',
        zipCode: '34000',
      },
      billingAddress: {
        contactName: store.store_name || 'Mağaza',
        city: store.city || 'İstanbul',
        country: 'Turkey',
        address: store.address || 'Türkiye',
        zipCode: '34000',
      },
      basketItems: [
        {
          id: 'AD_BALANCE',
          name: 'Reklam Bakiyesi Yükleme',
          category1: 'Reklam',
          itemType: 'VIRTUAL' as const,
          price: priceStr,
        },
      ],
      callbackUrl: `${siteUrl}/api/ad-balance/callback`,
      enabledInstallments: [1, 2, 3, 6],
    }

    const IyzipayModule: any = await import(/* webpackIgnore: true */ 'iyzipay')
    const Iyzipay = IyzipayModule?.default || IyzipayModule
    const iyzipay = new Iyzipay({ apiKey, secretKey, uri: baseUrl })

    const result = await new Promise<any>((resolve, reject) => {
      iyzipay.checkoutFormInitialize.create(checkoutFormRequest, (err: any, res: any) => {
        if (err) reject(err)
        else resolve(res)
      })
    })

    if (result.status !== 'success') {
      console.error('[ad-balance initialize] iyzico error:', result.errorMessage)
      return NextResponse.json({ error: result.errorMessage || 'Ödeme başlatılamadı.' }, { status: 502 })
    }

    // token sakla (callback retrieve için gerekmiyor ama izlenebilirlik için)
    await (db as any).from('ad_balance_topups').update({ token: result.token }).eq('basket_id', basketId)

    return NextResponse.json({ checkoutFormContent: result.checkoutFormContent })
  } catch (e: any) {
    console.error('[ad-balance initialize] error:', e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
