import Link from 'next/link'
import { Card, Badge, PageHeader, EmptyState, TabBar, type TabItem } from '@novagross/ui'
import { requireSeller } from '@/lib/auth/requireSeller'
import { Star, MessageSquare, Package, Store as StoreIcon } from 'lucide-react'
import { ReplyForm } from './reply-form'

export const dynamic = 'force-dynamic'

type Tab = 'products' | 'store'
type Status = 'all' | 'unanswered' | 'answered'

function parseTab(v: string | undefined): Tab {
  return v === 'store' ? 'store' : 'products'
}
function parseStatus(v: string | undefined): Status {
  return v === 'unanswered' || v === 'answered' ? v : 'all'
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

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${
            n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

export default async function SellerReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>
}) {
  try {
    return await renderReviews(searchParams)
  } catch (e: any) {
    // Next.js redirect/notFound sinyallerini bozma
    if (e?.digest && String(e.digest).startsWith('NEXT_')) throw e
    return (
      <div className="p-6 space-y-2">
        <h2 className="text-lg font-bold text-red-700">[TANI] Yorumlar sayfası hatası</h2>
        <pre className="text-xs bg-red-50 border border-red-200 p-3 rounded whitespace-pre-wrap overflow-auto">
          {String(e?.message || e)}
          {'\n\n'}
          {String(e?.stack || '')}
        </pre>
      </div>
    )
  }
}

async function renderReviews(
  searchParams: Promise<{ tab?: string; status?: string }>
) {
  const { supabase, storeId } = await requireSeller('/yorumlar')
  const sp = await searchParams
  const tab = parseTab(sp.tab)
  const status = parseStatus(sp.status)

  // First get product ids for this store
  const { data: productRows } = await supabase
    .from('products')
    .select('id')
    .eq('store_id', storeId)
  const productIds = (productRows ?? []).map((p: any) => p.id)

  // Counts
  let productsTotal = 0
  let productsUnanswered = 0
  let storesTotal = 0
  let storesUnanswered = 0

  if (productIds.length > 0) {
    const [a, b] = await Promise.all([
      supabase.from('reviews').select('id', { count: 'exact', head: true }).in('product_id', productIds),
      (supabase as any)
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .in('product_id', productIds)
        .is('seller_reply', null),
    ])
    productsTotal = a.count ?? 0
    productsUnanswered = b.count ?? 0
  }
  const [c, d] = await Promise.all([
    supabase.from('store_reviews').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
    (supabase as any)
      .from('store_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .is('seller_reply', null),
  ])
  storesTotal = c.count ?? 0
  storesUnanswered = d.count ?? 0

  // List for current tab
  let productReviews: any[] = []
  let storeReviewsList: any[] = []

  if (tab === 'products' && productIds.length > 0) {
    let q = supabase
      .from('reviews')
      .select(
        `id, rating, title, comment, is_approved, created_at,
         seller_reply, seller_reply_at, seller_reply_approved,
         product:product_id ( id, name ),
         user:user_id ( first_name, last_name, email )`
      )
      .in('product_id', productIds)
      .order('created_at', { ascending: false })
      .limit(200)
    if (status === 'unanswered') q = (q as any).is('seller_reply', null)
    if (status === 'answered') q = (q as any).not('seller_reply', 'is', null)
    productReviews = ((await q).data ?? []) as any[]
  } else if (tab === 'store') {
    let q = supabase
      .from('store_reviews')
      .select(
        `id, rating, title, comment, is_hidden, created_at,
         seller_reply, seller_reply_at, seller_reply_approved,
         user:user_id ( first_name, last_name, email )`
      )
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (status === 'unanswered') q = (q as any).is('seller_reply', null)
    if (status === 'answered') q = (q as any).not('seller_reply', 'is', null)
    storeReviewsList = ((await q).data ?? []) as any[]
  }

  const tabs: TabItem[] = [
    {
      key: 'products',
      label: 'Ürün Yorumları',
      icon: Package,
      count: productsTotal,
      href: '/yorumlar?tab=products',
    },
    {
      key: 'store',
      label: 'Mağaza Yorumları',
      icon: StoreIcon,
      count: storesTotal,
      href: '/yorumlar?tab=store',
    },
  ]

  const statusTabs: TabItem[] = [
    {
      key: 'all',
      label: 'Tümü',
      count: tab === 'products' ? productsTotal : storesTotal,
      href: `/yorumlar?tab=${tab}`,
    },
    {
      key: 'unanswered',
      label: 'Yanıtsız',
      count: tab === 'products' ? productsUnanswered : storesUnanswered,
      href: `/yorumlar?tab=${tab}&status=unanswered`,
    },
    {
      key: 'answered',
      label: 'Yanıtlanmış',
      count:
        (tab === 'products' ? productsTotal - productsUnanswered : storesTotal - storesUnanswered),
      href: `/yorumlar?tab=${tab}&status=answered`,
    },
  ]

  const items: any[] = tab === 'products' ? productReviews : storeReviewsList

  return (
    <div className="space-y-6">
      <PageHeader title="Yorumlar" description="Müşteri geri bildirimlerini yönetin ve yanıtlayın" />

      <TabBar items={tabs} value={tab} />
      <TabBar variant="secondary" items={statusTabs} value={status} />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageSquare}
            title={
              status === 'unanswered'
                ? 'Yanıtsız yorum yok'
                : status === 'answered'
                ? 'Yanıtlanmış yorum yok'
                : 'Henüz yorum yok'
            }
            description={
              status === 'unanswered'
                ? 'Tüm yorumlara yanıt verdiniz, tebrikler!'
                : 'Müşterileriniz yorum yaptığında burada görünecek.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((r: any) => {
            const user = r.user
            const userName =
              [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
              user?.email ||
              'İsimsiz'
            return (
              <Card key={r.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <Stars rating={r.rating} />
                      <span className="text-xs text-gray-500">{formatDate(r.created_at)}</span>
                      {tab === 'products' && r.product && (
                        <Link
                          href={`/urunler/${r.product.id}/duzenle`}
                          className="text-xs text-green-700 hover:underline truncate"
                        >
                          {r.product.name}
                        </Link>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900">{userName}</div>
                    {r.title && (
                      <p className="text-sm font-medium text-gray-900 mt-1">{r.title}</p>
                    )}
                    {r.comment && (
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{r.comment}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {tab === 'products' ? (
                      r.is_approved ? (
                        <Badge variant="success">Onaylı</Badge>
                      ) : (
                        <Badge variant="default" className="bg-orange-500">
                          Onay bekliyor
                        </Badge>
                      )
                    ) : r.is_hidden ? (
                      <Badge variant="secondary">Gizli</Badge>
                    ) : (
                      <Badge variant="success">Görünür</Badge>
                    )}
                  </div>
                </div>

                <ReplyForm
                  reviewId={r.id}
                  kind={tab === 'products' ? 'product' : 'store'}
                  initialReply={r.seller_reply}
                  approved={r.seller_reply_approved}
                />
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
