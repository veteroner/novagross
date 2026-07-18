import { NextRequest, NextResponse } from 'next/server'
import { requireSellerApi } from '@/lib/auth/requireSellerApi'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/** Üye rolünü değiştir (yalnızca Sahip; owner satırı değiştirilemez). */
export async function PATCH(request: NextRequest, { params }: { params: { memberId: string } }) {
  const auth = await requireSellerApi()
  if (auth instanceof NextResponse) return auth
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Bu işlem için mağaza sahibi olmalısınız' }, { status: 403 })
  }

  const body = await request.json()
  const newRole = body.role === 'manager' ? 'manager' : 'staff'

  const service = createServiceRoleClient() as any
  const { data: member } = await service
    .from('store_members')
    .select('id, role')
    .eq('id', params.memberId)
    .eq('store_id', auth.storeId)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
  if (member.role === 'owner') {
    return NextResponse.json({ error: 'Mağaza sahibinin rolü değiştirilemez' }, { status: 400 })
  }

  const { error } = await service
    .from('store_members')
    .update({ role: newRole })
    .eq('id', params.memberId)
    .eq('store_id', auth.storeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

/** Üyeyi mağazadan çıkar (yalnızca Sahip; owner çıkarılamaz). */
export async function DELETE(_request: NextRequest, { params }: { params: { memberId: string } }) {
  const auth = await requireSellerApi()
  if (auth instanceof NextResponse) return auth
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Bu işlem için mağaza sahibi olmalısınız' }, { status: 403 })
  }

  const service = createServiceRoleClient() as any
  const { data: member } = await service
    .from('store_members')
    .select('id, role')
    .eq('id', params.memberId)
    .eq('store_id', auth.storeId)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
  if (member.role === 'owner') {
    return NextResponse.json({ error: 'Mağaza sahibi çıkarılamaz' }, { status: 400 })
  }

  const { error } = await service
    .from('store_members')
    .delete()
    .eq('id', params.memberId)
    .eq('store_id', auth.storeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
