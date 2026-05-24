import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { page_view_id, duration_seconds } = body

    const supabase = await createClient()

    // Update page view with exit time and duration
    const { error } = await (supabase as any)
      // `page_views` may not exist in generated Supabase types yet.
      .from('page_views')
      .update({
        exited_at: new Date().toISOString(),
        duration_seconds,
      })
      .eq('id', page_view_id)

    if (error) {
      console.error('Error updating page exit:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Page exit tracking error:', error)
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 })
  }
}
