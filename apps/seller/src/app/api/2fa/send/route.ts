import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { isTwoFactorEnabled, generateCode, hashCode, OTP_TTL_MS } from '@/lib/auth/two-factor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  if (!isTwoFactorEnabled()) return NextResponse.json({ skipped: true })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 })
  }

  const db = createServiceRoleClient()

  // Basit spam koruması: son 30 saniyede kod gönderildiyse engelle
  const since = new Date(Date.now() - 30 * 1000).toISOString()
  const { data: recent } = await (db as any)
    .from('auth_otp_codes')
    .select('id')
    .eq('user_id', user.id)
    .eq('purpose', 'login_2fa')
    .gte('created_at', since)
    .limit(1)
    .maybeSingle()
  if (recent) {
    return NextResponse.json({ ok: true, throttled: true })
  }

  const code = generateCode()
  await (db as any).from('auth_otp_codes').insert({
    user_id: user.id,
    email: user.email,
    code_hash: hashCode(code),
    purpose: 'login_2fa',
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  })

  if (!process.env.RESEND_API_KEY) {
    console.error('[2fa/send] RESEND_API_KEY missing')
    return NextResponse.json({ error: 'E-posta servisi yapılandırılmamış.' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = `${process.env.RESEND_FROM_NAME || 'Novagross'} <${process.env.RESEND_FROM_EMAIL || 'bildirim@novagross.com'}>`

  const result = await resend.emails.send({
    from,
    to: user.email,
    subject: `Giriş Doğrulama Kodunuz: ${code}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#FF6000">Novagross Satıcı Paneli</h2>
        <p>Giriş doğrulama kodunuz:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:6px;background:#f3f4f6;padding:16px;text-align:center;border-radius:8px">${code}</div>
        <p style="color:#6b7280;font-size:14px;margin-top:16px">Bu kod 5 dakika geçerlidir. Bu girişi siz yapmadıysanız şifrenizi değiştirin.</p>
      </div>
    `,
  })

  if ((result as any)?.error) {
    console.error('[2fa/send] resend error:', (result as any).error)
    return NextResponse.json({ error: 'Kod gönderilemedi.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
