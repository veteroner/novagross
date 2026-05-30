import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, Badge, StatCard } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  Wallet,
  MapPin,
  Star,
  CheckCircle2,
  Package,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatPrice(n: number) {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${n.toFixed(2)} ₺`
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const orderStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Onaylandı', color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Hazırlanıyor', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Kargoda', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Teslim Edildi', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'İptal', color: 'bg-red-100 text-red-800' },
  refunded: { label: 'İade', color: 'bg-gray-100 text-gray-800' },
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await requireAdmin(`/musteriler/${id}`)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'id, email, first_name, last_name, phone, role, is_seller, metadata, created_at, updated_at'
    )
    .eq('id', id)
    .single()

  if (profileError || !profile) {
    notFound()
  }

  const [
    { data: orders },
    { data: addresses },
    { data: productReviews },
    { data: storeReviews },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select(
        'id, order_number, status, payment_status, total, currency, created_at'
      )
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('addresses')
      .select(
        'id, title, first_name, last_name, phone, address_line1, address_line2, city, district, postal_code, country, is_default, address_type'
      )
      .eq('user_id', id)
      .order('is_default', { ascending: false }),
    supabase
      .from('reviews')
      .select(
        'id, rating, title, comment, is_approved, created_at, product:product_id ( id, name )'
      )
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('store_reviews')
      .select(
        'id, rating, title, comment, is_hidden, created_at, store:store_id ( id, store_name )'
      )
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const orderList = orders ?? []
  const totalSpend = orderList
    .filter((o) => o.payment_status === 'paid' || o.status === 'delivered')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'İsimsiz'
  const initials =
    ([profile.first_name, profile.last_name].filter(Boolean) as string[])
      .map((s) => s.charAt(0).toUpperCase())
      .join('') || (profile.email?.charAt(0) ?? '?').toUpperCase()

  const metadata = (profile.metadata ?? {}) as Record<string, any>
  const newsletter = Boolean(metadata.newsletter_subscribed)
  const emailNotif = metadata.email_notifications !== false
  const smsNotif = Boolean(metadata.sms_notifications)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/musteriler"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Müşterilere Dön
        </Link>
      </div>

      {/* Profile header */}
      <Card className="p-6">
        <div className="flex items-start gap-6">
          <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-semibold shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                  <a
                    href={`mailto:${profile.email}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Mail className="h-3 w-3" />
                    {profile.email}
                  </a>
                  {profile.phone && (
                    <a
                      href={`tel:${profile.phone}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      {profile.phone}
                    </a>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Üyelik: {formatDate(profile.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">
                  {profile.role === 'admin'
                    ? 'Admin'
                    : profile.role === 'super_admin'
                    ? 'Süper Admin'
                    : 'Müşteri'}
                </Badge>
                {profile.is_seller && <Badge>Satıcı</Badge>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Sipariş" value={orderList.length} icon={ShoppingBag} iconColor="text-blue-500" />
        <StatCard
          label="Toplam Harcama"
          value={formatPrice(totalSpend)}
          icon={Wallet}
          iconColor="text-green-500"
        />
        <StatCard
          label="Yorum"
          value={(productReviews?.length ?? 0) + (storeReviews?.length ?? 0)}
          icon={Star}
          iconColor="text-yellow-500"
        />
        <StatCard
          label="Adres"
          value={addresses?.length ?? 0}
          icon={MapPin}
          iconColor="text-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders */}
        <Card className="lg:col-span-2 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Sipariş Geçmişi
          </h2>
          {orderList.length === 0 ? (
            <p className="text-gray-500 text-sm">Bu müşterinin henüz siparişi yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-gray-600">
                  <tr>
                    <th className="text-left py-2 px-2 font-medium">Sipariş No</th>
                    <th className="text-left py-2 px-2 font-medium">Tarih</th>
                    <th className="text-right py-2 px-2 font-medium">Tutar</th>
                    <th className="text-left py-2 px-2 font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {orderList.map((o) => {
                    const status = o.status ?? 'pending'
                    const meta = orderStatusLabels[status] ?? {
                      label: status,
                      color: 'bg-gray-100 text-gray-800',
                    }
                    return (
                      <tr key={o.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">
                          <Link
                            href={`/siparisler/${o.id}`}
                            className="text-primary hover:underline font-mono"
                          >
                            {o.order_number}
                          </Link>
                        </td>
                        <td className="py-2 px-2 text-gray-600">{formatDate(o.created_at)}</td>
                        <td className="py-2 px-2 text-right font-medium">
                          {formatPrice(Number(o.total) || 0)}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Preferences + addresses */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Tercihler</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-gray-600">Bülten</span>
                {newsletter ? (
                  <Badge variant="success">Abone</Badge>
                ) : (
                  <Badge variant="outline">Abone değil</Badge>
                )}
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-600">E-posta bildirimleri</span>
                {emailNotif ? (
                  <Badge variant="success">Açık</Badge>
                ) : (
                  <Badge variant="outline">Kapalı</Badge>
                )}
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-600">SMS bildirimleri</span>
                {smsNotif ? (
                  <Badge variant="success">Açık</Badge>
                ) : (
                  <Badge variant="outline">Kapalı</Badge>
                )}
              </li>
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Adresler
            </h2>
            {!addresses || addresses.length === 0 ? (
              <p className="text-gray-500 text-sm">Kayıtlı adres yok.</p>
            ) : (
              <ul className="space-y-3">
                {addresses.map((a) => (
                  <li key={a.id} className="text-sm border rounded-md p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{a.title}</span>
                      {a.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Varsayılan
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-700">
                      {a.first_name} {a.last_name} · {a.phone}
                    </p>
                    <p className="text-gray-600">
                      {a.address_line1}
                      {a.address_line2 ? `, ${a.address_line2}` : ''}
                    </p>
                    <p className="text-gray-600">
                      {a.district}, {a.city} {a.postal_code ?? ''} · {a.country}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Reviews */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Star className="h-5 w-5" />
          Yorumlar
        </h2>
        {!productReviews?.length && !storeReviews?.length ? (
          <p className="text-gray-500 text-sm">Bu müşteri henüz yorum yapmamış.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                Ürün Yorumları ({productReviews?.length ?? 0})
              </h3>
              {!productReviews?.length ? (
                <p className="text-gray-400 text-sm">Yok</p>
              ) : (
                <ul className="space-y-3">
                  {productReviews.map((r: any) => (
                    <li key={r.id} className="text-sm border rounded-md p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Link
                          href={r.product?.id ? `/urunler/${r.product.id}` : '#'}
                          className="font-medium text-primary hover:underline"
                        >
                          {r.product?.name ?? 'Silinmiş ürün'}
                        </Link>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{r.rating}</span>
                        </div>
                      </div>
                      {r.title && <p className="font-medium">{r.title}</p>}
                      {r.comment && (
                        <p className="text-gray-600 line-clamp-3">{r.comment}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{formatDate(r.created_at)}</span>
                        {r.is_approved ? (
                          <span className="text-green-600 flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3" />
                            Onaylı
                          </span>
                        ) : (
                          <span className="text-orange-600">Bekliyor</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                Mağaza Yorumları ({storeReviews?.length ?? 0})
              </h3>
              {!storeReviews?.length ? (
                <p className="text-gray-400 text-sm">Yok</p>
              ) : (
                <ul className="space-y-3">
                  {storeReviews.map((r: any) => (
                    <li key={r.id} className="text-sm border rounded-md p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">
                          {r.store?.store_name ?? 'Silinmiş mağaza'}
                        </span>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{r.rating}</span>
                        </div>
                      </div>
                      {r.title && <p className="font-medium">{r.title}</p>}
                      {r.comment && (
                        <p className="text-gray-600 line-clamp-3">{r.comment}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{formatDate(r.created_at)}</span>
                        {r.is_hidden && <span className="text-gray-500">Gizli</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
