import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queueBulkEmails } from '@/lib/email/queue'
import { Resend } from 'resend'
import { renderEmailTemplate } from '@/lib/email/render'

// Force Node.js runtime for iyzipay compatibility
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getRequestOrigin(request: NextRequest): string | null {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = request.headers.get('host')

  const proto = (forwardedProto || '').split(',')[0]?.trim()
  const fwdHost = (forwardedHost || '').split(',')[0]?.trim()

  if (proto && fwdHost) return `${proto}://${fwdHost}`

  try {
    return request.nextUrl.origin
  } catch {
    if (host) return `https://${host}`
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.IYZICO_API_KEY
    const secretKey = process.env.IYZICO_SECRET_KEY
    const baseUrl = process.env.IYZICO_BASE_URL
    // Prefer request-derived origin so redirects stay on the active domain (custom domain vs netlify.app).
    const requestOrigin = getRequestOrigin(request)
    const siteUrl = requestOrigin || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    // Mock mode only allowed via explicit env flag — never infer from missing keys
    const isDevelopmentMode = process.env.PAYMENT_MOCK_MODE === 'true'

    // iyzico sends token in form data
    const formData = await request.formData()
    const token = formData.get('token') as string
    // Never allow client-side mockMode parameter — only use server-side flag
    const mockMode = isDevelopmentMode

    if (!token) {
      return NextResponse.redirect(new URL('/odeme?error=invalid_token', siteUrl), 303)
    }

    const supabase = await createClient()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const hasServiceRole = Boolean(supabaseUrl && serviceRoleKey)
    let db: any = supabase

    if (hasServiceRole) {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js')
      db = createAdminClient(supabaseUrl!, serviceRoleKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    }
    let basketId: string | undefined
    let paymentId = 'mock_payment_' + Date.now()
    let cardBrand: string | undefined
    let cardLastFour: string | undefined
    let cardAssociation: string | undefined
    let installmentCount = 1
    let mdStatus: number | undefined
    let paymentPrice: number | undefined
    // itemId (productId) → iyzico paymentTransactionId — needed for marketplace approval API
    let itemTransactionMap: Record<string, string> = {}

    // Development/Mock mode
    if (isDevelopmentMode || mockMode) {
      // Extract basketId from mock token
      basketId = token.replace('mock_token_', '')
      cardBrand = 'Mock Card'
      cardLastFour = '4444'
      console.log('Mock payment callback:', { token, basketId, mockMode })
    } else {
      // Production mode: verify with real iyzico (3DS + Checkout Form)
      const IyzipayModule: any = await import(/* webpackIgnore: true */ 'iyzipay')
      const Iyzipay = IyzipayModule?.default || IyzipayModule
      const iyzipay = new Iyzipay({
        apiKey,
        secretKey,
        uri: baseUrl
      })

      // Verify payment with iyzico - Checkout Form retrieve (handles 3DS automatically)
      const result = await new Promise<any>((resolve, reject) => {
        iyzipay.checkoutForm.retrieve({
          locale: 'tr',
          conversationId: `retrieve_${Date.now()}`,
          token
        }, (err: any, result: any) => {
          if (err) reject(err)
          else resolve(result)
        })
      })

      // Log only safe fields — never log full iyzico response (contains sensitive data)
      console.log('[iyzico Callback] Result status:', {
        status: result.status,
        paymentStatus: result.paymentStatus,
        basketId: result.basketId,
        paidPrice: result.paidPrice,
        mdStatus: result.mdStatus,
      })

      if (result.status !== 'success' || result.paymentStatus !== 'SUCCESS') {
        const errorMessage = result.errorMessage || 'Ödeme başarısız'
        console.error('[iyzico Callback] Payment failed:', {
          status: result.status,
          paymentStatus: result.paymentStatus,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          mdStatus: result.mdStatus,
        })
        return NextResponse.redirect(
          new URL(`/odeme?error=${encodeURIComponent(errorMessage)}`, siteUrl), 303
        )
      }

      // Extract payment details from iyzico response
      basketId = result.basketId as string | undefined
      paymentId = result.paymentId
      cardBrand = result.cardType || undefined
      cardAssociation = result.cardAssociation || undefined
      cardLastFour = result.lastFourDigits || result.binNumber?.slice(-4) || undefined
      installmentCount = result.installment || 1
      mdStatus = result.mdStatus
      paymentPrice = result.paidPrice

      // Store itemId → paymentTransactionId mapping (for marketplace approval API)
      if (Array.isArray(result.itemTransactions)) {
        for (const txn of result.itemTransactions) {
          if (txn.itemId && txn.paymentTransactionId) {
            itemTransactionMap[String(txn.itemId)] = String(txn.paymentTransactionId)
          }
        }
      }

      console.log('[iyzico Callback] Payment verified:', {
        paymentId,
        basketId,
        cardType: cardBrand,
        cardAssociation,
        lastFour: cardLastFour,
        installment: installmentCount,
        mdStatus,
        paidPrice: paymentPrice,
        fraudStatus: result.fraudStatus,
      })
    }

    // Payment successful - update existing order/payment
    if (!basketId) {
      return NextResponse.redirect(new URL('/odeme?error=missing_basket_id', siteUrl), 303)
    }

    const { data: orderData, error: orderFetchError } = await db
      .from('orders')
      .select('id, order_number, user_id, email, notes, payment_status, total')
      .eq('order_number', basketId)
      .single()

    if (orderFetchError || !orderData) {
      console.error('Order fetch error:', orderFetchError)
      return NextResponse.redirect(new URL(`/odeme?error=order_not_found`, siteUrl), 303)
    }

    // IDEMPOTENCY CHECK: If already paid, redirect to success without reprocessing
    if ((orderData as any).payment_status === 'paid') {
      console.log('[iyzico Callback] Order already paid, skipping reprocessing:', basketId)
      return NextResponse.redirect(
        new URL(`/siparis-basarili?order_id=${orderData.id}&order_number=${orderData.order_number}`, siteUrl), 303
      )
    }

    // AMOUNT VERIFICATION: Compare iyzico paid amount with order total
    if (paymentPrice !== undefined && paymentPrice !== null) {
      const orderTotal = Number((orderData as any).total)
      if (Math.abs(Number(paymentPrice) - orderTotal) > 0.01) {
        console.error('[iyzico Callback] AMOUNT MISMATCH!', {
          paidPrice: paymentPrice,
          orderTotal: orderTotal,
          basketId,
        })
        // Flag the order as suspicious instead of marking paid
        await db
          .from('orders')
          .update({
            payment_status: 'disputed',
            notes: `AMOUNT MISMATCH: paid=${paymentPrice}, expected=${orderTotal}`,
          } as any)
          .eq('id', orderData.id)
        return NextResponse.redirect(new URL('/odeme?error=amount_mismatch', siteUrl), 303)
      }
    }

    const orderId = orderData.id

    // Preserve coupon code from notes if present
    const existingNotes = (orderData as any).notes || ''
    const couponMatch = existingNotes.match(/coupon:(\S+)/)
    const couponCode = couponMatch ? couponMatch[1] : null
    const updatedNotes = couponCode
      ? `coupon:${couponCode} | iyzico Payment ID: ${paymentId}`
      : `iyzico Payment ID: ${paymentId}`

    // SECURITY: Atomic claim — concurrent callback race koruması.
    // Aynı order için 2 paralel callback çağrılırsa, sadece biri claim eder;
    // diğeri false döner ve early-exit yapar (komisyon/email 2 kere işlenmez).
    const { data: claimResult, error: claimError } = await (db as any).rpc(
      'claim_order_for_payment',
      {
        p_order_id: orderId,
        p_payment_id: paymentId,
        p_notes: updatedNotes,
      }
    )

    if (claimError) {
      console.error('claim_order_for_payment error:', claimError)
      // Fallback: legacy direct update (idempotency check üstte zaten var)
      const { error: orderUpdateError } = await db
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'pending',
          notes: updatedNotes,
        } as any)
        .eq('id', orderId)
      if (orderUpdateError) {
        console.error('Order update error:', orderUpdateError)
        return NextResponse.redirect(new URL('/odeme?error=order_update_failed', siteUrl), 303)
      }
    } else if (claimResult === false) {
      // Başka callback önce yakaladı — bu callback işlem yapmasın ama success sayfasına yönlendir
      console.log('[iyzico Callback] Order already claimed by concurrent callback, redirect:', basketId)
      return NextResponse.redirect(
        new URL(`/siparis-basarili?order_id=${orderId}&order_number=${orderData.order_number}`, siteUrl),
        303
      )
    }

    // Increment coupon used_count if coupon was applied
    if (couponCode) {
      try {
        await db.rpc('increment_coupon_usage', { coupon_code: couponCode })
      } catch (e) {
        // Fallback: direct update
        try {
          const { data: coupon } = await db
            .from('coupons')
            .select('id, used_count')
            .eq('code', couponCode)
            .single()
          if (coupon) {
            await db
              .from('coupons')
              .update({ used_count: (coupon.used_count || 0) + 1 })
              .eq('id', coupon.id)
          }
        } catch (err) {
          console.error('Coupon usage update error:', err)
        }
      }
    }

    // Affiliate: cookie'de ref varsa ve geçerli bir influencer ise affiliate_sales kaydı ekle
    try {
      const refCode = request.cookies.get('aff_ref')?.value
      if (refCode) {
        const { data: inf } = await (db as any)
          .from('influencers')
          .select('id, commission_percent')
          .eq('ref_code', refCode)
          .eq('status', 'approved')
          .maybeSingle()
        if (inf) {
          const orderTotal = Number((orderData as any).total)
          const commissionAmount = (orderTotal * Number(inf.commission_percent)) / 100
          await (db as any).from('affiliate_sales').insert({
            influencer_id: inf.id,
            order_id: orderId,
            order_total: orderTotal,
            commission_percent: inf.commission_percent,
            commission_amount: commissionAmount,
            status: 'pending',
          })
        }
      }
    } catch (e) {
      console.error('Affiliate sale insert error:', e)
    }

    const { error: paymentUpdateError } = await db
      .from('payments')
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
        provider_payment_id: paymentId,
        card_brand: cardBrand || undefined,
        card_last_four: cardLastFour || undefined,
        installment: installmentCount,
        metadata: {
          ...(isDevelopmentMode || mockMode ? { mockMode: true } : {}),
          token,
          cardAssociation: cardAssociation || undefined,
          mdStatus: mdStatus ?? undefined,
          paidPrice: paymentPrice ?? undefined,
        } as any,
      } as any)
      .eq('order_id', orderId)
      .eq('provider', 'iyzico')

    if (paymentUpdateError) {
      console.error('Payment update error:', paymentUpdateError)
      return NextResponse.redirect(new URL('/odeme?error=payment_update_failed', siteUrl), 303)
    }

    // Save iyzico paymentTransactionId to each order_item (needed for marketplace approval API)
    // itemTransactionMap: productId → paymentTransactionId
    if (Object.keys(itemTransactionMap).length > 0) {
      const productIds = Object.keys(itemTransactionMap)
      const { data: orderItemRows } = await db
        .from('order_items')
        .select('id, product_id')
        .eq('order_id', orderId)
        .in('product_id', productIds)

      if (orderItemRows && orderItemRows.length > 0) {
        for (const row of orderItemRows as any[]) {
          const txId = itemTransactionMap[row.product_id]
          if (txId) {
            await db
              .from('order_items')
              .update({
                iyzico_payment_transaction_id: txId,
                iyzico_approval_status: 'pending',
              } as any)
              .eq('id', row.id)
          }
        }
        console.log('[iyzico Callback] Saved paymentTransactionIds to order_items:', orderItemRows.length)
      }
    }

    // Try to clear cart (best-effort; may fail if callback has no session)
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user

    if (user) {
      const { data: cart } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cart?.id) {
        const { error: cartError } = await supabase
          .from('cart_items')
          .delete()
          .eq('cart_id', cart.id)

        if (cartError) console.error('Cart clear error:', cartError)
      }

    }

    // Queue order emails regardless of session (iyzico callbacks often have no cookies)
    const buyerEmail = (orderData as any)?.email || user?.email
    console.log('[Payment Callback] Email flow starting:', {
      buyerEmail,
      orderId,
      orderNumber: orderData.order_number,
      hasServiceRole,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasResendFrom: !!process.env.RESEND_FROM_EMAIL,
    })

    if (buyerEmail) {
      if (hasServiceRole) {
        console.log('[Payment Callback] Queuing emails via service role...')
        await queueOrderEmails(orderId, buyerEmail, orderData.order_number).catch((err) =>
          console.error('[Payment Callback] Email queue error:', err)
        )

        // Best-effort: process a small batch immediately so the buyer email goes out fast.
        // The queue processor itself throttles outbound requests to avoid Resend 429 rate limits.
        try {
          const url = new URL(request.url)
          const base = `${url.protocol}//${url.host}`
          const queueResp = await fetch(`${base}/api/email/process-queue?limit=3`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              ...(process.env.EMAIL_QUEUE_PROCESSOR_SECRET
                ? { authorization: `Bearer ${process.env.EMAIL_QUEUE_PROCESSOR_SECRET}` }
                : {}),
            },
          })
          const queueResult = await queueResp.json().catch(() => ({}))
          console.log('[Payment Callback] Queue processor response:', queueResult)
        } catch (err) {
          console.error('[Payment Callback] Email queue process trigger failed:', err)
        }
      } else {
        console.warn('Email queue skipped: SUPABASE_SERVICE_ROLE_KEY not configured in this environment')
        await sendBuyerEmailDirect({
          db,
          orderId,
          orderNumber: orderData.order_number,
          buyerEmail,
          requestUrl: request.url,
        }).catch((err) => console.error('Direct buyer email send failed:', err))
      }
    } else {
      console.warn('Order email skipped: missing buyer email')
    }

    return NextResponse.redirect(
      new URL(`/siparis-basarili?order_id=${orderId}&order_number=${orderData.order_number}`, siteUrl), 303
    )

  } catch (error) {
    console.error('Payment callback error:', error)
    return NextResponse.redirect(
      new URL(
        '/odeme?error=callback_error',
        process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      ), 303
    )
  }
}

