import { NextRequest, NextResponse } from 'next/server'
import { csrfProtection } from '@/lib/csrf'
import { decryptCheckoutHandoff } from '@/lib/privacy/signed-token'
import { POST as initialize } from '../initialize/route'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  const csrf = csrfProtection(request); if (csrf) return csrf
  try {
    const body = await request.json()
    const handoff = decryptCheckoutHandoff(body.ticket)
    if (!handoff) return NextResponse.json({ error: 'Ödeme oturumu geçersiz veya süresi dolmuş. Uygulamaya dönüp tekrar deneyin.' }, { status: 401 })
    if (body.action !== 'prepare' && body.action !== 'initialize') return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
    const headers = new Headers({ 'Content-Type': 'application/json', authorization: `Bearer ${handoff.accessToken}` })
    const userAgent = request.headers.get('user-agent'); if (userAgent) headers.set('user-agent', userAgent)
    return initialize(new NextRequest(new URL('/api/payment/initialize', request.url), { method: 'POST', headers, body: JSON.stringify({ ...handoff.checkout, client: 'mobile', prepareOnly: body.action === 'prepare', agreements: body.action === 'initialize' ? body.agreements : undefined }) }))
  } catch { return NextResponse.json({ error: 'Ödeme oturumu hazırlanamadı. Uygulamaya dönüp tekrar deneyin.' }, { status: 503 }) }
}
