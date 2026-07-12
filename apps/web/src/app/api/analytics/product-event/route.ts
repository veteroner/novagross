import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EVENT_TYPES = new Set(['view', 'add_to_cart', 'remove_from_cart', 'favorite', 'unfavorite'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    // sendBeacon text/plain gönderebilir
    const raw = await request.text()
    const body = JSON.parse(raw || '{}')

    const eventType = String(body.event_type || '')
    const productId = String(body.product_id || '')
    if (!EVENT_TYPES.has(eventType) || !UUID_RE.test(productId)) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
    }
    const quantity = Math.max(1, Math.min(999, Number(body.quantity) || 1))
    const sessionId =
      typeof body.session_id === 'string' ? body.session_id.slice(0, 100) : null

    // Oturumlu kullanıcıyı (varsa) çerezden oku
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const db = createServiceRoleClient() as any

    // store_id'yi istemciden ALMA — üründen çöz (kurcalamaya kapalı)
    const { data: product } = await db
      .from('products')
      .select('id, store_id')
      .eq('id', productId)
      .maybeSingle()

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    const { error } = await db.from('product_events').insert({
      session_id: sessionId,
      user_id: user?.id || null,
      product_id: productId,
      store_id: product.store_id || null,
      event_type: eventType,
      quantity,
    })

    if (error) {
      console.error('[product-event] insert error:', error)
      return NextResponse.json({ error: 'Kayıt başarısız' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[product-event] error:', error)
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}
