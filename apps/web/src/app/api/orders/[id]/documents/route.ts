import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
  const { data: order } = await db.from('orders').select('id, order_number').eq('id', params.id).eq('user_id', user.id).maybeSingle()
  if (!order) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
  const { data, error } = await (db as any).from('user_agreements').select('metadata, accepted_at, version').eq('order_id', order.id).eq('user_id', user.id).eq('agreement_type', 'mesafeli_satis').order('accepted_at', { ascending: false }).limit(1).maybeSingle()
  if (error) return NextResponse.json({ error: 'Belge alınamadı' }, { status: 503 })
  if (!data?.metadata?.document_text) return NextResponse.json({ error: 'Bu eski sipariş için arşivlenmiş belge bulunmuyor. Destek ile iletişime geçebilirsiniz.' }, { status: 404 })
  return new NextResponse(`Sipariş: ${order.order_number}\nOnay zamanı: ${data.accepted_at}\nBelge özeti (SHA-256): ${data.metadata.document_hash}\n\n${data.metadata.document_text}`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="novagross-${order.id}-belgeler.txt"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
}
