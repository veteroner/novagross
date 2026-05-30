import Link from 'next/link'
import { Card, Badge, PageHeader, EmptyState } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { MessageSquare, Star, Store, Package } from 'lucide-react'
import { ProductReviewActions, StoreReviewActions } from './review-actions'

export const dynamic = 'force-dynamic'

type Tab = 'products' | 'stores'
type StatusFilter = 'all' | 'pending' | 'approved' | 'hidden'

type SearchParams = {
  tab?: string
  status?: string
}

function parseTab(v: string | undefined): Tab {
  return v === 'stores' ? 'stores' : 'products'
}

function parseStatus(v: string | undefined, tab: Tab): StatusFilter {
  if (tab === 'products') {
    return v === 'pending' || v === 'approved' ? v : 'all'
  }
  return v === 'hidden' ? 'hidden' : 'all'
}

function formatDate(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  )
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { supabase } = await requireAdmin('/yorumlar')
  const sp = await searchParams
  const tab = parseTab(sp.tab)
  const status = parseStatus(sp.status, tab)

  // Counts (for tab badges) — cheap head queries
  const [
    { count: productsTotal },
    { count: productsPending },
    { count: storesTotal },
    { count: storesHidden },
  ] = await Promise.all([
    supabase.from('reviews').select('id', { count: 'exact', head: true }),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    supabase.from('store_reviews').select('id', { count: 'exact', head: true }),
    supabase.from('store_reviews').select('id', { count: 'exact', head: true }).eq('is_hidden', true),
  ])

  // Build list query for the active tab
  let productReviews: any[] = []
  let storeReviews: any[] = []

  if (tab === 'products') {
    let q = supabase
      .from('reviews')
      .select(
        `
        id,
        rating,
        title,
        comment,
        is_verified,
        is_approved,
        created_at,
        product:product_id ( id, name, slug ),
        user:user_id ( id, first_name, last_name, email )
      `
      )
      .order('created_at', { ascending: false })
      .limit(200)

    if (status === 'pending') q = q.eq('is_approved', false)
    if (status === 'approved') q = q.eq('is_approved', true)

    const { data, error } = await q
    if (error) console.error('[Yorumlar] reviews query failed:', error)
    productReviews = data ?? []
  } else {
    let q = supabase
      .from('store_reviews')
      .select(
        `
        id,
        rating,
        title,
        comment,
        is_verified,
        is_hidden,
        created_at,
        store:store_id ( id, store_name, store_slug ),
        user:user_id ( id, first_name, last_name, email )
      `
      )
      .order('created_at', { ascending: false })
      .limit(200)

    if (status === 'hidden') q = q.eq('is_hidden', true)
    if (status === 'all') {
      // no extra filter
    }

    const { data, error } = await q
    if (error) console.error('[Yorumlar] store_reviews query failed:', error)
    storeReviews = data ?? []
  }

  const tabHref = (t: Tab) => `/yorumlar?tab=${t}`
  const filterHref = (s: StatusFilter) =>
    `/yorumlar?tab=${tab}&status=${s}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yorumlar"
        description="Ürün ve mağaza yorumlarını yönet"
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Link
          href={tabHref('products')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 -mb-px text-sm font-medium ${
            tab === 'products'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="h-4 w-4" />
          Ürün Yorumları
          <Badge variant="secondary">{productsTotal ?? 0}</Badge>
          {(productsPending ?? 0) > 0 && (
            <Badge variant="default" className="bg-orange-500">
              {productsPending} bekliyor
            </Badge>
          )}
        </Link>
        <Link
          href={tabHref('stores')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 -mb-px text-sm font-medium ${
            tab === 'stores'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Store className="h-4 w-4" />
          Mağaza Yorumları
          <Badge variant="secondary">{storesTotal ?? 0}</Badge>
          {(storesHidden ?? 0) > 0 && (
            <Badge variant="secondary">{storesHidden} gizli</Badge>
          )}
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href={filterHref('all')}
          className={`px-3 py-1 rounded-full text-sm border ${
            status === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700'
          }`}
        >
          Tümü
        </Link>
        {tab === 'products' ? (
          <>
            <Link
              href={filterHref('pending')}
              className={`px-3 py-1 rounded-full text-sm border ${
                status === 'pending' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700'
              }`}
            >
              Onay Bekleyen
            </Link>
            <Link
              href={filterHref('approved')}
              className={`px-3 py-1 rounded-full text-sm border ${
                status === 'approved' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700'
              }`}
            >
              Onaylı
            </Link>
          </>
        ) : (
          <Link
            href={filterHref('hidden')}
            className={`px-3 py-1 rounded-full text-sm border ${
              status === 'hidden' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700'
            }`}
          >
            Gizli
          </Link>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          {tab === 'products' ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-600">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Yorum</th>
                  <th className="text-left py-3 px-4 font-medium">Ürün</th>
                  <th className="text-left py-3 px-4 font-medium">Müşteri</th>
                  <th className="text-left py-3 px-4 font-medium">Puan</th>
                  <th className="text-left py-3 px-4 font-medium">Durum</th>
                  <th className="text-left py-3 px-4 font-medium">Tarih</th>
                  <th className="text-right py-3 px-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {productReviews.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <EmptyState
                        compact
                        icon={MessageSquare}
                        title={
                          status === 'pending'
                            ? 'Onay bekleyen yorum yok'
                            : status === 'approved'
                            ? 'Onaylı yorum yok'
                            : 'Henüz yorum yok'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  productReviews.map((r) => {
                    const user = r.user
                    const userName =
                      [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
                      user?.email ||
                      'İsimsiz'
                    return (
                      <tr key={r.id} className="border-b hover:bg-gray-50 align-top">
                        <td className="py-3 px-4 max-w-md">
                          {r.title && <p className="font-medium text-gray-900">{r.title}</p>}
                          {r.comment && <p className="text-gray-600 line-clamp-3 mt-0.5">{r.comment}</p>}
                          {!r.title && !r.comment && <span className="text-gray-400 italic">Yorum yok</span>}
                        </td>
                        <td className="py-3 px-4">
                          {r.product ? (
                            <Link
                              href={`/urunler/${r.product.id}`}
                              className="text-primary hover:underline"
                            >
                              {r.product.name}
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-900">{userName}</p>
                          {user?.email && <p className="text-xs text-gray-500">{user.email}</p>}
                        </td>
                        <td className="py-3 px-4">
                          <Stars rating={r.rating} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            {r.is_approved ? (
                              <Badge variant="success">Onaylı</Badge>
                            ) : (
                              <Badge variant="default" className="bg-orange-500">
                                Bekliyor
                              </Badge>
                            )}
                            {r.is_verified && (
                              <Badge variant="secondary" className="text-xs">
                                Doğrulanmış
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                          {formatDate(r.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <ProductReviewActions id={r.id} isApproved={r.is_approved} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-gray-600">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Yorum</th>
                  <th className="text-left py-3 px-4 font-medium">Mağaza</th>
                  <th className="text-left py-3 px-4 font-medium">Müşteri</th>
                  <th className="text-left py-3 px-4 font-medium">Puan</th>
                  <th className="text-left py-3 px-4 font-medium">Durum</th>
                  <th className="text-left py-3 px-4 font-medium">Tarih</th>
                  <th className="text-right py-3 px-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {storeReviews.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <EmptyState
                        compact
                        icon={MessageSquare}
                        title={status === 'hidden' ? 'Gizli yorum yok' : 'Henüz mağaza yorumu yok'}
                      />
                    </td>
                  </tr>
                ) : (
                  storeReviews.map((r) => {
                    const user = r.user
                    const userName =
                      [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
                      user?.email ||
                      'İsimsiz'
                    return (
                      <tr key={r.id} className="border-b hover:bg-gray-50 align-top">
                        <td className="py-3 px-4 max-w-md">
                          {r.title && <p className="font-medium text-gray-900">{r.title}</p>}
                          {r.comment && <p className="text-gray-600 line-clamp-3 mt-0.5">{r.comment}</p>}
                          {!r.title && !r.comment && <span className="text-gray-400 italic">Yorum yok</span>}
                        </td>
                        <td className="py-3 px-4">
                          {r.store ? (
                            <span className="text-gray-900">{r.store.store_name}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-900">{userName}</p>
                          {user?.email && <p className="text-xs text-gray-500">{user.email}</p>}
                        </td>
                        <td className="py-3 px-4">
                          <Stars rating={r.rating} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            {r.is_hidden ? (
                              <Badge variant="secondary">Gizli</Badge>
                            ) : (
                              <Badge variant="success">Görünür</Badge>
                            )}
                            {r.is_verified && (
                              <Badge variant="secondary" className="text-xs">
                                Doğrulanmış
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                          {formatDate(r.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <StoreReviewActions id={r.id} isHidden={r.is_hidden} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