async function sendBuyerEmailDirect(args: {
  db: any
  orderId: string
  orderNumber: string
  buyerEmail: string
  requestUrl: string
}): Promise<void> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.warn('Direct email skipped: RESEND_API_KEY or RESEND_FROM_EMAIL missing')
    return
  }

  const from = `${process.env.RESEND_FROM_NAME || 'Novagross'} <${process.env.RESEND_FROM_EMAIL}>`
  const resend = new Resend(process.env.RESEND_API_KEY)

  const url = new URL(args.requestUrl)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${url.protocol}//${url.host}`

  const { data: order } = await args.db
    .from('orders')
    .select('id, total, shipping_address, created_at')
    .eq('id', args.orderId)
    .maybeSingle()

  const { data: items } = await args.db
    .from('order_items')
    .select('name, quantity, total')
    .eq('order_id', args.orderId)

  const shippingAddr = (order as any)?.shipping_address
  const shippingText = shippingAddr
    ? `${shippingAddr.address_line1}, ${shippingAddr.district}, ${shippingAddr.city}`
    : undefined

  const orderDate = (order as any)?.created_at
    ? new Date((order as any).created_at).toLocaleString('tr-TR')
    : new Date().toLocaleString('tr-TR')

  const rendered = renderEmailTemplate('orders/order-confirmation', {
    orderNumber: args.orderNumber,
    orderDate,
    items: (items || []).map((i: any) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.total,
    })),
    totalAmount: (order as any)?.total,
    shippingAddress: shippingText,
    orderUrl: `${siteUrl}/hesabim/siparislerim/${args.orderId}`,
  })

  const result = await resend.emails.send({
    from,
    to: args.buyerEmail,
    subject: `Siparişiniz Alındı - #${args.orderNumber}`,
    html: rendered.html,
  })

  const resendError = (result as any)?.error
  if (resendError) {
    throw new Error(resendError.message || 'Resend send failed')
  }
}

