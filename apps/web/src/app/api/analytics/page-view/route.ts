import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// NOT: Yazma service-role ile yapılır. Güvenlik sıkılaştırması sonrası page_views
// SELECT'i admin-only olduğundan anon client'ta INSERT ... RETURNING (insert+select)
// RLS'e takılıyordu ve izleme tamamen kırılmıştı. Service role + sıkı input
// validasyonu ile hem güvenli hem çalışır.

const clip = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string' || !v.trim()) return null
  return v.slice(0, max)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const session_id = clip(body.session_id, 100)
    const page_url = clip(body.page_url, 500)
    if (!session_id || !page_url) {
      return NextResponse.json({ error: 'session_id ve page_url zorunlu' }, { status: 400 })
    }

    // Oturum açık kullanıcıyı (varsa) anon client'tan oku
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const rawIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null
    // INET cast hatalarını önle: basit IPv4/IPv6 biçim kontrolü
    const ip = rawIp && /^[0-9a-fA-F:.]{3,45}$/.test(rawIp) ? rawIp : null

    const db = createServiceRoleClient() as any
    const { data, error } = await db
      .from('page_views')
      .insert({
        session_id,
        user_id: user?.id || null,
        page_url,
        page_title: clip(body.page_title, 300),
        referrer: clip(body.referrer, 500),
        user_agent: clip(body.user_agent, 400),
        device_type: clip(body.device_type, 20),
        browser: clip(body.browser, 40),
        os: clip(body.os, 40),
        ip_address: ip,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error inserting page view:', error)
      return NextResponse.json({ error: 'Failed to record page view' }, { status: 500 })
    }

    return NextResponse.json({ id: data?.id, success: true })
  } catch (error: any) {
    console.error('Page view tracking error:', error)
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}
