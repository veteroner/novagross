export const fmtTRY = (n: number | string | null | undefined) =>
  `₺${Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const fmtDate = (iso: string | null | undefined, withTime = false) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return withTime
    ? d.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'şimdi'
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`
  return `${Math.floor(s / 86400)} gün önce`
}

// order_shipments.status → etiket
export const SHIPMENT_STATUS: Record<string, string> = {
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoya verildi',
  in_transit: 'Yolda',
  out_for_delivery: 'Dağıtımda',
  delivered: 'Teslim edildi',
  failed: 'Teslim edilemedi',
  returned: 'İade dönüyor',
  cancelled: 'İptal',
}

export const ORDER_STATUS: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  processing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim edildi',
  cancelled: 'İptal',
  refunded: 'İade edildi',
}
