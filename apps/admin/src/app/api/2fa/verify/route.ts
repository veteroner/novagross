import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import {
  isTwoFactorEnabled,
  hashCode,
  signToken,
  TWO_FA_COOKIE,
  REMEMBER_MS,
  DEFAULT_MS,
} from '@/lib/auth/two-factor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isTwoFactorEnabled()) return NextResponse.json({ ok: true, skipped: true })

  const body = await req.json().catch(() => ({}))
  const code = String(body?.code ?? '').trim()
  const remember = Boolean(body?.remember)

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Geçersiz kod formatı.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Oturum bulunamadı.' }, { status: 401 })

  const db = createServiceRoleClient()
  const { data: row } = await (db as any)
    .from('auth_otp_codes')
    .select('id, code_hash, expires_at, attempts, consumed_at')
    .eq('user_id', user.id)
    .eq('purpose', 'login_2fa')
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) return NextResponse.json({ error: 'Kod bulunamadı. Yeni kod isteyin.' }, { status: 400 })
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Kodun süresi doldu. Yeni kod isteyin.' }, { status: 400 })
  }
  if (Number(row.attempts) >= 5) {
    return NextResponse.json({ error: 'Çok fazla hatalı deneme. Yeni kod isteyin.' }, { status: 429 })
  }

  if (row.code_hash !== hashCode(code)) {
    await (db as any).from('auth_otp_codes').update({ attempts: Number(row.attempts) + 1 }).eq('id', row.id)
    return NextResponse.json({ error: 'Kod hatalı.' }, { status: 400 })
  }

  await (db as any).from('auth_otp_codes').update({ consumed_at: new Date().toISOString() }).eq('id', row.id)

  const expMs = Date.now() + (remember ? REMEMBER_MS : DEFAULT_MS)
  const token = signToken(user.id, expMs)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(TWO_FA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor((expMs - Date.now()) / 1000),
  })
  return res
}
