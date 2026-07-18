import { NextRequest, NextResponse } from 'next/server'
import { requireSellerApi } from '@/lib/auth/requireSellerApi'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/** Bekleyen daveti iptal et (yalnızca Sahip). */
export async function DELETE(_request: NextRequest, { params }: { params: { invitationId: string } }) {
  const auth = await requireSellerApi()
  if (auth instanceof NextResponse) return auth
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Bu işlem için mağaza sahibi olmalısınız' }, { status: 403 })
  }

  const service = createServiceRoleClient() as any
  const { error } = await service
    .from('store_invitations')
    .update({ status: 'revoked' })
    .eq('id', params.invitationId)
    .eq('store_id', auth.storeId)
    .eq('status', 'pending')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
