import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/privacy/signed-token'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { MARKETING_VERSION } from '@/lib/privacy/marketing'
export async function POST(request: NextRequest) {
  try {
    const body = request.headers.get('content-type')?.includes('application/json') ? await request.json() : null
    const token = body?.token || request.nextUrl.searchParams.get('token')
    const data = verifyToken<{ email: string }>(token, 'newsletter-unsubscribe')
    if (!data?.email) return NextResponse.json({ error: 'Bağlantı geçersiz veya süresi dolmuş. Hesap ayarlarınızdan ya da destek üzerinden tercihinizi değiştirebilirsiniz.' }, { status: 400 })
    const db = createServiceRoleClient() as any
    const { error } = await db.rpc('set_newsletter_preference', { p_email: data.email, p_enabled: false, p_user_id: null, p_source: 'account_settings', p_version: MARKETING_VERSION, p_text: 'E-posta bağlantısı üzerinden pazarlama izni geri alındı.' })
    if (error) throw error
    return NextResponse.json({ message: 'Pazarlama e-postaları kapatıldı. Sipariş ve hesap güvenliği bildirimleri devam eder.' })
  } catch { return NextResponse.json({ error: 'Tercih güncellenemedi. Lütfen tekrar deneyin.' }, { status: 503 }) }
}
