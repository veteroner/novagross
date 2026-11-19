import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { csrfProtection } from '@/lib/csrf'
import { MARKETING_TEXT, MARKETING_VERSION } from '@/lib/privacy/marketing'
import { signToken } from '@/lib/privacy/signed-token'
import { getSiteUrl } from '@/lib/site-url'

export async function POST(request: NextRequest) {
  const csrfError = csrfProtection(request)
  if (csrfError) return csrfError
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin' }, { status: 400 })
    if (body.consent !== true || body.version !== MARKETING_VERSION) return NextResponse.json({ error: 'E-posta bülteni iznini işaretleyin ve tekrar deneyin.' }, { status: 400 })
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) throw new Error('E-posta gönderimi yapılandırılmamış')
    const token = signToken('newsletter', { email, version: MARKETING_VERSION, text: MARKETING_TEXT, requestedAt: new Date().toISOString() })
    const url = new URL('/bulten/onay', process.env.NEXT_PUBLIC_SITE_URL || getSiteUrl())
    url.searchParams.set('token', token)
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: `${process.env.RESEND_FROM_NAME || 'Novagross'} <${process.env.RESEND_FROM_EMAIL}>`, to: email,
      subject: 'Novagross e-posta bülteni — adresinizi doğrulayın',
      text: `${MARKETING_TEXT}\n\nAboneliği tamamlamak için bu bağlantıyı açıp onaylayın (24 saat geçerli):\n${url}\n\nBu isteği siz yapmadıysanız işlem yapmayın. Onay vermeden bülten aboneliği başlatılmaz.`,
    })
    if (error) throw error
    return NextResponse.json({ message: 'E-posta adresinize doğrulama bağlantısı gönderdik. Abonelik için bağlantıdaki onayı tamamlayın.' })
  } catch (error) {
    console.error('Newsletter confirmation delivery failed')
    return NextResponse.json({ error: 'Doğrulama e-postası gönderilemedi. Lütfen daha sonra tekrar deneyin.' }, { status: 503 })
  }
}
