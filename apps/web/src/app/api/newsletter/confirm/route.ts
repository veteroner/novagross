import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { csrfProtection } from '@/lib/csrf'
import { verifyToken } from '@/lib/privacy/signed-token'
import { MARKETING_VERSION } from '@/lib/privacy/marketing'

export async function POST(request: NextRequest) {
  const csrfError = csrfProtection(request)
  if (csrfError) return csrfError
  try {
    const { token } = await request.json()
    const consent = verifyToken<{ email: string; version: string; text: string; requestedAt: string }>(token, 'newsletter')
    if (!consent || consent.version !== MARKETING_VERSION) return NextResponse.json({ error: 'Bağlantı geçersiz veya süresi dolmuş. Yeniden abonelik isteği oluşturun.' }, { status: 400 })
    const db = createServiceRoleClient() as any
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const { data: changed, error } = await db.rpc('set_newsletter_preference', { p_email: consent.email, p_enabled: true, p_user_id: null, p_source: 'newsletter_confirmation', p_version: consent.version, p_text: consent.text, p_token_hash: tokenHash })
    if (error) throw error
    if (!changed) return NextResponse.json({ message: 'Bu bağlantı daha önce kullanılmış. Güncel tercihinizi hesap ayarlarından yönetebilirsiniz.' })
    return NextResponse.json({ message: 'E-posta bülteni aboneliğiniz doğrulandı. İzninizi istediğiniz zaman geri alabilirsiniz.' })
  } catch {
    return NextResponse.json({ error: 'Abonelik tamamlanamadı. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}
