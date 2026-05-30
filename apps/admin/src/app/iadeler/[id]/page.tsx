import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import { ReturnActions } from './ReturnActions'

export const dynamic = 'force-dynamic'

function formatTry(n: number) {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)
  } catch {
    return `${n.toFixed(2)} ₺`
  }
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })
}

const REASON_LABELS: Record<string, string> = {
  defective: 'Ürün arızalı / bozuk',
  wrong_item: 'Yanlış ürün gönderildi',
  not_as_described: 'Açıklamaya uygun değil',
  damaged_in_shipping: 'Kargoda hasar gördü',
  changed_mind: 'Fikrim değişti',
  late_delivery: 'Geç teslim edildi',
  other: 'Diğer',
}

export default async function ReturnDetailPage({ params }: { params: { id: string } }) {
  const { userId } = await requireAdmin(`/iadeler/${params.id}`)
  const supabase = createServiceRoleClient()

  const { data: r, error } = await (supabase as any)
    .from('return_requests')
    .select(`
      *,
      orders ( id, order_number, total, delivered_at, return_deadline ),
      order_items ( id, name, price, quantity, total ),
      stores ( id, store_name, iban, bank_name, account_holder )
    `)
    .eq('id', params.id)
    .single()

  if (error || !r) {
    notFound()
  }

  // Müşteri bilgisi
  const { data: customer } = await supabase
    .from('profiles')
    .select('email, first_name, last_name, phone')
    .eq('id', r.user_id)
    .single()

  // İlgili sale transaction (satıcıya ödendi mi?)
  const { data: saleTx } = await (supabase as any)
    .from('store_transactions')
    .select('id, amount, is_paid, payout_date, description')
    .eq('order_id', r.order_id)
    .eq('order_item_id', r.order_item_id)
    .eq('type', 'sale')
    .maybeSingle()

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/iadeler" className="text-blue-600 hover:underline text-sm">
          ← İadeler
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            İade Talebi
            <Badge variant="secondary" className="ml-2 font-mono text-xs">
              #{r.id.slice(0, 8)}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Talep: {formatDate(r.created_at)}</p>
        </div>
        <span
          className={`px-3 py-1 rounded text-sm font-medium ${
            r.status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : r.status === 'approved'
              ? 'bg-blue-100 text-blue-800'
              : r.status === 'refunded'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {r.status === 'pending' && 'İncelemede'}
          {r.status === 'approved' && 'Onaylandı'}
          {r.status === 'refunded' && 'İade tamamlandı'}
          {r.status === 'rejected' && 'Reddedildi'}
          {r.status === 'cancelled' && 'İptal edildi'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Sipariş</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <strong>Numara:</strong> {r.orders?.order_number ?? r.order_id}
            </p>
            <p>
              <strong>Teslim Tarihi:</strong> {formatDate(r.orders?.delivered_at)}
            </p>
            <p>
              <strong>İade Son Tarihi:</strong> {formatDate(r.orders?.return_deadline)}
            </p>
            <p>
              <strong>Toplam:</strong> {formatTry(Number(r.orders?.total) || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Müşteri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <strong>İsim:</strong>{' '}
              {customer
                ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || '—'
                : '—'}
            </p>
            <p>
              <strong>E-posta:</strong> {customer?.email ?? '—'}
            </p>
            <p>
              <strong>Telefon:</strong> {customer?.phone ?? '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>İade Edilen Ürün</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <strong>Ürün:</strong> {r.order_items?.name ?? '—'}
          </p>
          <p>
            <strong>Birim fiyat:</strong> {formatTry(Number(r.order_items?.price) || 0)}
          </p>
          <p>
            <strong>İade adedi:</strong> {r.quantity} (toplam siparişte {r.order_items?.quantity})
          </p>
          <p>
            <strong>İade tutarı:</strong>{' '}
            <span className="text-lg font-semibold">{formatTry(Number(r.refund_amount) || 0)}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>İade Nedeni</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Kategori:</strong> {REASON_LABELS[r.reason_category] ?? r.reason_category}
          </p>
          <p>
            <strong>Açıklama:</strong>
          </p>
          <p className="p-3 bg-gray-50 rounded">{r.reason}</p>
          {r.customer_note ? (
            <>
              <p>
                <strong>Müşteri notu:</strong>
              </p>
              <p className="p-3 bg-gray-50 rounded">{r.customer_note}</p>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Satıcı Ödeme Durumu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <strong>Mağaza:</strong> {r.stores?.store_name ?? '—'}
          </p>
          {saleTx ? (
            <>
              <p>
                <strong>Satıcıya ödenecek tutar:</strong>{' '}
                {formatTry(Number(saleTx.amount) || 0)}
              </p>
              <p>
                <strong>Ödeme durumu:</strong>{' '}
                {saleTx.is_paid ? (
                  <span className="text-red-700">
                    ⚠️ Zaten ödenmiş — manuel olarak satıcıdan geri talep edilmeli
                  </span>
                ) : (
                  <span className="text-green-700">
                    ✅ Henüz ödenmedi — onayda otomatik pending bakiyeden düşülecek
                  </span>
                )}
              </p>
              <p>
                <strong>Planlanmış ödeme tarihi:</strong> {formatDate(saleTx.payout_date)}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Satıcı transaction kaydı bulunamadı</p>
          )}
        </CardContent>
      </Card>

      {r.status === 'pending' ? <ReturnActions requestId={r.id} adminId={userId} /> : null}

      {r.status === 'approved' || r.status === 'refunded' ? (
        <Card>
          <CardHeader>
            <CardTitle>Onay Bilgisi</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              <strong>Onaylanma:</strong> {formatDate(r.reviewed_at)}
            </p>
            {r.admin_note ? (
              <p>
                <strong>Admin notu:</strong> {r.admin_note}
              </p>
            ) : null}
            {r.refunded_at ? (
              <p>
                <strong>Para iadesi tarihi:</strong> {formatDate(r.refunded_at)}
              </p>
            ) : null}
            {r.iyzico_refund_id ? (
              <p>
                <strong>iyzico refund ID:</strong>{' '}
                <span className="font-mono">{r.iyzico_refund_id}</span>
              </p>
            ) : null}
            {r.status === 'approved' && !r.refunded_at ? (
              <ReturnActions requestId={r.id} adminId={userId} markRefundedOnly />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {r.status === 'rejected' ? (
        <Card>
          <CardHeader>
            <CardTitle>Red Bilgisi</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              <strong>Red tarihi:</strong> {formatDate(r.reviewed_at)}
            </p>
            <p>
              <strong>Red gerekçesi:</strong> {r.rejection_reason ?? '—'}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
