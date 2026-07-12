import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    // sendBeacon text/plain gönderebilir; her iki durumda da JSON parse et
    const raw = await request.text()
    const body = JSON.parse(raw || '{}')
    const { page_view_id, duration_seconds } = body

    if (typeof page_view_id !== 'string' || !UUID_RE.test(page_view_id)) {
      return NextResponse.json({ error: 'Geçersiz page_view_id' }, { status: 400 })
    }
    // 0..24 saat aralığına sıkıştır
    const duration = Math.max(0, Math.min(86400, Number(duration_seconds) || 0))

    const db = createServiceRoleClient() as any
    const { error } = await db
      .from('page_views')
      .update({
        exited_at: new Date().toISOString(),
        duration_seconds: duration,
      })
      .eq('id', page_view_id)

    if (error) {
      console.error('Error updating page exit:', error)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Page exit tracking error:', error)
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}
