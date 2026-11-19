import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { csrfProtection } from '@/lib/csrf'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!uuid.test(params.id)) return NextResponse.json({ error: 'Geçersiz ürün' }, { status: 400 })
  const db = await createClient()
  const { data, error } = await (db as any).from('product_questions').select('id, question, answer, answered_at').eq('product_id', params.id).eq('question_status', 'approved').eq('answer_status', 'approved').not('answer', 'is', null).order('answered_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: 'Sorular yüklenemedi' }, { status: 503 })
  return NextResponse.json({ questions: data || [] })
}
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const csrf = csrfProtection(request); if (csrf) return csrf
  if (!uuid.test(params.id)) return NextResponse.json({ error: 'Geçersiz ürün' }, { status: 400 })
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Soru sormak için giriş yapın.' }, { status: 401 })
  try {
    const body = await request.json()
    const question = typeof body.question === 'string' ? body.question.trim() : ''
    if (question.length < 10 || question.length > 1000) return NextResponse.json({ error: 'Sorunuz 10–1000 karakter olmalı.' }, { status: 400 })
    const db = createServiceRoleClient() as any
    const { data: product } = await db.from('products').select('id, store_id').eq('id', params.id).eq('is_active', true).eq('approval_status', 'approved').maybeSingle()
    if (!product?.store_id) return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    const { count, error: readError } = await db.from('product_questions').select('id', { count: 'exact', head: true }).eq('customer_id', user.id).gte('created_at', new Date(Date.now() - 3600000).toISOString())
    if (readError) throw readError
    if ((count || 0) >= 5) return NextResponse.json({ error: 'Bir saat içinde en fazla 5 soru gönderebilirsiniz.' }, { status: 429 })
    const { error } = await db.from('product_questions').insert({ product_id: params.id, customer_id: user.id, question, question_status: 'pending', answer_status: 'pending' })
    if (error) throw error
    return NextResponse.json({ message: 'Sorunuz alındı. Onay ve satıcı yanıtı sonrasında burada yayınlanır.' })
  } catch { return NextResponse.json({ error: 'Soru gönderilemedi. Lütfen tekrar deneyin.' }, { status: 503 }) }
}
