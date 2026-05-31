import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, StatCard } from '@novagross/ui'
import {
  Star,
  TrendingUp,
  Clock,
  Truck,
  RefreshCcw,
  CheckCircle2,
  MessageSquare,
  ShoppingCart,
} from 'lucide-react'
import { requireSeller } from '@/lib/auth/requireSeller'

export const dynamic = 'force-dynamic'

function pct(num: number, denom: number): number {
  if (!denom) return 0
  return +((num / denom) * 100).toFixed(1)
}

function scoreFromMetrics(m: {
  onTimeShipRate: number
  reviewAvg: number
  reviewCount: number
  returnRate: number
  responseHours: number | null
}): { score: number; grade: 'A' | 'B' | 'C' | 'D' } {
  // Simple weighted score (0-100)
  let score = 0
  score += m.onTimeShipRate * 0.35
  score += Math.min((m.reviewAvg / 5) * 100, 100) * 0.30 * (m.reviewCount >= 5 ? 1 : 0.5)
  score += Math.max(0, 100 - m.returnRate * 2) * 0.20
  score +=
    m.responseHours === null
      ? 50 * 0.15
      : Math.max(0, 100 - Math.min(m.responseHours, 100)) * 0.15
  const s = Math.round(score)
  const grade: 'A' | 'B' | 'C' | 'D' =
    s >= 85 ? 'A' : s >= 70 ? 'B' : s >= 55 ? 'C' : 'D'
  return { score: s, grade }
}

