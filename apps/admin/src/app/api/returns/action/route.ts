import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { queueEmail } from '@/lib/email/queue'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 })
    }

    // Admin kontrolü
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    const { requestId, action, adminNote, rejectionReason, iyzicoRefundId } = body

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }

    const service = createServiceRoleClient()
    let result: any = null

    if (action === 'approve') {
      const { data, error } = await (service as any).rpc('approve_return_request', {
        p_request_id: requestId,
        p_admin_id: user.id,
        p_admin_note: adminNote ?? null,
      })
      if (error) throw new Error(error.message)
      result = data
    } else if (action === 'reject') {
      if (!rejectionReason || rejectionReason.length < 5) {
        return NextResponse.json(
          { error: 'Red gerekçesi en az 5 karakter olmalı' },
          { status: 400 }
        )
      }
      const { data, error } = await (service as any).rpc('reject_return_request', {
        p_request_id: requestId,
        p_admin_id: user.id,
        p_rejection_reason: rejectionReason,
      })
      if (error) throw new Error(error.message)
      result = data
    } else if (action === 'mark_refunded') {
      const { data, error } = await (service as any).rpc('mark_return_refunded', {
        p_request_id: requestId,
        p_iyzico_refund_id: iyzicoRefundId ?? null,
      })
      if (error) throw new Error(error.message)
      result = data
    } else {
      return NextResponse.json({ error: 'Geçersiz aksiyon' }, { status: 400 })
    }

    // Email bildirimleri
    try {
      const { data: request } = await (service as any)
        .from('return_requests')
        .select(
          `
          status,
          order_id,
          user_id,
          quantity,
          refund_amount,
          orders ( order_number ),
          order_items ( name )
        `
        )
        .eq('id', requestId)
        .single()

      const { data: customer } = await service
        .from('profiles')
        .select('email, first_name')
        .eq('id', request?.user_id)
        .single()

      if (customer?.email && request) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com'
        const templates: Record<string, { subject: string; template: string }> = {
          approve: {
            subject: `Novagross | İadeniz onaylandı - #${request.orders?.order_number ?? ''}`,
            template: 'returns/approved',
          },
          reject: {
            subject: `Novagross | İade talebiniz reddedildi - #${request.orders?.order_number ?? ''}`,
            template: 'returns/rejected',
          },
          mark_refunded: {
            subject: `Novagross | Para iadesi tamamlandı - #${request.orders?.order_number ?? ''}`,
            template: 'returns/refunded',
          },
        }
        const tpl = templates[action]
        if (tpl) {
          await queueEmail({
            to: customer.email,
            subject: tpl.subject,
            template: tpl.template as any,
            priority: 'medium',
            data: {
              orderNumber: request.orders?.order_number,
              customerName: customer.first_name || 'Müşterimiz',
              productName: request.order_items?.name,
              quantity: request.quantity,
              refundAmount: request.refund_amount,
              myReturnsUrl: `${siteUrl}/hesabim/iadelerim`,
              adminNote: action === 'approve' ? adminNote : undefined,
              rejectionReason: action === 'reject' ? rejectionReason : undefined,
            },
          })
        }
      }
    } catch (emailErr) {
      console.warn('Return action email failed:', emailErr)
    }

    return NextResponse.json({ success: true, result })
  } catch (err: any) {
    console.error('Return action error:', err)
    return NextResponse.json({ error: err.message || 'Hata' }, { status: 500 })
  }
}
