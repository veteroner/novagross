import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { csrfProtection } from '@/lib/csrf'
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const csrf = csrfProtection(request); if (csrf) return csrf
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yorum için giriş yapın.' }, { status: 401 })
  try {
    const body = await request.json(), rating = Number(body.rating)
    const title = typeof body.title === 'string' ? body.title.trim() : '', comment = typeof body.comment === 'string' ? body.comment.trim() : ''
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || title.length < 2 || title.length > 120 || comment.length < 10 || comment.length > 3000) return NextResponse.json({ error: 'Puan 1–5, başlık 2–120, yorum 10–3000 karakter olmalı.' }, { status: 400 })
    const db = createServiceRoleClient() as any
    const { data: purchased, error: purchaseError } = await db.from('order_items').select('order_id, orders!inner(user_id, payment_status, status)').eq('product_id', params.id).eq('orders.user_id', user.id).eq('orders.payment_status', 'paid').eq('orders.status', 'delivered').limit(1).maybeSingle()
    if (purchaseError) throw purchaseError
    if (!purchased) return NextResponse.json({ error: 'Yorum yazmak için bu ürüne ait teslim edilmiş bir alışverişiniz olmalı.' }, { status: 403 })
    const { count, error: readError } = await db.from('reviews').select('id', { count: 'exact', head: true }).eq('product_id', params.id).eq('user_id', user.id)
    if (readError) throw readError
    if (count) return NextResponse.json({ error: 'Bu ürün için zaten yorum gönderdiniz.' }, { status: 409 })
    const { error } = await db.from('reviews').insert({ product_id: params.id, user_id: user.id, order_id: purchased.order_id, rating, title, comment, is_verified: true, is_approved: false })
    if (error) throw error
    return NextResponse.json({ message: 'Yorumunuz alındı. İnceleme sonrasında yayınlanır.' })
  } catch { return NextResponse.json({ error: 'Yorum gönderilemedi. Lütfen tekrar deneyin.' }, { status: 503 }) }
}