export default async function SellerPerformancePage() {
  const { supabase, storeId } = await requireSeller('/performans')

  // Product IDs for this store (for reviews + questions)
  const { data: productRows } = await supabase
    .from('products')
    .select('id')
    .eq('store_id', storeId)
  const productIds = (productRows ?? []).map((p: any) => p.id)

  // Orders / order_items
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: orderItems30 },
    { data: orders30 },
    { count: deliveredCount },
    { count: shippedCount },
    { count: returnedCount },
    reviewsRes,
    { count: questionCount },
    questionsRes,
  ] = await Promise.all([
    supabase
      .from('order_items')
      .select('id, created_at, order_id, total')
      .eq('store_id', storeId)
      .gte('created_at', last30),
    supabase
      .from('orders')
      .select('id, status, created_at, delivered_at, total')
      .gte('created_at', last30),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'delivered')
      .gte('created_at', last30),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'shipped')
      .gte('created_at', last30),
    (supabase as any)
      .from('customer_claims')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('claim_type', 'return')
      .gte('created_at', last30),
    productIds.length > 0
      ? supabase
          .from('reviews')
          .select('rating, created_at')
          .in('product_id', productIds)
      : Promise.resolve({ data: [] as any[] }),
    productIds.length > 0
      ? (supabase as any)
          .from('product_questions')
          .select('id', { count: 'exact', head: true })
          .in('product_id', productIds)
      : Promise.resolve({ count: 0 } as any),
    productIds.length > 0
      ? (supabase as any)
          .from('product_questions')
          .select('created_at, answered_at')
          .in('product_id', productIds)
          .not('answered_at', 'is', null)
          .limit(200)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const totalOrders30 = (orderItems30 ?? []).reduce((set: Set<string>, x: any) => {
    if (x.order_id) set.add(x.order_id)
    return set
  }, new Set<string>()).size

  // On-time ship rate: shipped or delivered count vs all relevant
  const totalShippableOrders = (deliveredCount ?? 0) + (shippedCount ?? 0)
  const totalAllOrders30 = (orders30 ?? []).length
  const onTimeShipRate =
    totalAllOrders30 > 0 ? pct(totalShippableOrders, totalAllOrders30) : 0

  // Return rate
  const returnRate =
    totalOrders30 > 0 ? pct(returnedCount ?? 0, totalOrders30) : 0

  // Review metrics
  const reviews = (reviewsRes.data ?? []) as Array<{ rating: number }>
  const reviewCount = reviews.length
  const reviewAvg =
    reviewCount > 0
      ? +(reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviewCount).toFixed(1)
      : 0

  // Avg response time (hours)
  const questions = (questionsRes.data ?? []) as Array<{
    created_at: string
    answered_at: string
  }>
  const avgResponseHours =
    questions.length > 0
      ? Math.round(
          questions.reduce((sum, q) => {
            const t =
              (new Date(q.answered_at).getTime() - new Date(q.created_at).getTime()) /
              3_600_000
            return sum + Math.max(t, 0)
          }, 0) / questions.length
        )
      : null

  const { score, grade } = scoreFromMetrics({
    onTimeShipRate,
    reviewAvg,
    reviewCount,
    returnRate,
    responseHours: avgResponseHours,
  })

  const gradeColor: Record<string, string> = {
    A: 'bg-green-600',
    B: 'bg-blue-600',
    C: 'bg-orange-500',
    D: 'bg-red-600',
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Satıcı Performansı"
        description="Son 30 günün sağlık metrikleri ve satış performans skoru"
      />

      {/* Health score */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-500">Genel Performans Skoru</p>
              <div className="flex items-baseline gap-3 mt-1">
                <p className="text-5xl font-bold text-gray-900">{score}</p>
                <span className="text-gray-500 text-lg">/ 100</span>
                <Badge className={`text-white ${gradeColor[grade]} text-lg px-3 py-1`}>
                  {grade}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-2 max-w-md">
                Bu skor; zamanında kargolama (35%), yorum puanı (30%), iade oranı (20%)
                ve cevap süresinden (15%) hesaplanır.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Son 30 gün</p>
              <p className="text-2xl font-bold">{totalOrders30} sipariş</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Zamanında kargolama"
          value={`${onTimeShipRate}%`}
          hint={`${(deliveredCount ?? 0) + (shippedCount ?? 0)} / ${totalAllOrders30} sipariş`}
          icon={Truck}
          iconColor="text-blue-500"
          emphasis={onTimeShipRate >= 90 ? 'success' : onTimeShipRate >= 70 ? 'default' : 'warning'}
        />
        <StatCard
          label="Ortalama Puan"
          value={reviewAvg ? `${reviewAvg} / 5` : '—'}
          hint={`${reviewCount} yorum`}
          icon={Star}
          iconColor="text-yellow-500"
          emphasis={reviewAvg >= 4 ? 'success' : reviewAvg >= 3 ? 'default' : 'warning'}
        />
        <StatCard
          label="İade Oranı"
          value={`${returnRate}%`}
          hint={`${returnedCount ?? 0} iade / ${totalOrders30} sipariş`}
          icon={RefreshCcw}
          iconColor="text-orange-500"
          emphasis={returnRate <= 3 ? 'success' : returnRate <= 7 ? 'default' : 'danger'}
        />
        <StatCard
          label="Cevap Süresi"
          value={avgResponseHours === null ? '—' : `${avgResponseHours} sa`}
          hint={`${questions.length} cevaplanmış soru`}
          icon={Clock}
          iconColor="text-purple-500"
          emphasis={
            avgResponseHours === null
              ? 'default'
              : avgResponseHours <= 24
              ? 'success'
              : avgResponseHours <= 48
              ? 'default'
              : 'warning'
          }
        />
      </div>

      {/* Section: detail breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-green-600" />
              Sipariş Özeti (30 gün)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Toplam sipariş</span>
              <span className="font-medium">{totalOrders30}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Teslim edilen</span>
              <span className="font-medium text-green-700">{deliveredCount ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Kargoya verilen</span>
              <span className="font-medium text-blue-700">{shippedCount ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">İade edilen</span>
              <span className="font-medium text-orange-700">{returnedCount ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              Müşteri Etkileşimi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Toplam yorum</span>
              <span className="font-medium">{reviewCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ortalama puan</span>
              <span className="font-medium">
                {reviewAvg ? `${reviewAvg} ★` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sorular</span>
              <span className="font-medium">{questionCount ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ortalama cevap süresi</span>
              <span className="font-medium">
                {avgResponseHours === null
                  ? '—'
                  : avgResponseHours <= 24
                  ? `${avgResponseHours} saat ✅`
                  : `${avgResponseHours} saat`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4 text-sm text-green-900 flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Performansınızı yükseltmek için:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>Siparişleri 24 saat içinde kargoya verin.</li>
              <li>Sorulara 24 saat içinde cevap verin.</li>
              <li>Yorumlara satıcı yanıtı yazın (admin onayı sonrası gösterilir).</li>
              <li>İade taleplerini hızlı ve adil sonuçlandırın.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
