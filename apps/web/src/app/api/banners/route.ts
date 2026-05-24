import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      // `banners` may not exist in generated Supabase types yet.
      .from('banners' as any)
      .select(
        'id, title, description, image_url, link_type, link_value, button_text, sort_order'
      )
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching banners:', error)
      return NextResponse.json([], { status: 500 })
    }

    return NextResponse.json(data ?? [], {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Banners route error:', error)
    return NextResponse.json([], { status: 500 })
  }
}
