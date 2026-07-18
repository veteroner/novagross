import { NextRequest, NextResponse } from 'next/server'
import { requireSellerApi } from '@/lib/auth/requireSellerApi'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

/**
 * Mağaza kullanıcıları + bekleyen davetler listesi (yalnızca Sahip).
 * profiles RLS başka kullanıcıların bilgisini vermediği için üye
 * ad/e-posta bilgisi service role ile okunur.
 */
export async function GET() {
  const auth = await requireSellerApi()
  if (auth instanceof NextResponse) return auth
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Bu işlem için mağaza sahibi olmalısınız' }, { status: 403 })
  }

  const service = createServiceRoleClient() as any
  const { data: members } = await service
    .from('store_members')
    .select('id, user_id, role, created_at, profile:profiles!store_members_user_id_fkey(id, full_name, email)')
    .eq('store_id', auth.storeId)
    .order('created_at', { ascending: true })

  const { data: invitations } = await service
    .from('store_invitations')
    .select('id, email, role, status, created_at, expires_at')
    .eq('store_id', auth.storeId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return NextResponse.json({ members: members || [], invitations: invitations || [] })
}

/** Yeni kullanıcı daveti (yalnızca Sahip). E-posta + rol. */
export async function POST(request: NextRequest) {
  const auth = await requireSellerApi()
  if (auth instanceof NextResponse) return auth
  if (auth.role !== 'owner') {
    return NextResponse.json({ error: 'Bu işlem için mağaza sahibi olmalısınız' }, { status: 403 })
  }

  const body = await request.json()
  const email = String(body.email || '').trim().toLowerCase()
  const role = body.role === 'manager' ? 'manager' : 'staff'
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Geçerli bir e-posta girin' }, { status: 400 })
  }

  const service = createServiceRoleClient() as any

  // Zaten üye mi? (e-postadan profili bul)
  const { data: existingProfile } = await service
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (existingProfile?.id) {
    const { data: alreadyMember } = await service
      .from('store_members')
      .select('id')
      .eq('store_id', auth.storeId)
      .eq('user_id', existingProfile.id)
      .maybeSingle()
    if (alreadyMember) {
      return NextResponse.json({ error: 'Bu kullanıcı zaten mağaza üyesi' }, { status: 409 })
    }
  }

  const token = randomBytes(24).toString('hex')

  // Aynı e-postaya bekleyen davet varsa yenile
  await service
    .from('store_invitations')
    .update({ status: 'revoked' })
    .eq('store_id', auth.storeId)
    .eq('status', 'pending')
    .ilike('email', email)

  const { data: invite, error: inviteError } = await service
    .from('store_invitations')
    .insert({ store_id: auth.storeId, email, role, token, invited_by: auth.userId })
    .select('id, email, role, status, created_at, expires_at')
    .single()
  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // Mağaza adı + davet e-postası kuyruğa
  const { data: store } = await service.from('stores').select('store_name').eq('id', auth.storeId).maybeSingle()
  const acceptUrl = `${process.env.NEXT_PUBLIC_SELLER_URL || 'https://seller.novagross.com'}/davet/${token}`
  await service.from('email_queue').insert({
    recipient: email,
    template: 'seller/store-invitation',
    subject: `${store?.store_name || 'Bir mağaza'} sizi ekibe davet etti`,
    data: {
      storeName: store?.store_name || 'Mağaza',
      roleLabel: role === 'manager' ? 'Yönetici' : 'Personel',
      acceptUrl,
    },
    priority: 'high',
    scheduled_at: new Date().toISOString(),
    status: 'pending',
  })

  return NextResponse.json({ success: true, invitation: invite })
}
