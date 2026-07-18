'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@novagross/ui'
import { Button } from '@novagross/ui'
import { ShoppingCart, Package, Truck, CheckCircle, XCircle, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { safeExternalUrl } from '@novagross/utils'
import { code128Svg } from '@/lib/code128'
import { InvoiceDialog } from './invoice-dialog'

export default function SellerOrders() {
  const [orders, setOrders] = useState<any[]>([])
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeInfo, setStoreInfo] = useState<{ store_name: string; address: string | null; city: string | null; district: string | null; phone: string | null } | null>(null)
  const [invoicesByOrderId, setInvoicesByOrderId] = useState<Record<string, any>>({})
  const [invoiceDialogOrderId, setInvoiceDialogOrderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [carriers, setCarriers] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [methods, setMethods] = useState<Array<{ id: string; name: string; code: string; carrier_id: string }>>([])
  const [shipmentsByOrderId, setShipmentsByOrderId] = useState<Record<string, any>>({})
  const [shippingFormOpenForOrderId, setShippingFormOpenForOrderId] = useState<string | null>(null)
  const [shippingForm, setShippingForm] = useState({ carrierId: '', methodId: '', weight: 1, createLabel: true })
  const [shippingSubmittingForOrderId, setShippingSubmittingForOrderId] = useState<string | null>(null)
  const [deliveryProblemsByOrderId, setDeliveryProblemsByOrderId] = useState<Record<string, any>>({})
  const [deliveryProblemAnswer, setDeliveryProblemAnswer] = useState<Record<string, string>>({})
  const [deliveryProblemSubmittingId, setDeliveryProblemSubmittingId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: store } = await supabase
        .from('stores')
        .select('id, store_name, address, city, district, phone')
        .eq('id', ((await (supabase as any).rpc('get_my_store')).data?.[0]?.store_id) ?? '')
        .maybeSingle()

      if (!store) return
      setStoreId((store as any).id)
      setStoreInfo({
        store_name: (store as any).store_name,
        address: (store as any).address,
        city: (store as any).city,
        district: (store as any).district,
        phone: (store as any).phone,
      })

      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          id, quantity, price, name, total,
          order:orders!inner(id, order_number, status, payment_status, created_at, total, email, phone, shipping_address)
        `)
        .eq('store_id', store.id)
        // Yalnızca ödemesi tamamlanmış siparişler satıcıya düşer
        .eq('order.payment_status', 'paid')
        .order('created_at', { ascending: false })

      setOrders(orderItems || [])

      const [{ data: carriersData }, { data: methodsData }] = await Promise.all([
        supabase.from('shipping_carriers').select('id,name,code').order('display_order', { ascending: true }),
        supabase.from('shipping_methods').select('id,name,code,carrier_id').eq('is_active', true),
      ])

      setCarriers((carriersData as any[]) || [])
      setMethods((methodsData as any[]) || [])

      const orderIds = Array.from(new Set((orderItems || []).map((oi: any) => oi.order?.id).filter(Boolean)))
      if (orderIds.length > 0) {
        const { data: shipments } = await supabase
          .from('order_shipments')
          .select('order_id,id,status,tracking_number,tracking_url,shipping_label_url,barcode_data,official_barcode,label_zpl,provider_code,carrier_id,method_id,bill_of_landing_id,shipped_at')
          .in('order_id', orderIds)

        const next: Record<string, any> = {}
        for (const s of shipments || []) next[(s as any).order_id] = s
        setShipmentsByOrderId(next)

        const { data: problems } = await (supabase as any)
          .from('delivery_problems')
          .select('id, order_id, mng_shipment_id, problem_description, status, created_at')
          .in('order_id', orderIds)
          .eq('status', 'pending')
        const nextProblems: Record<string, any> = {}
        for (const p of problems || []) nextProblems[p.order_id] = p
        setDeliveryProblemsByOrderId(nextProblems)

        // Sipariş faturaları (RLS satıcının kendi store'una kısıtlar)
        const { data: invoices } = await (supabase as any)
          .from('order_invoices')
          .select('id, order_id, invoice_number, uploaded_at')
          .in('order_id', orderIds)
          .eq('store_id', store.id)
        const nextInvoices: Record<string, any> = {}
        for (const inv of invoices || []) nextInvoices[inv.order_id] = inv
        setInvoicesByOrderId(nextInvoices)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const answerDeliveryProblem = async (problemId: string, approve: boolean) => {
    const text = (deliveryProblemAnswer[problemId] || '').trim()
    if (text.length < 3) {
      alert('Lütfen en az 3 karakterlik bir yanıt yazın')
      return
    }
    setDeliveryProblemSubmittingId(problemId)
    try {
      const res = await fetch('/api/delivery-problems/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, approve, answer: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Yanıt gönderilemedi')
      await fetchOrders()
    } catch (e: any) {
      alert(e?.message || 'Yanıt gönderilemedi')
    } finally {
      setDeliveryProblemSubmittingId(null)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const supabase = createClient()
      await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
      fetchOrders()
    } catch (error) {
      console.error('Failed to update order status:', error)
    }
  }

  const createShipment = async (orderId: string) => {
    try {
      if (!shippingForm.carrierId || !shippingForm.methodId) {
        alert('Lütfen kargo firması ve yöntemi seçin')
        return
      }
      setShippingSubmittingForOrderId(orderId)

      const res = await fetch(`/api/orders/${orderId}/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrierId: shippingForm.carrierId,
          methodId: shippingForm.methodId,
          provider: 'mock',
          weight: shippingForm.weight,
          pieceCount: 1,
          createLabel: shippingForm.createLabel,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Kargo oluşturulamadı')

      // Gerçek kargo API'si hata verip mock'a düştüyse satıcıyı bilgilendir
      if (data?.cargoApiResult?.error) {
        alert(`Uyarı: ${data.cargoApiResult.error}\nGönderi geçici takip numarasıyla oluşturuldu.`)
      }

      setShipmentsByOrderId((prev) => ({ ...prev, [orderId]: data.shipment }))
      setShippingFormOpenForOrderId(null)
      await fetchOrders()
    } catch (e: any) {
      alert(e?.message || 'Kargo oluşturulamadı')
    } finally {
      setShippingSubmittingForOrderId(null)
    }
  }

  const printBarcode = async (orderId: string, orderItem?: any) => {
    const shipment = shipmentsByOrderId[orderId]
    if (!shipment) return
    const barcode = shipment.barcode_data as string | undefined
    const officialBarcode = shipment.official_barcode as string | undefined
    const labelZpl = shipment.label_zpl as string | undefined
    const labelUrl = shipment.shipping_label_url as string | undefined
    const tn = shipment.tracking_number || ''

    // 1) MNG'den gelen resmi etiket/barkod varsa onu kullan
    if (labelUrl && /^https?:\/\//.test(labelUrl) && !labelUrl.includes('example.com')) {
      window.open(labelUrl, '_blank', 'noopener,noreferrer')
      return
    }

    // 1.5) Resmi MNG etiketi (ZPL) varsa görsele çevirip onu bas — DK kodu,
    // hat adı, şube gibi MNG'ye özel yönlendirme bilgilerini içerir; bizim
    // kendi çizdiğimiz barkodda bu alanlar yok ve şube reddedebiliyor.
    if (labelZpl) {
      const w = window.open('', '_blank')
      if (!w) return
      w.document.write(`<body style="text-align:center;font-family:sans-serif;margin:20px">Resmi etiket hazırlanıyor…</body>`)
      try {
        const res = await fetch(`/api/orders/${orderId}/shipment/label`)
        if (!res.ok) throw new Error('Etiket görseli alınamadı')
        const blob = await res.blob()
        const src = URL.createObjectURL(blob)
        w.document.open()
        w.document.write(
          `<body style="text-align:center;margin:0"><img src="${src}" style="max-width:100%" onload="window.print()"/></body>`
        )
        w.document.close()
      } catch (e: any) {
        w.document.open()
        w.document.write(
          `<body style="text-align:center;font-family:sans-serif;margin:20px">Resmi etiket alınamadı: ${e?.message || 'bilinmeyen hata'}<br>Lütfen tekrar deneyin.</body>`
        )
        w.document.close()
      }
      return
    }

    if (barcode) {
      const isPdf = barcode.startsWith('JVBER') // base64 PDF imzası
      const src = isPdf ? `data:application/pdf;base64,${barcode}` : `data:image/png;base64,${barcode}`
      const w = window.open('', '_blank')
      if (!w) return
      w.document.write(
        isPdf
          ? `<iframe src="${src}" style="width:100%;height:100vh;border:0" onload="this.contentWindow.print()"></iframe>`
          : `<body style="text-align:center;font-family:sans-serif"><h3>Takip No: ${tn}</h3><img src="${src}" style="max-width:100%" onload="window.print()"/></body>`
      )
      w.document.close()
      return
    }

    // 2) Yerel kargo etiketi üret. Code128 içeriği MNG'nin RESMİ barkod
    //    değeri olmalı (official_barcode, örn. "C@56@..."). Takip numarasını
    //    basmak MNG şubesinde REDDEDİLİYOR (2026-07-16'da canlıda yaşandı) —
    //    okuyucular yalnızca resmi değeri tanıyor. official_barcode yoksa
    //    son çare takip numarası basılır ama satıcı uyarılır.
    if (!tn) {
      alert('Takip numarası yok — önce kargo oluşturun.')
      return
    }
    const barcodeValue = officialBarcode || tn
    if (!officialBarcode && (shipment.provider_code || '').toLowerCase() === 'mng') {
      alert(
        'DİKKAT: Resmi MNG barkodu henüz alınamadı. Bu etiketteki barkodu MNG şubesi kabul etmeyebilir — önce "Resmi Barkodu Tekrar Dene" butonunu kullanın.'
      )
    }
    const esc = (s: any) =>
      String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const ship = orderItem?.order?.shipping_address || {}
    const receiverName = `${ship.first_name || ''} ${ship.last_name || ''}`.trim() || '—'
    const receiverAddr = [ship.address_line1, ship.district, ship.city].filter(Boolean).join(', ')
    const receiverPhone = ship.phone || orderItem?.order?.phone || ''
    const senderName = storeInfo?.store_name || 'Novagross Satıcısı'
    const senderAddr = [storeInfo?.address, storeInfo?.district, storeInfo?.city].filter(Boolean).join(', ')
    const svg = code128Svg(barcodeValue, { height: 70, module: 2 })

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Kargo Etiketi ${esc(tn)}</title>
<style>
  @page { size: A6 landscape; margin: 6mm; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; color: #000; }
  .label { border: 2px solid #000; border-radius: 6px; padding: 10px 12px; max-width: 560px; }
  .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 6px; }
  .head b { font-size: 18px; }
  .head span { font-size: 12px; }
  .row { display: flex; gap: 10px; margin-top: 8px; }
  .box { flex: 1; border: 1px solid #999; border-radius: 4px; padding: 6px 8px; }
  .box .t { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: .5px; }
  .box .v { font-size: 13px; font-weight: 600; margin-top: 2px; line-height: 1.35; }
  .bc { text-align: center; margin-top: 10px; }
  .meta { display: flex; justify-content: space-between; font-size: 11px; margin-top: 6px; color: #333; }
</style></head><body onload="window.print()">
<div class="label">
  <div class="head"><b>MNG KARGO</b><span>Ödeme: GÖNDERİCİ ÖDER &nbsp;|&nbsp; Sipariş #${esc(orderItem?.order?.order_number || '')}</span></div>
  <div class="row">
    <div class="box"><div class="t">Gönderici</div><div class="v">${esc(senderName)}<br>${esc(senderAddr)}${storeInfo?.phone ? `<br>Tel: ${esc(storeInfo.phone)}` : ''}</div></div>
    <div class="box"><div class="t">Alıcı</div><div class="v">${esc(receiverName)}<br>${esc(receiverAddr)}${receiverPhone ? `<br>Tel: ${esc(receiverPhone)}` : ''}</div></div>
  </div>
  <div class="bc">${svg}<div style="font-size:12px;margin-top:2px;letter-spacing:1px">${esc(barcodeValue)}</div></div>
  <div class="meta"><span>REF/Takip: ${esc(tn)}</span><span>İçerik: ${esc((orderItem?.name || '').slice(0, 30))}</span><span>Adet: ${esc(orderItem?.quantity || 1)}</span><span>${new Date().toLocaleDateString('tr-TR')}</span></div>
</div>
</body></html>`)
    w.document.close()
  }

  const markDelivered = async (orderId: string) => {
    try {
      setShippingSubmittingForOrderId(orderId)
      const res = await fetch(`/api/orders/${orderId}/shipment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered', location: 'Alıcı', description: 'Teslim edildi' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Güncellenemedi')

      setShipmentsByOrderId((prev) => ({ ...prev, [orderId]: data.shipment }))
      await fetchOrders()
    } catch (e: any) {
      alert(e?.message || 'Güncellenemedi')
    } finally {
      setShippingSubmittingForOrderId(null)
    }
  }

  const retryOfficialBarcode = async (orderId: string) => {
    try {
      setShippingSubmittingForOrderId(orderId)
      const res = await fetch(`/api/orders/${orderId}/shipment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry_barcode' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Resmi barkod alınamadı')

      setShipmentsByOrderId((prev) => ({ ...prev, [orderId]: data.shipment }))
      alert('Resmi MNG barkodu alındı.')
    } catch (e: any) {
      alert(e?.message || 'Resmi barkod alınamadı')
    } finally {
      setShippingSubmittingForOrderId(null)
    }
  }

  const cancelShipmentAction = async (orderId: string) => {
    const reason = window.prompt('İptal gerekçesi (müşteriye/kargo firmasına iletilecek):')
    if (reason === null) return // vazgeçildi
    try {
      setShippingSubmittingForOrderId(orderId)
      const res = await fetch(`/api/orders/${orderId}/shipment`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Satıcı iptali' }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data?.canForce) {
          const confirmForce = window.confirm(
            `Kargo firması API'si iptali reddetti:\n"${data.error}"\n\n` +
              'Kargo firmasıyla telefon/portal üzerinden MANUEL olarak iletişime geçip gönderiyi durdurduysanız, ' +
              'sistemde bu siparişi yine de iptal olarak işaretleyebiliriz.\n\n' +
              'Gönderiyi kargo firmasıyla manuel olarak durdurdunuz mu?'
          )
          if (!confirmForce) return
          const res2 = await fetch(`/api/orders/${orderId}/shipment`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: reason || 'Satıcı iptali', force: true }),
          })
          const data2 = await res2.json()
          if (!res2.ok) throw new Error(data2?.error || 'İptal edilemedi')
          setShipmentsByOrderId((prev) => ({ ...prev, [orderId]: data2.shipment }))
          await fetchOrders()
          alert('Kargo sistemde iptal olarak işaretlendi (manuel).')
          return
        }
        throw new Error(data?.error || 'İptal edilemedi')
      }

      setShipmentsByOrderId((prev) => ({ ...prev, [orderId]: data.shipment }))
      await fetchOrders()
      alert('Kargo iptal edildi.')
    } catch (e: any) {
      alert(e?.message || 'İptal edilemedi')
    } finally {
      setShippingSubmittingForOrderId(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ShoppingCart className="w-5 h-5 text-yellow-600" />
      case 'processing': return <Package className="w-5 h-5 text-blue-600" />
      case 'shipped': return <Truck className="w-5 h-5 text-purple-600" />
      case 'delivered': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'cancelled': return <XCircle className="w-5 h-5 text-red-600" />
      default: return <ShoppingCart className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      pending: 'Beklemede', processing: 'İşleniyor', shipped: 'Kargoda',
      delivered: 'Teslim Edildi', cancelled: 'İptal Edildi',
    }
    return map[status] || status
  }

  // order_shipments.status enum → HB tarzı Türkçe kargo durumu etiketi + renk
  const shipmentStatusMeta = (status: string): { label: string; cls: string } => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: 'Kargo Bekliyor', cls: 'bg-gray-100 text-gray-700' },
      preparing: { label: 'Hazırlanıyor', cls: 'bg-blue-100 text-blue-700' },
      shipped: { label: 'Kargoya Verildi', cls: 'bg-purple-100 text-purple-700' },
      in_transit: { label: 'Yolda (Transfer)', cls: 'bg-indigo-100 text-indigo-700' },
      out_for_delivery: { label: 'Dağıtımda', cls: 'bg-amber-100 text-amber-800' },
      delivered: { label: 'Teslim Edildi', cls: 'bg-green-100 text-green-700' },
      failed: { label: 'Teslim Edilemedi / İptal', cls: 'bg-red-100 text-red-700' },
      returned: { label: 'İ­ade / Geri Dönüyor', cls: 'bg-orange-100 text-orange-700' },
    }
    return map[status] || { label: status, cls: 'bg-gray-100 text-gray-700' }
  }

  // Fatura yükleme yükümlülüğü: kargolamadan itibaren 7 gün (VUK ile uyumlu).
  // Kalan gün <= 0 ise gecikmiş demektir.
  const invoiceDeadlineDays = (orderId: string): number | null => {
    const shippedAt = shipmentsByOrderId[orderId]?.shipped_at
    if (!shippedAt) return null
    const due = new Date(shippedAt).getTime() + 7 * 24 * 60 * 60 * 1000
    return Math.ceil((due - Date.now()) / (24 * 60 * 60 * 1000))
  }

  const viewInvoice = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/invoice`)
      const data = await res.json()
      if (!res.ok || !data?.invoice?.url) throw new Error(data?.error || 'Fatura açılamadı')
      window.open(data.invoice.url, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      alert(e?.message || 'Fatura açılamadı')
    }
  }

  // Faturası eksik kargolanmış/teslim edilmiş siparişler (uyarı banner'ı için)
  const missingInvoiceOrderIds = Array.from(
    new Set(
      orders
        .filter((o) => ['shipped', 'delivered'].includes(o.order?.status) && !invoicesByOrderId[o.order?.id])
        .map((o) => o.order.id)
    )
  )

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => o.order.status === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Siparişlerim</h1>
        <p className="text-gray-600">{orders.length} sipariş</p>
      </div>

      {missingInvoiceOrderIds.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <FileText className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <b>{missingInvoiceOrderIds.length} siparişin faturası eksik.</b> Kargolanan siparişlerin
            e-Arşiv faturasını yasal süre içinde (kargolamadan itibaren 7 gün) sisteme yüklemeniz
            gerekir. İlgili siparişin altındaki “Fatura Yükle” butonunu kullanın.
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'Tümü' },
              { key: 'pending', label: 'Beklemede' },
              { key: 'processing', label: 'İşleniyor' },
              { key: 'shipped', label: 'Kargoda' },
              { key: 'delivered', label: 'Teslim Edildi' },
            ].map(f => (
              <Button
                key={f.key}
                variant={filter === f.key ? 'default' : 'outline'}
                onClick={() => setFilter(f.key)}
                size="sm"
              >
                {f.label} ({f.key === 'all' ? orders.length : orders.filter((o) => o.order.status === f.key).length})
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{filter === 'all' ? 'Henüz sipariş yok' : 'Bu durumda sipariş bulunamadı'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((orderItem) => (
            <Card key={orderItem.id}>
              <CardContent className="pt-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(orderItem.order.status)}
                    <div>
                      <p className="font-semibold">Sipariş #{orderItem.order.order_number || orderItem.order.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-600">{new Date(orderItem.order.created_at).toLocaleString('tr-TR')}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    orderItem.order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    orderItem.order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                    orderItem.order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    orderItem.order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getStatusText(orderItem.order.status)}
                  </span>
                </div>

                {/* Product Info */}
                <div className="flex items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{orderItem.name}</p>
                    <p className="text-sm text-gray-600">Adet: {orderItem.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₺{Number(orderItem.total || (orderItem.price * orderItem.quantity)).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">Birim: ₺{orderItem.price.toFixed(2)}</p>
                  </div>
                </div>

                {/* Customer / Shipping Info */}
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2">Teslimat Bilgileri:</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{orderItem.order.email}</p>
                    <p>{orderItem.order.phone}</p>
                    {orderItem.order.shipping_address && (
                      <p>
                        {[
                          (orderItem.order.shipping_address as any)?.address_line1 || (orderItem.order.shipping_address as any)?.address,
                          (orderItem.order.shipping_address as any)?.district,
                          (orderItem.order.shipping_address as any)?.city,
                        ].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Teslimat sorunu bildirimi — MNG kurye/şubenin bildirdiği sorun, yanıt bekliyor */}
                {deliveryProblemsByOrderId[orderItem.order.id] && (
                  <div className="mb-4 p-3 border border-yellow-300 rounded-lg bg-yellow-50">
                    <p className="text-sm font-semibold mb-1 text-yellow-800">⚠️ Kargo Teslimat Sorunu — Yanıt Bekliyor</p>
                    {deliveryProblemsByOrderId[orderItem.order.id].problem_description && (
                      <p className="text-sm text-yellow-900 mb-2">
                        {deliveryProblemsByOrderId[orderItem.order.id].problem_description}
                      </p>
                    )}
                    <textarea
                      className="w-full text-sm border rounded px-2 py-1.5 mb-2"
                      rows={2}
                      placeholder="Yanıtınız (kuryeye/şubeye iletilecek)"
                      value={deliveryProblemAnswer[deliveryProblemsByOrderId[orderItem.order.id].id] || ''}
                      onChange={(e) =>
                        setDeliveryProblemAnswer((prev) => ({
                          ...prev,
                          [deliveryProblemsByOrderId[orderItem.order.id].id]: e.target.value,
                        }))
                      }
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={deliveryProblemSubmittingId === deliveryProblemsByOrderId[orderItem.order.id].id}
                        onClick={() => answerDeliveryProblem(deliveryProblemsByOrderId[orderItem.order.id].id, true)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        ✅ Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deliveryProblemSubmittingId === deliveryProblemsByOrderId[orderItem.order.id].id}
                        onClick={() => answerDeliveryProblem(deliveryProblemsByOrderId[orderItem.order.id].id, false)}
                        className="text-red-600 border-red-300"
                      >
                        ❌ Reddet
                      </Button>
                    </div>
                  </div>
                )}

                {/* Shipping status */}
                {shipmentsByOrderId[orderItem.order.id] && (
                  <div className="mb-4 p-3 border rounded-lg bg-white">
                    <p className="text-sm font-semibold mb-1">Kargo:</p>
                    <div className="text-sm text-gray-700">
                      <div className="flex items-center gap-2 mb-1">
                        <span>Durum:</span>
                        {(() => {
                          const meta = shipmentStatusMeta(shipmentsByOrderId[orderItem.order.id].status)
                          return (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.cls}`}>
                              {meta.label}
                            </span>
                          )
                        })()}
                      </div>
                      {shipmentsByOrderId[orderItem.order.id].tracking_number && (
                        <div>Takip No: <span className="font-mono">{shipmentsByOrderId[orderItem.order.id].tracking_number}</span></div>
                      )}
                      {shipmentsByOrderId[orderItem.order.id].bill_of_landing_id && (
                        <div>İrsaliye No: <span className="font-mono">{shipmentsByOrderId[orderItem.order.id].bill_of_landing_id}</span></div>
                      )}
                      {(() => {
                        const tu = safeExternalUrl(shipmentsByOrderId[orderItem.order.id].tracking_url)
                        return tu ? (
                          <a className="text-blue-600 underline" href={tu} target="_blank" rel="noreferrer">Takip Linki</a>
                        ) : null
                      })()}
                      {(() => {
                        const s = shipmentsByOrderId[orderItem.order.id]
                        // Takip no varsa her zaman etiket basılabilir:
                        // MNG barkodu varsa o, yoksa yerel Code128 etiketi üretilir
                        return s.tracking_number ? (
                          <button
                            onClick={() => printBarcode(orderItem.order.id, orderItem)}
                            className="mt-1 inline-flex items-center gap-1 rounded bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700"
                          >
                            🖨️ Kargo Etiketi Yazdır
                          </button>
                        ) : null
                      })()}
                      {(() => {
                        const s = shipmentsByOrderId[orderItem.order.id]
                        // Resmi MNG barkodu henüz gelmediyse (hesap izni vb.
                        // yüzünden) yeniden deneme imkanı — gönderiyi yeniden
                        // oluşturmadan yalnızca barkodu tekrar ister.
                        return s.tracking_number && !s.barcode_data && !s.official_barcode ? (
                          <button
                            onClick={() => retryOfficialBarcode(orderItem.order.id)}
                            disabled={shippingSubmittingForOrderId === orderItem.order.id}
                            className="mt-1 ml-2 inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            🔄 Resmi Barkodu Tekrar Dene
                          </button>
                        ) : null
                      })()}
                    </div>
                  </div>
                )}

                {/* Fatura (kargolanmış/teslim edilmiş siparişlerde) */}
                {['shipped', 'delivered'].includes(orderItem.order.status) && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    {invoicesByOrderId[orderItem.order.id] ? (
                      <>
                        <button
                          onClick={() => viewInvoice(orderItem.order.id)}
                          className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                        >
                          <FileText className="h-3.5 w-3.5" /> Fatura
                        </button>
                        <button
                          onClick={() => setInvoiceDialogOrderId(orderItem.order.id)}
                          className="inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Değiştir
                        </button>
                        <span className="text-xs text-gray-500">
                          Yüklendi: {new Date(invoicesByOrderId[orderItem.order.id].uploaded_at).toLocaleDateString('tr-TR')}
                        </span>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setInvoiceDialogOrderId(orderItem.order.id)}
                          className="inline-flex items-center gap-1 rounded bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
                        >
                          <FileText className="h-3.5 w-3.5" /> Fatura Yükle
                        </button>
                        {(() => {
                          const days = invoiceDeadlineDays(orderItem.order.id)
                          if (days === null) return null
                          return days > 0 ? (
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${days <= 3 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                              Son {days} gün
                            </span>
                          ) : (
                            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              Gecikti ({Math.abs(days)} gün)
                            </span>
                          )
                        })()}
                      </>
                    )}
                  </div>
                )}

                {/* Actions */}
                {orderItem.order.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button onClick={() => updateOrderStatus(orderItem.order.id, 'processing')} className="flex-1">
                      Hazırlanıyor Olarak İşaretle
                    </Button>
                    <Button variant="outline" onClick={() => updateOrderStatus(orderItem.order.id, 'cancelled')} className="text-red-600">
                      İptal Et
                    </Button>
                  </div>
                )}

                {orderItem.order.status === 'processing' && (
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        setShippingFormOpenForOrderId((prev) => (prev === orderItem.order.id ? null : orderItem.order.id))
                        const defaultCarrier = carriers[0]?.id || ''
                        const defaultMethod = methods.find((m) => m.carrier_id === defaultCarrier)?.id || methods[0]?.id || ''
                        setShippingForm({ carrierId: defaultCarrier, methodId: defaultMethod, weight: 1, createLabel: true })
                      }}
                      className="w-full"
                      disabled={shippingSubmittingForOrderId === orderItem.order.id}
                    >
                      Kargo Oluştur
                    </Button>

                    {shippingFormOpenForOrderId === orderItem.order.id && (
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-700">Kargo Firması</label>
                            <select
                              className="w-full mt-1 px-2 py-2 border rounded"
                              value={shippingForm.carrierId}
                              onChange={(e) => {
                                const nextCarrierId = e.target.value
                                const nextMethodId = methods.find((m) => m.carrier_id === nextCarrierId)?.id || ''
                                setShippingForm((p) => ({ ...p, carrierId: nextCarrierId, methodId: nextMethodId }))
                              }}
                            >
                              <option value="">Seçiniz</option>
                              {carriers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700">Yöntem</label>
                            <select
                              className="w-full mt-1 px-2 py-2 border rounded"
                              value={shippingForm.methodId}
                              onChange={(e) => setShippingForm((p) => ({ ...p, methodId: e.target.value }))}
                            >
                              <option value="">Seçiniz</option>
                              {methods.filter((m) => !shippingForm.carrierId || m.carrier_id === shippingForm.carrierId).map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700">Ağırlık (kg)</label>
                            <input
                              type="number" min={0.1} step={0.1}
                              className="w-full mt-1 px-2 py-2 border rounded"
                              value={shippingForm.weight}
                              onChange={(e) => setShippingForm((p) => ({ ...p, weight: Number(e.target.value) }))}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <input
                            id={`createLabel-${orderItem.order.id}`}
                            type="checkbox"
                            checked={shippingForm.createLabel}
                            onChange={(e) => setShippingForm((p) => ({ ...p, createLabel: e.target.checked }))}
                          />
                          <label htmlFor={`createLabel-${orderItem.order.id}`} className="text-sm text-gray-700">
                            Takip numarası + etiket üret
                          </label>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={() => createShipment(orderItem.order.id)}
                            disabled={shippingSubmittingForOrderId === orderItem.order.id}
                            className="flex-1"
                          >
                            {shippingSubmittingForOrderId === orderItem.order.id ? 'Oluşturuluyor...' : 'Kargoya Ver'}
                          </Button>
                          <Button variant="outline" onClick={() => setShippingFormOpenForOrderId(null)} disabled={shippingSubmittingForOrderId === orderItem.order.id}>
                            Kapat
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {orderItem.order.status === 'shipped' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => markDelivered(orderItem.order.id)}
                      className="flex-1"
                      disabled={shippingSubmittingForOrderId === orderItem.order.id}
                    >
                      Teslim Edildi Olarak İşaretle
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => cancelShipmentAction(orderItem.order.id)}
                      disabled={shippingSubmittingForOrderId === orderItem.order.id}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Kargoyu İptal Et
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {invoiceDialogOrderId && storeId && (
        <InvoiceDialog
          orderId={invoiceDialogOrderId}
          orderNumber={orders.find((o) => o.order?.id === invoiceDialogOrderId)?.order?.order_number || ''}
          storeId={storeId}
          existing={Boolean(invoicesByOrderId[invoiceDialogOrderId])}
          onDone={() => {
            setInvoiceDialogOrderId(null)
            fetchOrders()
          }}
          onClose={() => setInvoiceDialogOrderId(null)}
        />
      )}
    </div>
  )
}
