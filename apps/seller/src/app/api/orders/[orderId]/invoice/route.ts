import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { assertSellerOwnsOrder } from '@/lib/order-ownership'

export const runtime = 'nodejs'

/**
 * Sipariş faturası (e-Arşiv PDF) metadata kaydı.
 *
 * Dosyanın kendisi client-side'dan doğrudan private 'invoices' bucket'ına
 * yüklenir (Netlify 6MB body limitine takılmamak için) — storage RLS'i
 * satıcının yalnızca kendi mağaza klasörüne ({storeId}/...) yazmasına izin
 * verir. Bu route yalnızca metadata'yı doğrulayıp order_invoices'a upsert
 * eder; İLK yüklemede müşteriye site içi bildirim + e-posta gönderilir
 * (değiştirmede gönderilmez).
 */
export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    const ownership = await assertSellerOwnsOrder(supabase, user.id, params.orderId)
    if (!ownership.ok || !ownership.storeId) {
      return NextResponse.json({ error: 'Bu siparişe erişim yetkiniz yok' }, { status: 403 })
    }
    const storeId = ownership.storeId

    const body = await request.json()
    const filePath = String(body.filePath || '')
    const fileSize = Number(body.fileSize || 0) || null
    const invoiceNumber = body.invoiceNumber ? String(body.invoiceNumber).slice(0, 100) : null

    // Path güvenliği: yalnızca kendi mağaza + bu sipariş klasörü, traversal yok
    if (
      !filePath ||
      filePath.includes('..') ||
      !filePath.startsWith(`${storeId}/${params.orderId}/`) ||
      !filePath.toLowerCase().endsWith('.pdf')
    ) {
      return NextResponse.json({ error: 'Geçersiz dosya yolu' }, { status: 400 })
    }

    const service = createServiceRoleClient()

    // Mevcut kayıt var mı? (replace ise eski dosyayı sil, bildirimi atla)
    const { data: existing } = await (service as any)
      .from('order_invoices')
      .select('id, file_path')
      .eq('order_id', params.orderId)
      .eq('store_id', storeId)
      .maybeSingle()

    const now = new Date().toISOString()
    const { data: saved, error: upsertError } = await (service as any)
      .from('order_invoices')
      .upsert(
        {
          order_id: params.orderId,
          store_id: storeId,
          file_path: filePath,
          file_size_bytes: fileSize,
          mime_type: 'application/pdf',
          invoice_number: invoiceNumber,
          uploaded_by: user.id,
          uploaded_at: now,
          ...(existing ? { replaced_at: now } : {}),
        },
        { onConflict: 'order_id,store_id' }
      )
      .select()
      .single()
    if (upsertError) throw upsertError

    if (existing?.file_path && existing.file_path !== filePath) {
      // Yanlış PDF değiştirildi — eski dosyayı temizle (hata kritik değil)
      const { error: removeError } = await service.storage.from('invoices').remove([existing.file_path])
      if (removeError) console.warn('[invoice] eski dosya silinemedi:', removeError.message)
    }

    // İlk yüklemede müşteriye bildirim + e-posta
    if (!existing) {
      const { data: order } = await (service as any)
        .from('orders')
        .select('id, order_number, user_id, email')
        .eq('id', params.orderId)
        .maybeSingle()
      const { data: store } = await (service as any)
        .from('stores')
        .select('store_name')
        .eq('id', storeId)
        .maybeSingle()

      if (order) {
        const orderUrl = `https://novagross.com/hesabim/siparislerim/${order.id}`
        if (order.user_id) {
          await (service as any).from('user_notifications').insert({
            user_id: order.user_id,
            type: 'invoice',
            title: `#${order.order_number} siparişinizin faturası hazır 📄`,
            body: `${store?.store_name || 'Satıcı'} faturanızı yükledi. Sipariş detayından indirebilirsiniz.`,
            link: `/hesabim/siparislerim/${order.id}`,
          })
        }
        if (order.email) {
          await (service as any).from('email_queue').insert({
            recipient: order.email,
            template: 'orders/invoice-uploaded',
            subject: `#${order.order_number} siparişinizin faturası hazır`,
            data: {
              orderNumber: order.order_number,
              storeName: store?.store_name || 'Satıcı',
              orderUrl,
            },
            priority: 'medium',
            scheduled_at: now,
            status: 'pending',
          })
        }
      }
    }

    return NextResponse.json({ success: true, invoice: saved })
  } catch (e: any) {
    console.error('[invoice] hata', e)
    return NextResponse.json({ error: e.message || 'Beklenmeyen hata' }, { status: 500 })
  }
}

/** Satıcının kendi faturasını görüntülemesi için kısa ömürlü signed URL. */
export async function GET(_request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }
    const ownership = await assertSellerOwnsOrder(supabase, auth.user.id, params.orderId)
    if (!ownership.ok || !ownership.storeId) {
      return NextResponse.json({ error: 'Bu siparişe erişim yetkiniz yok' }, { status: 403 })
    }

    const { data: invoice } = await (supabase as any)
      .from('order_invoices')
      .select('id, file_path, invoice_number, uploaded_at')
      .eq('order_id', params.orderId)
      .eq('store_id', ownership.storeId)
      .maybeSingle()
    if (!invoice) {
      return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('invoices')
      .createSignedUrl(invoice.file_path, 60 * 10)
    if (signError || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Fatura bağlantısı oluşturulamadı' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      invoice: { ...invoice, url: signed.signedUrl },
    })
  } catch (e: any) {
    console.error('[invoice] GET hata', e)
    return NextResponse.json({ error: e.message || 'Beklenmeyen hata' }, { status: 500 })
  }
}
