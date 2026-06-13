import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase: any = createServiceRoleClient()
  const { data, error } = await supabase
    .from('promo_sections')
    .select('id, title, subtitle, image_url, bg_color, link, position')
    .eq('is_active', true)
    .order('position')
    .limit(4)

  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data ?? [])
}
