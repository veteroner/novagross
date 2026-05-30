import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { queueEmail } from '@/lib/email/queue'

export const dynamic = 'force-dynamic'

const REASON_CATEGORIES = [
  'defective',
  'wrong_item',
  'not_as_described',
  'damaged_in_shipping',
  'changed_mind',
  'late_delivery',
  'other',
] as const

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { orderId, orderItemId, quantity, reasonCategory, reason, customerNote } = body

    // Doğrulama
    if (!orderId || !orderItemId) {
      return NextResponse.json({ error: 'Sipariş bilgisi eksik' }, { status: 400 })
    }
    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: 'Geçersiz adet' }, { status: 400 })
    }
    if (!reasonCategory || !REASON_CATEGORIES.includes(reasonCategory)) {
      return NextResponse.json({ error: 'Geçersiz iade nedeni' }, { status: 400 })
    }
    if (!reason || reason.length < 10 || reason.length > 500) {
      return NextResponse.json(
        { error: 'Açıklama 10-500 karakter arasında olmalı' },
        { status: 400 }
      )
    }

    // RLS sayesinde user.id zaten kendi siparişi için kayıt oluşturabilir.
    // Trigger ekstra kontrolleri (teslim edildi mi, 14gün doldu mu) yapacak.
    const { data, error } = await (supabase as any)
      .from('return_requests')
      .insert({
        order_id: orderId,
        order_item_id: orderItemId,
        user_id: user.id,
        quantity,
        reason: reason.trim(),
        reason_category: reasonCategory,
        customer_note: customerNote?.trim() || null,
      })
      .select('id, refund_amount, store_id')
      .single()

    if (error) {
      console.error('Return request creation failed:', error)
      return NextResponse.json(
        { error: error.message || 'İade talebi oluşturulamadı' },
        { status: 400 }
      )
    }

    // Email bildirimleri (best-effort, hata olursa kayıt yine de oluşur)
    try {
      const service = createServiceRoleClient()
      const { data: order } = await service
        .from('orders')
        .select('order_number')
        .eq('id', orderId)
        .single()
      const { data: profile } = await service
        .from('profiles')
        .select('email, first_name')
        .eq('id', user.id)
        .single()

      const adminEmail = process.env.ADMIN_EMAIL || 'admin@novagross.com'
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com'
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.novagross.com'

      // Müşteriye
      if (profile?.email) {
        await queueEmail({
          to: profile.email,
          subject: `Novagross | İade talebiniz alındı - #${order?.order_number ?? ''}`,
          template: 'returns/request-received',
          priority: 'medium',
          data: {
            orderNumber: order?.order_number ?? '',
            customerName: profile.first_name || 'Müşterimiz',
            requestId: data.id,
            myReturnsUrl: `${siteUrl}/hesabim/iadelerim`,
            quantity,
            reason,
          },
        })
      }

      // Admin'e
      await queueEmail({
        to: adminEmail,
        subject: `Novagross | Yeni iade talebi - #${order?.order_number ?? ''}`,
        template: 'returns/request-received-admin',
        priority: 'medium',
        data: {
          orderNumber: order?.order_number ?? '',
          requestId: data.id,
          quantity,
          reason,
          reasonCategory,
          customerEmail: profile?.email,
          reviewUrl: `${adminUrl}/iadeler/${data.id}`,
        },
      })
    } catch (emailErr) {
      console.warn('Return request email failed:', emailErr)
    }

    return NextResponse.json({ success: true, requestId: data.id })
  } catch (err: any) {
    console.error('Return create error:', err)
    return NextResponse.json(
      { error: err.message || 'Bir hata oluştu' },
      { status: 500 }
    )
  }
}
