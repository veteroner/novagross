import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Satıcının kendi mağazası için ürün ilgi istatistikleri (son 30 gün).
// KVKK: yalnızca sayılar döner, alıcı kimliği yoktur.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })

    const db = createServiceRoleClient() as any
    const { data: store } = await db
      .from('stores')
      .select('id')
      .eq('id', ((await (db as any).rpc('get_my_store')).data?.[0]?.store_id) ?? '')
      .maybeSingle()
    if (!store) return NextResponse.json({ error: 'Mağaza bulunamadı' }, { status: 403 })

    const { data, error } = await db.rpc('get_product_interest', {
      p_store_id: store.id,
      p_days: 30,
    })
    if (error) throw new Error(error.message)

    // Son gönderilen teklifler (cooldown göstermek için)
    const { data: offers } = await db
      .from('product_offers')
      .select('product_id, created_at, recipient_count, discount_value')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ products: data || [], offers: offers || [] })
  } catch (error: any) {
    console.error('[product-interest] error:', error)
    return NextResponse.json({ error: error?.message || 'Veri alınamadı' }, { status: 500 })
  }
}
