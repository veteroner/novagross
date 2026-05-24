import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 3600 // Cache for 1 hour

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('products')
      .select('brand')
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .not('brand', 'is', null)
      .neq('brand', '')
      .order('brand', { ascending: true })
      // Avoid fetching unbounded rows; this is enough for typical catalogs.
      .range(0, 999)

    if (error) {
      console.error('Error fetching brands:', error)
      return NextResponse.json([], { status: 500 })
    }

    const uniqueBrands = Array.from(
      new Set(
        (data ?? [])
          .map((row) => (typeof row.brand === 'string' ? row.brand.trim() : ''))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'tr'))

    return NextResponse.json(uniqueBrands, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    console.error('Brands route error:', error)
    return NextResponse.json([], { status: 500 })
  }
}
