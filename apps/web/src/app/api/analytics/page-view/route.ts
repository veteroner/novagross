import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      session_id,
      page_url,
      page_title,
      referrer,
      user_agent,
      device_type,
      browser,
      os,
    } = body

    const supabase = await createClient()
    
    // Get user ID if authenticated
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               null

    // Insert page view
    const { data, error } = await (supabase as any)
      // `page_views` may not exist in generated Supabase types yet.
      .from('page_views')
      .insert({
        session_id,
        user_id: user?.id || null,
        page_url,
        page_title,
        referrer,
        user_agent,
        device_type,
        browser,
        os,
        ip_address: ip,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error inserting page view:', error)
      return NextResponse.json({ error: 'Failed to record page view' }, { status: 500 })
    }

    return NextResponse.json({ id: (data as any)?.id, success: true })
  } catch (error: any) {
    console.error('Page view tracking error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
