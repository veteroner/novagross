import { NextResponse } from 'next/server'
import { isKolayGelsinEnabledForStore } from '@novagross/cargo'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ enabled: false }, { status: 401 })

  const { data } = await (supabase as any).rpc('get_my_store')
  const store = Array.isArray(data) ? data[0] : data
  return NextResponse.json({ enabled: isKolayGelsinEnabledForStore(store?.store_id) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
