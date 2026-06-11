import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CartItemDTO = {
  productId: string
  variantId: string | null
  quantity: number
  price: number
  name: string
  image: string | null
}

// Sepeti DB ile senkronize et: yeni cihazdan login olan kullanıcı için
// localStorage'daki itemlerle DB'deki birleştirilir (quantity max).
// Çıktı: tek kaynak (DB) — client local'ini bununla güncellesin.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) {
      return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const localItems: CartItemDTO[] = Array.isArray(body?.items) ? body.items : []

    // Local item validasyon (sıkı tip + sınırlar)
    const safeLocal = localItems
      .filter(
        (it) =>
          typeof it?.productId === 'string' &&
          it.productId.length > 0 &&
          Number.isFinite(it?.quantity) &&
          Math.floor(Number(it.quantity)) > 0 &&
          Math.floor(Number(it.quantity)) <= 1000
      )
      .map((it) => ({
        productId: it.productId,
        variantId: it.variantId ?? null,
        quantity: Math.floor(Number(it.quantity)),
      }))
      .slice(0, 200) // bir sepette en fazla 200 farklı kalem

    // Kullanıcının cart row'u (yoksa oluştur)
    let { data: cart } = await (supabase as any)
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!cart) {
      const { data: created, error: createErr } = await (supabase as any)
        .from('carts')
        .insert({ user_id: user.id })
        .select('id')
        .single()
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 })
      }
      cart = created
    }

    // Mevcut DB item'ları
    const { data: dbItems } = await (supabase as any)
      .from('cart_items')
      .select('product_id, variant_id, quantity')
      .eq('cart_id', cart.id)

    // Merge: key = productId|variantId, quantity = max(local, db)
    const merged = new Map<
      string,
      { productId: string; variantId: string | null; quantity: number }
    >()
    const key = (pid: string, vid: string | null) => `${pid}|${vid ?? ''}`

    for (const it of dbItems ?? []) {
      merged.set(key(it.product_id, it.variant_id), {
        productId: it.product_id,
        variantId: it.variant_id ?? null,
        quantity: Number(it.quantity) || 0,
      })
    }
    for (const it of safeLocal) {
      const k = key(it.productId, it.variantId)
      const existing = merged.get(k)
      merged.set(k, {
        productId: it.productId,
        variantId: it.variantId,
        quantity: Math.max(existing?.quantity ?? 0, it.quantity),
      })
    }

    // DB cart_items'ı atomik şekilde tazele: sil + yeniden ekle
    await (supabase as any).from('cart_items').delete().eq('cart_id', cart.id)
    if (merged.size > 0) {
      const rows = Array.from(merged.values()).map((m) => ({
        cart_id: cart.id,
        product_id: m.productId,
        variant_id: m.variantId,
        quantity: m.quantity,
      }))
      const { error: insertErr } = await (supabase as any).from('cart_items').insert(rows)
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 })
      }
    }

    // Ürün metadata'sını dön: client local'i bu listeyle güncellesin
    const productIds = Array.from(new Set(Array.from(merged.values()).map((m) => m.productId)))
    let productMap = new Map<string, { name: string; price: number; image: string | null }>()
    if (productIds.length > 0) {
      const { data: products } = await (supabase as any)
        .from('products')
        .select('id, name, price, images')
        .in('id', productIds)
      for (const p of products ?? []) {
        const img = Array.isArray((p as any).images) && (p as any).images.length > 0
          ? String((p as any).images[0])
          : null
        productMap.set(p.id, {
          name: String((p as any).name ?? ''),
          price: Number((p as any).price ?? 0),
          image: img,
        })
      }
    }

    const items: CartItemDTO[] = Array.from(merged.values())
      .filter((m) => productMap.has(m.productId)) // silinmiş ürünleri at
      .map((m) => {
        const meta = productMap.get(m.productId)!
        return {
          productId: m.productId,
          variantId: m.variantId,
          quantity: m.quantity,
          price: meta.price,
          name: meta.name,
          image: meta.image,
        }
      })

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[cart sync] error', e)
    return NextResponse.json({ error: e?.message ?? 'Sunucu hatası' }, { status: 500 })
  }
}
