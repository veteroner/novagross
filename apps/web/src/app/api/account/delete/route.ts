import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { csrfProtection } from '@/lib/csrf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Hesap silme (Apple App Store 5.1.1(v) uygulama içi silme şartı + KVKK silme talebi).
//
// Siparişler/faturalar yasal saklama süresine tabi (VUK) ve orders.user_id, profiles'a
// silme kısıtıyla bağlı → hesap "silme + anonimleştirme" ile kapatılır:
//   - silinir: adresler, sepet, favoriler, bildirimler/tercihler, cihazlar, kampanya teklifleri
//   - anonimleştirilir: profil (ad, soyad, telefon, e-posta), giriş hesabı (e-posta, şifre)
//   - giriş hesabı kalıcı olarak kapatılır (ban)
//   - saklanır: sipariş ve fatura kayıtları
// Teslim edilmemiş sipariş / açık iade varsa ya da kullanıcı satıcıysa reddedilir.

const OPEN_ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped']

export async function POST(request: NextRequest) {
  const csrfError = csrfProtection(request)
  if (csrfError) return csrfError

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })

  const db: any = createServiceRoleClient()

  const [{ data: profile }, { data: ownedStore }, { data: membership }] = await Promise.all([
    db.from('profiles').select('is_seller, role').eq('id', user.id).maybeSingle(),
    db.from('stores').select('id').eq('owner_id', user.id).limit(1).maybeSingle(),
    db.from('store_members').select('id').eq('user_id', user.id).limit(1).maybeSingle(),
  ])
  if (profile?.role === 'admin' || profile?.role === 'super_admin') {
    return NextResponse.json({ error: 'Yönetici hesapları uygulamadan silinemez.' }, { status: 409 })
  }
  if (profile?.is_seller || ownedStore || membership) {
    return NextResponse.json(
      { error: 'Bu hesap bir mağazaya bağlı. Mağaza hesabının kapatılması için destek ile iletişime geçin.' },
      { status: 409 }
    )
  }

  const { data: openOrders } = await db
    .from('orders')
    .select('id')
    .eq('user_id', user.id)
    .eq('payment_status', 'paid')
    .in('status', OPEN_ORDER_STATUSES)
    .limit(1)
  if (openOrders && openOrders.length > 0) {
    return NextResponse.json(
      { error: 'Teslim edilmemiş siparişiniz var. Siparişleriniz tamamlandıktan sonra hesabınızı silebilirsiniz.' },
      { status: 409 }
    )
  }
  const { data: openReturns } = await db
    .from('return_requests')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved'])
    .limit(1)
  if (openReturns && openReturns.length > 0) {
    return NextResponse.json({ error: 'Açık iade talebiniz var. İade sonuçlandıktan sonra hesabınızı silebilirsiniz.' }, { status: 409 })
  }

  const uid = user.id
  const anonEmail = `deleted+${uid}@deleted.novagross.com`

  // Kişisel veriler
  const deletions = [
    db.from('addresses').delete().eq('user_id', uid),
    db.from('carts').delete().eq('user_id', uid),
    db.from('wishlists').delete().eq('user_id', uid),
    db.from('push_devices').delete().eq('user_id', uid),
    db.from('notification_preferences').delete().eq('user_id', uid),
    db.from('notification_outbox').delete().eq('user_id', uid),
    db.from('user_notifications').delete().eq('user_id', uid),
    db.from('product_offer_recipients').delete().eq('user_id', uid),
    db.from('email_preferences').delete().eq('user_id', uid),
  ]
  const results = await Promise.all(deletions)
  const delError = results.find((r: any) => r.error)
  if (delError) {
    console.error('[account/delete] delete error', delError.error)
    return NextResponse.json({ error: 'Hesap silinemedi, lütfen tekrar deneyin.' }, { status: 500 })
  }

  const { error: profileError } = await db
    .from('profiles')
    .update({
      email: anonEmail,
      first_name: 'Silinmiş',
      last_name: 'Kullanıcı',
      phone: null,
      avatar_url: null,
      metadata: { deleted_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    })
    .eq('id', uid)
  if (profileError) {
    console.error('[account/delete] profile error', profileError)
    return NextResponse.json({ error: 'Hesap silinemedi, lütfen tekrar deneyin.' }, { status: 500 })
  }

  const { error: authError } = await db.auth.admin.updateUserById(uid, {
    email: anonEmail,
    email_confirm: true,
    password: crypto.randomBytes(32).toString('hex'),
    user_metadata: { deleted: true },
    ban_duration: '876000h', // ~100 yıl: giriş kalıcı kapalı
  })
  if (authError) {
    console.error('[account/delete] auth error', authError)
    return NextResponse.json({ error: 'Hesap silinemedi, lütfen tekrar deneyin.' }, { status: 500 })
  }

  console.log('[account/delete] hesap silindi/anonimleştirildi', uid)
  return NextResponse.json({ ok: true })
}
