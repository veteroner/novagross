import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Satıcı hedefli teklif: ürünle ilgilenen/sepette bırakan alıcılara kişiye özel
// tek kullanımlık kupon üretir; e-posta + site içi bildirim kuyruğa alınır.
// KVKK: satıcıya alıcı kimliği DÖNMEZ — yalnızca kaç kişiye gittiği döner.

const MAX_RECIPIENTS = 200
const OFFER_COOLDOWN_DAYS = 3

function genCouponCode(): string {
  // Karışması kolay karakterler yok (0/O, 1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `FIRSAT-${s}`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })

    const body = await request.json()
    const productId: string = String(body.productId || '')
    const audience: string = ['abandoned_cart', 'interested', 'favorited'].includes(body.audience)
      ? body.audience
      : 'interested'
    const discountValue = Number(body.discountValue)
    const validDays = Math.max(1, Math.min(30, Number(body.validDays) || 7))

    if (!productId) return NextResponse.json({ error: 'productId zorunlu' }, { status: 400 })
    if (!isFinite(discountValue) || discountValue < 5 || discountValue > 90) {
      return NextResponse.json({ error: 'İndirim %5 ile %90 arasında olmalı' }, { status: 400 })
    }

    const db = createServiceRoleClient() as any

    // Mağaza sahipliği + ürün doğrulama
    const { data: store } = await db
      .from('stores')
      .select('id, store_name')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!store) return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 403 })

    const { data: product } = await db
      .from('products')
      .select('id, name, slug, price, store_id')
      .eq('id', productId)
      .eq('store_id', store.id)
      .maybeSingle()
    if (!product) return NextResponse.json({ error: 'Ürün mağazanıza ait değil' }, { status: 403 })

    // Spam koruması: aynı ürüne son 3 günde teklif gönderilmişse engelle
    const cooldownStart = new Date(Date.now() - OFFER_COOLDOWN_DAYS * 86400_000).toISOString()
    const { data: recentOffer } = await db
      .from('product_offers')
      .select('id')
      .eq('product_id', productId)
      .gte('created_at', cooldownStart)
      .limit(1)
      .maybeSingle()
    if (recentOffer) {
      return NextResponse.json(
        { error: `Bu ürüne son ${OFFER_COOLDOWN_DAYS} gün içinde zaten teklif gönderilmiş` },
        { status: 429 }
      )
    }

    // Hedef kitle (SECURITY DEFINER fonksiyon, yalnız service role çağırabilir)
    const { data: recipients, error: recErr } = await db.rpc('get_offer_recipients', {
      p_product_id: productId,
      p_audience: audience,
      p_days: 30,
    })
    if (recErr) throw new Error(recErr.message)

    const userIds: string[] = (recipients || [])
      .map((r: any) => r.user_id)
      .filter(Boolean)
      .slice(0, MAX_RECIPIENTS)

    if (userIds.length === 0) {
      return NextResponse.json(
        { error: 'Bu ürünle ilgilenen (henüz satın almamış) üye bulunamadı' },
        { status: 404 }
      )
    }

    // E-postalar (yalnızca sunucuda kullanılır, satıcıya dönmez)
    const { data: profiles } = await db
      .from('profiles')
      .select('id, email, first_name')
      .in('id', userIds)

    const emailById = new Map<string, { email: string | null; name: string | null }>()
    for (const p of profiles || []) emailById.set(p.id, { email: p.email, name: p.first_name })

    // Teklif kaydı
    const { data: offer, error: offerErr } = await db
      .from('product_offers')
      .insert({
        store_id: store.id,
        product_id: productId,
        discount_type: 'percentage',
        discount_value: discountValue,
        audience,
        valid_days: validDays,
        created_by: user.id,
      })
      .select('id')
      .single()
    if (offerErr) throw new Error(offerErr.message)

    const expiresAt = new Date(Date.now() + validDays * 86400_000)
    const siteUrl = process.env.NEXT_PUBLIC_WEB_SITE_URL || 'https://novagross.com'
    const productUrl = `${siteUrl}/urun/${product.slug}`
    const now = new Date().toISOString()

    let notified = 0
    for (const uid of userIds) {
      const code = genCouponCode()

      // Kişiye özel tek kullanımlık kupon
      const { data: coupon, error: couponErr } = await db
        .from('coupons')
        .insert({
          code,
          description: `${store.store_name} — ${product.name} için özel %${discountValue} indirim`,
          discount_type: 'percentage',
          discount_value: discountValue,
          usage_limit: 1,
          used_count: 0,
          starts_at: now,
          expires_at: expiresAt.toISOString(),
          is_active: true,
          created_by: user.id,
        })
        .select('id')
        .single()
      if (couponErr) {
        console.error('[offers] kupon oluşturulamadı:', couponErr.message)
        continue
      }

      await db.from('product_offer_recipients').insert({
        offer_id: offer.id,
        user_id: uid,
        coupon_id: coupon.id,
        coupon_code: code,
        notified_at: now,
      })

      // Site içi bildirim
      await db.from('user_notifications').insert({
        user_id: uid,
        type: 'offer',
        title: `${product.name} için size özel %${discountValue} indirim! 🎁`,
        body: `${code} koduyla ${expiresAt.toLocaleDateString('tr-TR')} tarihine kadar geçerli.`,
        link: `/urun/${product.slug}`,
      })

      // E-posta
      const contact = emailById.get(uid)
      if (contact?.email) {
        await db.from('email_queue').insert({
          recipient: contact.email,
          template: 'marketing/product-offer',
          subject: `Size özel %${discountValue} indirim — ${product.name}`,
          data: {
            customerName: contact.name || 'Değerli Müşterimiz',
            productName: product.name,
            productUrl,
            storeName: store.store_name,
            discountValue,
            couponCode: code,
            expiresAt: expiresAt.toLocaleDateString('tr-TR'),
          },
          priority: 'medium',
          scheduled_at: now,
          status: 'pending',
        })
      }
      notified++
    }

    await db.from('product_offers').update({ recipient_count: notified }).eq('id', offer.id)

    // KVKK: kimlik yok, yalnızca sayı
    return NextResponse.json({ success: true, recipientCount: notified })
  } catch (error: any) {
    console.error('[offers] error:', error)
    return NextResponse.json({ error: error?.message || 'Teklif gönderilemedi' }, { status: 500 })
  }
}