// GET handler removed for security — iyzico uses POST callbacks only.
// A GET handler allows CSRF attacks via crafted URLs.
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Payment callbacks must use POST.' },
    { status: 405 }
  )
}

// Helper: Queue order confirmation emails for buyer and sellers
async function queueOrderEmails(
  orderId: string,
  buyerEmail: string,
  orderNumber: string
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Email queue skipped: missing Supabase service role env')
    return
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Fetch order with items
  const { data: orderData } = await supabase
    .from('orders')
    .select(
      `
      id,
      order_number,
      total,
      shipping_address,
      created_at,
      user_id
    `
    )
    .eq('id', orderId)
    .single();

  if (!orderData) return;

  const { data: items } = await supabase
    .from('order_items')
    .select(
      `
      id,
      name,
      quantity,
      price,
      total,
      store_id
    `
    )
    .eq('order_id', orderId);

  if (!items || items.length === 0) return;

  // Resolve store + owner emails explicitly.
  // NOTE: `order_items.store_id` does NOT have an FK in the schema, so PostgREST embed joins may fail.
  const storeIds = Array.from(
    new Set((items || []).map((i: any) => i.store_id).filter(Boolean))
  ) as string[]

  const storeById = new Map<string, { id: string; store_name?: string; owner_id?: string; email?: string }>()
  const ownerIds: string[] = []

  if (storeIds.length > 0) {
    const { data: stores } = await supabase
      .from('stores')
      .select('id, store_name, owner_id, email')
      .in('id', storeIds)

    for (const s of stores || []) {
      storeById.set((s as any).id, s as any)
      if ((s as any).owner_id) ownerIds.push((s as any).owner_id)
    }
  }

  const ownerEmailById = new Map<string, string>()
  if (ownerIds.length > 0) {
    const uniqueOwnerIds = Array.from(new Set(ownerIds))
    const { data: owners } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', uniqueOwnerIds)

    for (const o of owners || []) {
      if ((o as any).id && (o as any).email) ownerEmailById.set((o as any).id, (o as any).email)
    }
  }

  const orderDate = new Date(orderData.created_at).toLocaleString('tr-TR');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://novagross.com'
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.novagross.com';

  // 1. Buyer confirmation email
  const buyerItems = items.map((item: any) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.total,
  }));

  const shippingAddr = orderData.shipping_address as any;
  const shippingText = shippingAddr
    ? `${shippingAddr.address_line1}, ${shippingAddr.district}, ${shippingAddr.city}`
    : undefined;

  const emails: any[] = [
    {
      to: buyerEmail,
      subject: `Siparişiniz Alındı - #${orderNumber}`,
      template: 'orders/order-confirmation',
      priority: 'critical',
      data: {
        orderNumber,
        orderDate,
        items: buyerItems,
        totalAmount: orderData.total,
        shippingAddress: shippingText,
        orderUrl: `${siteUrl}/hesabim/siparislerim/${orderId}`,
      },
    },
  ];

  // 2. Seller notification emails (group by store)
  const storeMap = new Map<string, any>();

  for (const item of items) {
    const storeId = (item as any).store_id as string | null
    if (!storeId) continue

    const store = storeById.get(storeId)
    if (!store) continue

    const sellerEmail =
      (store as any).email || ((store as any).owner_id ? ownerEmailById.get((store as any).owner_id) : undefined)

    if (!storeMap.has(storeId)) {
      storeMap.set(storeId, {
        storeId,
        storeName: (store as any).store_name || 'Mağaza',
        sellerEmail,
        items: [],
      });
    }

    storeMap.get(store.id)!.items.push({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    });
  }

  // 2b. Platform/admin products (store_id is null)
  const adminItems = (items || []).filter((i: any) => !i.store_id)
  if (adminItems.length > 0) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@novagross.com'
    const subtotal = adminItems.reduce(
      (sum: number, i: any) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
      0
    )

    emails.push({
      to: adminEmail,
      subject: `Yeni Sipariş (Admin Ürünleri) - #${orderNumber}`,
      template: 'orders/new-order-seller',
      priority: 'high',
      data: {
        storeName: 'Novagross',
        orderNumber,
        orderDate,
        items: adminItems.map((i: any) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        subtotalAmount: subtotal,
        adminOrderUrl: `${adminUrl}/siparisler/${orderId}`,
      },
    })
  }

  for (const [storeId, storeData] of storeMap.entries()) {
    if (!storeData.sellerEmail) {
      console.warn('[queueOrderEmails] Skipping store without seller email:', { storeId, storeName: storeData.storeName });
      continue;
    }

    const subtotal = storeData.items.reduce(
      (sum: number, i: any) => sum + i.price * i.quantity,
      0
    );

    emails.push({
      to: storeData.sellerEmail,
      subject: `Yeni Sipariş - #${orderNumber}`,
      template: 'orders/new-order-seller',
      priority: 'high',
      data: {
        storeName: storeData.storeName,
        orderNumber,
        orderDate,
        items: storeData.items,
        subtotalAmount: subtotal,
        adminOrderUrl: `${adminUrl}/siparisler/${orderId}`,
      },
    });
  }

  console.log('[queueOrderEmails] Queuing emails:', {
    orderNumber,
    totalEmails: emails.length,
    emailSummary: emails.map(e => ({ to: e.to, subject: e.subject, template: e.template }))
  });

  // Queue all emails
  await queueBulkEmails(emails);
}
