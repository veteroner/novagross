import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { mngKargo } from '@novagross/cargo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// MNG Plus Query /checkReturnOrder ile iade gönderisinin gerçek durumunu sorgular.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const { requestId } = await req.json()
    if (!requestId) return NextResponse.json({ error: 'requestId zorunlu' }, { status: 400 })

    const service = createServiceRoleClient() as any
    const { data: r } = await service
      .from('return_requests')
      .select('return_tracking_number')
      .eq('id', requestId)
      .maybeSingle()

    if (!r?.return_tracking_number) {
      return NextResponse.json({ error: 'Bu talep için iade kargosu henüz oluşturulmamış' }, { status: 400 })
    }

    const result = await mngKargo.checkReturnOrder(r.return_tracking_number)
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Durum sorgulanamadı' }, { status: 502 })
    }

    return NextResponse.json({ success: true, status: result.data })
  } catch (e: any) {
    console.error('[returns check-status] error', e)
    return NextResponse.json({ error: e?.message || 'Hata' }, { status: 500 })
  }
}
