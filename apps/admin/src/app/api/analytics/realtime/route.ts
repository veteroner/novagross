import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdminApi } from '@/lib/auth/requireAdminApi'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Auth: admin only (defense in depth, middleware also checks)
  const auth = await requireAdminApi()
  if (auth instanceof NextResponse) return auth

  try {
    const supabase = createServiceRoleClient()

    // Get active sessions count (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const { data: activeSessions, error: sessionsError } = await supabase
      .from('page_views' as any)
      .select('session_id')
      .gte('created_at', fiveMinutesAgo)
      .or(`exited_at.is.null,exited_at.gte.${fiveMinutesAgo}`)

    if (sessionsError) throw sessionsError

    const uniqueSessions = new Set((activeSessions || []).map((pv: any) => pv.session_id)).size

    // Get active page views
    const { count: activePageViews } = await supabase
      .from('page_views' as any)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fiveMinutesAgo)
      .is('exited_at', null)

    // Get popular pages (last 5 minutes)
    const { data: popularPages, error: pagesError } = await supabase
      .from('page_views' as any)
      .select('page_url, page_title')
      .gte('created_at', fiveMinutesAgo)

    if (pagesError) throw pagesError

    const pageStats = (popularPages || []).reduce((acc: any, pv: any) => {
      const key = pv.page_url
      if (!acc[key]) {
        acc[key] = {
          page_url: pv.page_url,
          page_title: pv.page_title,
          views: 0
        }
      }
      acc[key].views++
      return acc
    }, {})

    const topPages = Object.values(pageStats)
      .sort((a: any, b: any) => b.views - a.views)
      .slice(0, 10)

    // Get device breakdown
    const { data: deviceData, error: deviceError } = await supabase
      .from('page_views' as any)
      .select('device_type')
      .gte('created_at', fiveMinutesAgo)

    if (deviceError) throw deviceError

    const deviceStats = (deviceData || []).reduce((acc: any, pv: any) => {
      const device = pv.device_type || 'unknown'
      acc[device] = (acc[device] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      active_sessions: uniqueSessions,
      active_page_views: activePageViews || 0,
      top_pages: topPages,
      device_breakdown: deviceStats,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Real-time stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
