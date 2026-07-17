import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertSellerOwnsOrder } from '@/lib/order-ownership'

export const runtime = 'nodejs'

/**
 * MNG'nin resmi etiketini (ZPL, order_shipments.label_zpl) Labelary'nin
 * halka açık ZPL→PNG servisiyle görsele çevirip döner. Kendi çizdiğimiz
 * Code128 yerine bunu kullanmak gerekiyor — MNG'nin resmi etiketinde şube
 * için gerekli yönlendirme bilgileri (DK kodu, hat adı, şube) var, bizim
 * basit etiketimizde yok; bu yüzden şube barkodu/etiketi reddedebiliyor.
 *
 * NOT: ZPL alıcı ad/adres/telefon içerir — bu veri Labelary'ye (3. parti)
 * gönderilir. Kullanıcıya bu konuda açıkça onay alındıktan sonra eklendi.
 */
export async function GET(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    const ownership = await assertSellerOwnsOrder(supabase, user.id, params.orderId)
    if (!ownership.ok) {
      return NextResponse.json({ error: 'Bu siparişe erişim yetkiniz yok' }, { status: 403 })
    }

    const { data: shipment, error: shipmentError } = await (supabase as any)
      .from('order_shipments')
      .select('label_zpl')
      .eq('order_id', params.orderId)
      .maybeSingle()

    if (shipmentError || !shipment?.label_zpl) {
      return NextResponse.json({ error: 'Resmi MNG etiketi henüz alınamadı' }, { status: 404 })
    }

    // Etiket boyutu ZPL'deki ^PW (print width) / ^LL (label length) alanlarından
    // (203dpi = 8 nokta/mm varsayımıyla) çıkarılıyor; bulunamazsa 4x6" varsayılan.
    const zpl: string = shipment.label_zpl
    const pw = Number(zpl.match(/\^PW(\d+)/)?.[1] || 0)
    const ll = Number(zpl.match(/\^LL(\d+)/)?.[1] || 0)
    const widthIn = pw ? (pw / 203).toFixed(2) : '4'
    const heightIn = ll ? (ll / 203).toFixed(2) : '6'

    const labelaryRes = await fetch(
      `https://api.labelary.com/v1/printers/8dpmm/labels/${widthIn}x${heightIn}/0/`,
      {
        method: 'POST',
        headers: { Accept: 'image/png', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: zpl,
      }
    )

    if (!labelaryRes.ok) {
      const text = await labelaryRes.text().catch(() => '')
      console.error('[label] Labelary hata', labelaryRes.status, text.slice(0, 300))
      return NextResponse.json({ error: 'Etiket görseli oluşturulamadı' }, { status: 502 })
    }

    const png = await labelaryRes.arrayBuffer()
    return new NextResponse(png, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600' },
    })
  } catch (e: any) {
    console.error('[label] hata', e)
    return NextResponse.json({ error: e.message || 'Beklenmeyen hata' }, { status: 500 })
  }
}
