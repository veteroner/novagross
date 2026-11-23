import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/auth/requireAdminApi'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// BILGOO manuel inceleme: yönetici iyzico panelinde bu sipariş için tahsilat
// olmadığını doğruladıktan sonra siparişi kapatır (pending→failed, hak ve stok
// serbest). Yalnız mutabakatın manuel incelemeye düşürdüğü kayıtlar kapatılabilir.
//
// POST { orderId: string, note: string }   — note: neyin kontrol edildiği (zorunlu)
export async function POST(request: NextRequest) {
  const auth = await requireAdminApi()
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => ({}))
  const orderId = typeof body?.orderId === 'string' ? body.orderId : ''
  const note = typeof body?.note === 'string' ? body.note.trim() : ''
  if (!orderId || note.length < 10) {
    return NextResponse.json({ error: 'orderId ve en az 10 karakterlik inceleme notu gerekli' }, { status: 400 })
  }

  const service: any = createServiceRoleClient()
  const { data: attempt } = await service
    .from('bilgoo_coupon_attempts')
    .select('state, needs_review')
    .eq('order_id', orderId)
    .maybeSingle()
  if (!attempt || attempt.state !== 'reserved' || !attempt.needs_review) {
    return NextResponse.json({ error: 'Kayıt manuel incelemede bekleyen açık bir BILGOO rezervasyonu değil' }, { status: 409 })
  }

  const { data: closed, error } = await service.rpc('close_unpaid_bilgoo_order', {
    p_order_id: orderId,
    p_reason: `manuel inceleme (${auth.userId}): ${note}`.slice(0, 200),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, closed: closed === true })
}
