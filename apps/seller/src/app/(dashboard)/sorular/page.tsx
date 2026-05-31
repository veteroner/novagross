import Link from 'next/link'
import { Card, Badge, PageHeader, EmptyState, TabBar, type TabItem } from '@novagross/ui'
import { requireSeller } from '@/lib/auth/requireSeller'
import { HelpCircle } from 'lucide-react'
import { AnswerForm } from './answer-form'

export const dynamic = 'force-dynamic'

type Filter = 'all' | 'unanswered' | 'answered' | 'pending_question' | 'rejected'

function parseFilter(v: string | undefined): Filter {
  return v === 'unanswered' ||
    v === 'answered' ||
    v === 'pending_question' ||
    v === 'rejected'
    ? v
    : 'all'
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

export default async function SellerQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { supabase, storeId } = await requireSeller('/sorular')
  const sp = await searchParams
  const filter = parseFilter(sp.filter)

  const { data: productRows } = await supabase
    .from('products')
    .select('id')
    .eq('store_id', storeId)
  const productIds = (productRows ?? []).map((p: any) => p.id)

  if (productIds.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Müşteri Soruları" description="Ürünlerinize gelen sorular" />
        <Card>
          <EmptyState
            icon={HelpCircle}
            title="Önce ürün ekleyin"
            description="Ürünleriniz olduğunda müşteri soruları burada görünecek."
          />
        </Card>
      </div>
    )
  }

  // Counters
  const [allRes, unansweredRes, answeredRes, pendingQRes, rejectedRes] = await Promise.all([
    (supabase as any)
      .from('product_questions')
      .select('id', { count: 'exact', head: true })
      .in('product_id', productIds),
    (supabase as any)
      .from('product_questions')
      .select('id', { count: 'exact', head: true })
      .in('product_id', productIds)
      .is('answer', null),
    (supabase as any)
      .from('product_questions')
      .select('id', { count: 'exact', head: true })
      .in('product_id', productIds)
      .not('answer', 'is', null),
    (supabase as any)
      .from('product_questions')
      .select('id', { count: 'exact', head: true })
      .in('product_id', productIds)
      .eq('question_status', 'pending'),
    (supabase as any)
      .from('product_questions')
      .select('id', { count: 'exact', head: true })
      .in('product_id', productIds)
      .or('question_status.eq.rejected,answer_status.eq.rejected'),
  ])

  // List
  let q = (supabase as any)
    .from('product_questions')
    .select(
      `id, question, question_status, answer, answer_status, created_at, answered_at,
       product:product_id ( id, name ),
       customer:customer_id ( first_name, last_name, email )`
    )
    .in('product_id', productIds)
    .order('created_at', { ascending: false })
    .limit(200)

  if (filter === 'unanswered') q = q.is('answer', null)
  if (filter === 'answered') q = q.not('answer', 'is', null)
  if (filter === 'pending_question') q = q.eq('question_status', 'pending')
  if (filter === 'rejected')
    q = q.or('question_status.eq.rejected,answer_status.eq.rejected')

  const { data: rows } = await q

  const tabs: TabItem[] = [
    { key: 'all', label: 'Tümü', count: allRes.count ?? 0, href: '/sorular' },
    {
      key: 'unanswered',
      label: 'Cevapsız',
      count: unansweredRes.count ?? 0,
      href: '/sorular?filter=unanswered',
    },
    {
      key: 'answered',
      label: 'Cevaplandı',
      count: answeredRes.count ?? 0,
      href: '/sorular?filter=answered',
    },
    {
      key: 'pending_question',
      label: 'Soru Moderasyonda',
      count: pendingQRes.count ?? 0,
      href: '/sorular?filter=pending_question',
    },
    {
      key: 'rejected',
      label: 'Reddedilen',
      count: rejectedRes.count ?? 0,
      href: '/sorular?filter=rejected',
    },
  ]

  const list = (rows ?? []) as any[]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Müşteri Soruları"
        description="Ürünlerinize sorulan soruları yanıtlayın. Cevaplarınız admin onayından sonra yayımlanır."
      />

      <TabBar items={tabs} value={filter} />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={HelpCircle}
            title={
              filter === 'unanswered'
                ? 'Cevapsız soru yok'
                : filter === 'answered'
                ? 'Cevaplanmış soru yok'
                : 'Henüz soru yok'
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((qrow: any) => {
            const customer = qrow.customer
            const customerName =
              [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') ||
              customer?.email ||
              'Müşteri'
            return (
              <Card key={qrow.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500 mb-0.5 flex items-center gap-2 flex-wrap">
                      <span>{customerName}</span>
                      <span>·</span>
                      <span>{formatDate(qrow.created_at)}</span>
                      {qrow.product && (
                        <>
                          <span>·</span>
                          <Link
                            href={`/urunler/${qrow.product.id}/duzenle`}
                            className="text-green-700 hover:underline truncate"
                          >
                            {qrow.product.name}
                          </Link>
                        </>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap">
                      {qrow.question}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {qrow.question_status === 'approved' ? (
                      <Badge variant="success">Soru onaylı</Badge>
                    ) : qrow.question_status === 'rejected' ? (
                      <Badge variant="destructive">Soru reddedildi</Badge>
                    ) : (
                      <Badge variant="default" className="bg-orange-500">
                        Soru moderasyonda
                      </Badge>
                    )}
                  </div>
                </div>

                <AnswerForm
                  questionId={qrow.id}
                  initialAnswer={qrow.answer}
                  status={qrow.answer_status}
                />
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
