import { NextRequest, NextResponse } from 'next/server'
import { generateOrderNumber } from '@novagross/utils'
import { createClient } from '@/lib/supabase/server'
import { csrfProtection } from '@/lib/csrf'
import { getSiteUrl } from '@/lib/site-url'

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
    // This is usually correct in production and during local `next start`.
    return request.nextUrl.origin
  } catch {
    // Fall back to Host header if available.
    if (host) return `https://${host}`
    return null
  }
}

export async function POST(request: NextRequest) {
  // CSRF Protection
  const csrfError = csrfProtection(request)
  if (csrfError) return csrfError
  
  try {
    const apiKey = process.env.IYZICO_API_KEY
    const secretKey = process.env.IYZICO_SECRET_KEY
    const baseUrl = process.env.IYZICO_BASE_URL
    // Prefer request-derived origin (prevents wrong callback domain in Netlify/custom-domain setups).
    const requestOrigin = getRequestOrigin(request)
    const siteUrl = requestOrigin || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || getSiteUrl()
    // Mock mode only allowed via explicit env flag — never infer from missing keys
    const isDevelopmentMode = process.env.PAYMENT_MOCK_MODE === 'true'

    if (!isDevelopmentMode && (!apiKey || !secretKey || !baseUrl)) {
      console.error('iyzico credentials missing and PAYMENT_MOCK_MODE is not enabled')
      return NextResponse.json(
        { error: 'Ödeme sistemi yapılandırılmamış. Lütfen site yöneticisiyle iletişime geçin.' },
        { status: 500 }
      )
    }

    if (!siteUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SITE_URL eksik (callback URL için gerekli)' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { 
      items, 
      customer, 
      shippingAddress, 
      totalPrice,
      shippingCost = 0,
      discountAmount = 0,
      couponCode = null,
      basketId: existingBasketId
    } = body

    // Validate required fields
    if (!items || !customer || !shippingAddress || !totalPrice) {
      return NextResponse.json(
        { error: 'Eksik bilgi' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user

    if (!user) {
      return NextResponse.json(
        { error: 'Oturum bulunamadı. Lütfen giriş yapın.' },
        { status: 401 }
      )
    }

    // Use service-role client for DB writes when available.
    // This prevents RLS issues during callbacks and also allows creating missing profile rows.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let db: any = supabase

    if (supabaseUrl && serviceRoleKey) {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js')
      db = createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      // Ensure profile exists (orders.user_id FK references profiles.id)
      await db
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email || customer.email,
            first_name: customer.firstName,
            last_name: customer.lastName,
            phone: customer.phone,
          },
          { onConflict: 'id' }
        )
    }

    const basketId = generateOrderNumber()
    const conversationId = `conv_${Date.now()}`

    // Fetch products to enrich order items with store_id (marketplace), validate existence, and verify prices server-side
    const productIds = Array.from(
      new Set(
        (items as any[])
          .map((item) => item?.productId)
          .filter((id) => typeof id === 'string' && id.length > 0)
      )
    )

    const { data: productsForItems, error: productsForItemsError } = await db
      .from('products')
      .select('id, name, price, compare_at_price, store_id, sku, stores(iyzico_sub_merchant_key, commission_rate)')
      .in('id', productIds)

    if (productsForItemsError) {
      console.error('Products fetch error (initialize payment):', productsForItemsError)
      return NextResponse.json(
        {
          error: productsForItemsError.message
            ? `Ürün bilgileri alınamadı: ${productsForItemsError.message}`
            : 'Ürün bilgileri alınamadı',
        },
        { status: 500 }
      )
    }

    const productMap = new Map<string, { store_id: string | null; sku: string | null; subMerchantKey: string | null; commissionRate: number; price: number; name: string }>()
    for (const product of productsForItems || []) {
      const store = (product as any).stores
      productMap.set(product.id, {
        store_id: (product as any).store_id ?? null,
        sku: (product as any).sku ?? null,
        subMerchantKey: store?.iyzico_sub_merchant_key ?? null,
        commissionRate: Number(store?.commission_rate ?? 0),
        price: Number((product as any).price),
        name: (product as any).name || '',
      })
    }

    const missingProductIds = productIds.filter((id) => !productMap.has(id))
    if (missingProductIds.length > 0) {
      return NextResponse.json(
        { error: 'Sepette bulunamayan ürün(ler) var. Lütfen sepeti yenileyin.' },
        { status: 400 }
      )
    }

    // ===== SERVER-SIDE PRICE VERIFICATION =====
    // Never trust client-supplied prices. Re-calculate from DB prices.
    let serverSubtotal = 0
    for (const item of items as any[]) {
      const dbProduct = productMap.get(item.productId)
      if (!dbProduct) continue
      // SECURITY: quantity pozitif tamsayı olmalı (negatif quantity ile
      // subtotal'ı düşürüp ucuz/bedava sipariş saldırısı engellendi)
      const qty = Math.floor(Number(item.quantity))
      if (!Number.isFinite(qty) || qty <= 0 || qty > 1000) {
        return NextResponse.json(
          { error: 'Geçersiz quantity. Pozitif tamsayı olmalı (1-1000).' },
          { status: 400 }
        )
      }
      item.quantity = qty

      const dbPrice = dbProduct.price
      const clientPrice = Number(item.price)
      // Allow a small tolerance for rounding (0.01 TL)
      if (Math.abs(dbPrice - clientPrice) > 0.01) {
        console.warn(`Price mismatch for product ${item.productId}: client=${clientPrice}, db=${dbPrice}`)
      }
      // Always use DB price — override client
      item.price = dbPrice
      serverSubtotal += dbPrice * qty
    }

    // SECURITY: serverSubtotal pozitif olmalı (extra guard)
    if (!Number.isFinite(serverSubtotal) || serverSubtotal <= 0) {
      return NextResponse.json(
        { error: 'Geçersiz sipariş toplamı' },
        { status: 400 }
      )
    }

    // SECURITY: Atomic stock reservation (oversell race koruması)
    // Eski yerine UPDATE WHERE stock>=qty pattern kullanır; yetersiz stokta hata.
    // Ödeme başarısız olursa release_stock_atomic ile geri al (callback / timeout flow).
    const stockPayload = (items as any[])
      .filter((it) => typeof it.productId === 'string' && Number(it.quantity) > 0)
      .map((it) => ({ product_id: it.productId, quantity: Number(it.quantity) }))

    if (stockPayload.length > 0) {
      const { error: stockError } = await (db as any).rpc('reserve_stock_atomic', {
        p_items: stockPayload,
      })
      if (stockError) {
        return NextResponse.json(
          { error: stockError.message || 'Yetersiz stok' },
          { status: 409 }
        )
      }
    }

    // Server-side coupon validation
    let serverDiscountAmount = 0
    if (couponCode) {
      const { data: couponData } = await db
        .from('coupons')
        .select('id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, is_active, expires_at')
        .eq('code', couponCode)
        .eq('is_active', true)
        .single()

      if (couponData) {
        const now = new Date()
        const isExpired = couponData.expires_at && new Date(couponData.expires_at) < now
        const isOverLimit = couponData.max_uses && couponData.used_count >= couponData.max_uses
        const isBelowMin = couponData.min_order_amount && serverSubtotal < Number(couponData.min_order_amount)

        if (!isExpired && !isOverLimit && !isBelowMin) {
          if (couponData.discount_type === 'percentage') {
            serverDiscountAmount = Number((serverSubtotal * Number(couponData.discount_value) / 100).toFixed(2))
          } else {
            serverDiscountAmount = Number(Number(couponData.discount_value).toFixed(2))
          }
          // Cap discount at subtotal
          serverDiscountAmount = Math.min(serverDiscountAmount, serverSubtotal)
        } else {
          console.warn(`Coupon ${couponCode} is invalid: expired=${isExpired}, overLimit=${isOverLimit}, belowMin=${isBelowMin}`)
        }
      } else {
        console.warn(`Coupon ${couponCode} not found or not active`)
      }
    }

    // Recalculate total server-side
    const serverTotalPrice = Number((serverSubtotal - serverDiscountAmount).toFixed(2))

    const paidPrice = (serverTotalPrice + shippingCost).toFixed(2)
    // iyzico requires: price = sum of all basketItems prices
    // Since shipping is added as a basket item, price must include it
    const price = paidPrice

    // Get client IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1'

    // Prepare basket items for iyzico (marketplace: subMerchantKey + subMerchantPrice required)
    let firstSubMerchantKey: string | null = null
    const basketItems = items.map((item: any) => {
      const productInfo = productMap.get(item.productId)
      const subMerchantKey = productInfo?.subMerchantKey ?? null
      if (subMerchantKey && !firstSubMerchantKey) firstSubMerchantKey = subMerchantKey
      const itemTotal = Number((item.price * item.quantity).toFixed(2))
      const commissionRate = productInfo?.commissionRate ?? 0
      // subMerchantPrice = amount transferred to sub-merchant (after commission)
      const subMerchantPrice = Number((itemTotal * (1 - commissionRate / 100)).toFixed(2))
      return {
        id: item.productId,
        name: item.name.substring(0, 50), // iyzico max 50 char
        category1: 'Ürün',
        itemType: 'PHYSICAL' as const,
        price: itemTotal.toFixed(2),
        subMerchantKey: subMerchantKey || undefined,
        subMerchantPrice: subMerchantKey ? subMerchantPrice.toFixed(2) : undefined,
      }
    })

    // Marketplace: subMerchantKey varsa kullan, hiç yoksa basit ödeme (ana hesap)
    // Sub-merchant kaydı yapılmadan da ödeme akışı çalışır (admin sonradan
    // register-sub-merchants.js ile satıcıları register edip key'leri doldurur).
    const missingSubMerchantItems = basketItems.filter((bi: any) => !bi.subMerchantKey)
    const hasAnySubMerchant = firstSubMerchantKey !== null
    if (missingSubMerchantItems.length > 0 && hasAnySubMerchant) {
      // Karışık durum: bazı satıcılar register edilmiş bazıları değil
      // → kayıtsız itemleri ilk register'lı sub-merchant'a yönlendir
      for (const bi of basketItems) {
        if (!(bi as any).subMerchantKey) {
          ;(bi as any).subMerchantKey = firstSubMerchantKey
          ;(bi as any).subMerchantPrice = (bi as any).price
        }
      }
    } else if (!hasAnySubMerchant) {
      // Hiç sub-merchant yok → basit (non-marketplace) ödeme akışı
      // basketItems'tan subMerchantKey/subMerchantPrice alanlarını temizle
      for (const bi of basketItems) {
        delete (bi as any).subMerchantKey
        delete (bi as any).subMerchantPrice
      }
      console.warn('[payment] No sub-merchant keys; falling back to non-marketplace flow')
    }

    // Add shipping as basket item if exists
    if (shippingCost > 0) {
      const shippingItem: any = {
        id: 'SHIPPING',
        name: 'Kargo Ücreti',
        category1: 'Kargo',
        itemType: 'VIRTUAL' as const,
        price: shippingCost.toFixed(2),
      }
      if (firstSubMerchantKey) {
        shippingItem.subMerchantKey = firstSubMerchantKey
        shippingItem.subMerchantPrice = shippingCost.toFixed(2)
      }
      basketItems.push(shippingItem)
    }

    // SECURITY: Email spoofing engelleme — auth user'ın email'i kullanılır,
    // checkout formundan gelen email order confirmation için kabul edilmez.
    // (Saldırgan victim@example.com koyup victim'e spam yollayabilirdi)
    const trustedEmail = user.email || customer.email

    // Create or update order BEFORE initializing payment, so callback can update it.
    const orderPayload = {
      user_id: user.id,
      order_number: basketId,
      email: trustedEmail,
      phone: customer.phone,
      currency: 'TRY',
      status: 'pending',
      payment_status: 'pending',
      subtotal: Number(serverSubtotal),
      shipping_cost: Number(shippingCost),
      tax_amount: 0,
      discount_amount: Number(serverDiscountAmount),
      total: Number(paidPrice),
      notes: couponCode ? `coupon:${couponCode}` : null,
      shipping_method: body.shippingMethod || 'standard',
      shipping_address: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        phone: customer.phone,
        email: customer.email,
        address_line1: shippingAddress.address,
        district: shippingAddress.district,
        city: shippingAddress.city,
        postal_code: shippingAddress.postalCode,
        country: 'Turkey',
      },
      billing_address: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        phone: customer.phone,
        email: customer.email,
        address_line1: shippingAddress.address,
        district: shippingAddress.district,
        city: shippingAddress.city,
        postal_code: shippingAddress.postalCode,
        country: 'Turkey',
      },
    }

    const { data: existingOrder } = await db
      .from('orders')
      .select('id, order_number, payment_status')
      .eq('order_number', basketId)
      .eq('user_id', user.id)
      .maybeSingle()

    let orderId: string
    if (existingOrder?.id && existingOrder.payment_status !== 'paid') {
      const { error: updateError } = await db
        .from('orders')
        .update(orderPayload as any)
        .eq('id', existingOrder.id)

      if (updateError) {
        console.error('Order update error:', updateError)
        return NextResponse.json(
          { error: 'Sipariş güncellenemedi' },
          { status: 500 }
        )
      }
      orderId = existingOrder.id
    } else {
      const { data: insertedOrder, error: insertError } = await db
        .from('orders')
        .insert(orderPayload as any)
        .select('id')
        .single()

      if (insertError || !insertedOrder) {
        console.error('Order insert error:', insertError)
        return NextResponse.json(
          { error: insertError?.message ? `Sipariş oluşturulamadı: ${insertError.message}` : 'Sipariş oluşturulamadı' },
          { status: 500 }
        )
      }
      orderId = insertedOrder.id
    }

    // Replace order items
    await db.from('order_items').delete().eq('order_id', orderId)

    const orderItems = items.map((item: any) => ({
      order_id: orderId,
      product_id: item.productId,
      name: productMap.get(item.productId)?.name || item.name,
      sku: productMap.get(item.productId)?.sku ?? undefined,
      quantity: item.quantity,
      price: Number(productMap.get(item.productId)?.price ?? item.price),
      total: Number(productMap.get(item.productId)?.price ?? item.price) * Number(item.quantity),
      store_id: productMap.get(item.productId)?.store_id ?? null,
    }))

    const { error: itemsInsertError } = await db
      .from('order_items')
      .insert(orderItems as any)

    if (itemsInsertError) {
      console.error('Order items insert error:', itemsInsertError)
      return NextResponse.json(
        {
          error: itemsInsertError.message
            ? `Sipariş kalemleri oluşturulamadı: ${itemsInsertError.message}`
            : 'Sipariş kalemleri oluşturulamadı',
        },
        { status: 500 }
      )
    }

    // Ensure payments row exists
    const { data: existingPayment } = await db
      .from('payments')
      .select('id')
      .eq('order_id', orderId)
      .eq('provider', 'iyzico')
      .maybeSingle()

    if (existingPayment?.id) {
      await db
        .from('payments')
        .update({
          amount: Number(paidPrice),
          currency: 'TRY',
          status: 'pending',
          payment_method: 'credit_card',
          metadata: { basketId },
        } as any)
        .eq('id', existingPayment.id)
    } else {
      await db
        .from('payments')
        .insert({
          order_id: orderId,
          provider: 'iyzico',
          amount: Number(paidPrice),
          currency: 'TRY',
          status: 'pending',
          payment_method: 'credit_card',
          metadata: { basketId },
        } as any)
    }

    const checkoutFormRequest = {
      locale: 'tr',
      conversationId,
      price,
      paidPrice,
      currency: 'TRY',
      basketId,
      paymentGroup: 'PRODUCT',
      buyer: {
        id: customer.id || `buyer_${Date.now()}`,
        name: customer.firstName,
        surname: customer.lastName,
        gsmNumber: customer.phone.replace(/\s/g, ''),
        email: customer.email,
        identityNumber: customer.identityNumber || '11111111111', // TC Kimlik
        registrationAddress: shippingAddress.address,
        ip,
        city: shippingAddress.city,
        country: 'Turkey',
        zipCode: shippingAddress.postalCode || '34000'
      },
      shippingAddress: {
        contactName: `${customer.firstName} ${customer.lastName}`,
        city: shippingAddress.city,
        country: 'Turkey',
        address: shippingAddress.address,
        zipCode: shippingAddress.postalCode || '34000'
      },
      billingAddress: {
        contactName: `${customer.firstName} ${customer.lastName}`,
        city: shippingAddress.city,
        country: 'Turkey',
        address: shippingAddress.address,
        zipCode: shippingAddress.postalCode || '34000'
      },
      basketItems,
      callbackUrl: `${siteUrl}/api/payment/callback`,
      enabledInstallments: [1, 2, 3, 6, 9, 12]
    }

    // Development mode: return mock checkout form
    if (isDevelopmentMode) {
      const mockCheckoutFormContent = `
        <div style="padding: 2rem; background: #f8f9fa; border-radius: 8px; text-align: center;">
          <h3 style="color: #dc3545; margin-bottom: 1rem;">🧪 Development Mode - Mock Payment</h3>
          <p style="color: #6c757d; margin-bottom: 1.5rem;">iyzico credentials are not configured. This is a test payment form.</p>
          <div style="max-width: 400px; margin: 0 auto;">
            <div style="margin-bottom: 1rem; text-align: left;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Kart Numarası</label>
              <input type="text" value="4444 4444 4444 4444" disabled style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" />
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <div style="text-align: left;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">SKT</label>
                <input type="text" value="12/26" disabled style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" />
              </div>
              <div style="text-align: left;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">CVV</label>
                <input type="text" value="123" disabled style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" />
              </div>
            </div>
            <button id="mock-pay-submit" type="button" style="width: 100%; padding: 0.75rem; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 1rem; font-weight: 600; cursor: pointer;">
              ✓ Test Ödemeyi Tamamla
            </button>
          </div>
          <script>
            (function () {
              var btn = document.getElementById('mock-pay-submit');
              if (!btn) return;

              btn.addEventListener('click', async function () {
                try {
                  btn.disabled = true;
                  btn.textContent = 'İşleniyor...';

                  var fd = new FormData();
                  fd.append('token', 'mock_token_${basketId}');
                  fd.append('mockMode', 'true');

                  var resp = await fetch('/api/payment/callback', {
                    method: 'POST',
                    body: fd,
                    redirect: 'follow'
                  });

                  if (resp.redirected && resp.url) {
                    window.location.href = resp.url;
                    return;
                  }

                  // Fallback: if redirect couldn't be followed for any reason
                  window.location.href = '/odeme?error=callback_error';
                } catch (e) {
                  console.error('Mock payment submit error:', e);
                  btn.disabled = false;
                  btn.textContent = '✓ Test Ödemeyi Tamamla';
                  alert('Test ödeme tamamlanamadı. Lütfen tekrar deneyin.');
                }
              });
            })();
          </script>
          <p style="color: #6c757d; font-size: 0.875rem; margin-top: 1.5rem;">Sipariş No: ${basketId}</p>
        </div>
      `
      return NextResponse.json({
        success: true,
        token: `mock_token_${basketId}`,
        checkoutFormContent: mockCheckoutFormContent,
        paymentPageUrl: '#',
        basketId,
        orderId,
        mockMode: true
      })
    }

    // Production mode: use real iyzico
    const IyzipayModule: any = await import(/* webpackIgnore: true */ 'iyzipay')
    const Iyzipay = IyzipayModule?.default || IyzipayModule
    const iyzipay = new Iyzipay({
      apiKey,
      secretKey,
      uri: baseUrl
    })

    // Create checkout form
    const result = await new Promise<any>((resolve, reject) => {
      iyzipay.checkoutFormInitialize.create(checkoutFormRequest, (err: any, result: any) => {
        if (err) reject(err)
        else resolve(result)
      })
    })

    if (result.status !== 'success') {
      console.error('iyzico error:', result)
      // SECURITY: initialize başarısız → rezerve edilen stoğu HEMEN geri ver.
      // SIRALAMA: önce CLAIM (pending→failed atomik), sonra release —
      // cron/callback ile çift iade yarışı imkansız olur.
      try {
        const { data: claimed } = await db
          .from('orders')
          .update({
            payment_status: 'failed',
            notes: `iyzico init failed: ${result.errorMessage ?? result.errorCode ?? 'unknown'}`,
          } as any)
          .eq('id', orderId)
          .eq('payment_status', 'pending')
          .select('id')
        if (claimed && claimed.length > 0 && stockPayload.length > 0) {
          await (db as any).rpc('release_stock_atomic', { p_items: stockPayload })
        }
      } catch (releaseErr) {
        console.error('[payment init] stock release on iyzico fail error:', releaseErr)
      }
      return NextResponse.json(
        { error: result.errorMessage || 'Ödeme başlatılamadı' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      checkoutFormContent: result.checkoutFormContent,
      paymentPageUrl: result.paymentPageUrl,
      basketId,
      orderId
    })

  } catch (error) {
    console.error('Payment init error:', error)
    return NextResponse.json(
      { error: 'Ödeme başlatılırken bir hata oluştu' },
      { status: 500 }
    )
  }
}
