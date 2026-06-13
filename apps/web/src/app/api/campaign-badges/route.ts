import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase: any = createServiceRoleClient()
  const { data, error } = await supabase
    .from('campaign_badges')
    .select('id, title, icon, bg_color, link, sort_order')
    .eq('is_active', true)
    .order('sort_order')
    .limit(12)

  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data ?? [])
}
