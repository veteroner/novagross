'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, PageHeader, Badge } from '@novagross/ui'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertTriangle } from 'lucide-react'

interface DeliveryProblem {
  id: string
  order_id: string | null
  mng_shipment_id: string
  mng_problem_id: number
  reference_id: string | null
  problem_description: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_answer: string | null
  answered_at: string | null
  created_at: string
  orders?: { order_number: string } | null
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: '⏳ Yanıt Bekliyor', cls: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '✅ Onaylandı', cls: 'bg-green-100 text-green-800' },
  rejected: { label: '❌ Reddedildi', cls: 'bg-red-100 text-red-800' },
}

export default function DeliveryProblemsPage() {
  const [items, setItems] = useState<DeliveryProblem[]>([])
  const [loading, setLoading] = useState(true)
  const [answering, setAnswering] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState<Record<string, string>>({})
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await (supabase as any)
      .from('delivery_problems')
      .select('*, orders(order_number)')
      .order('created_at', { ascending: false })
      .limit(100)
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const answer = async (problemId: string, approve: boolean) => {
    const text = (answerText[problemId] || '').trim()
    if (text.length < 3) {
      alert('Lütfen en az 3 karakterlik bir yanıt yazın')
      return
    }
    setAnswering(problemId)
    try {
      const res = await fetch('/api/cargo/answer-delivery-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, approve, answer: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Yanıt gönderilemedi')
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setAnswering(null)
    }
  }

  const syncNow = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/cargo/sync-delivery-problems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Not: bu buton yalnızca lokal/manuel test için — prod'da cron secret gerekir
        },
        body: JSON.stringify({ days: 14 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Senkronizasyon başarısız (cron secret gerekli olabilir)')
      alert(`Senkronize edildi: ${data.summary?.inserted ?? 0} yeni kayıt`)
      await load()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSyncing(false)
    }
  }

  const pending = items.filter((i) => i.status === 'pending')
  const answered = items.filter((i) => i.status !== 'pending')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teslimat Sorunları"
        description="MNG kurye/şube bildirdiği teslimat sorunları — onay/red yanıtınız gerekiyor"
        actions={
          <Button onClick={syncNow} disabled={syncing} variant="outline">
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {syncing ? 'Senkronize ediliyor...' : '🔄 MNG’den Senkronize Et'}
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Yanıt Bekleyenler ({pending.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Yanıt bekleyen teslimat sorunu yok.
                </p>
              ) : (
                pending.map((p) => (
                  <div key={p.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {p.orders?.order_number ? `Sipariş #${p.orders.order_number}` : 'Sipariş eşleşmedi'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          MNG Gönderi: {p.mng_shipment_id} · Referans: {p.reference_id || '—'}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${STATUS_LABEL[p.status].cls}`}>
                        {STATUS_LABEL[p.status].label}
                      </span>
                    </div>
                    {p.problem_description ? (
                      <p className="text-sm bg-yellow-50 border border-yellow-200 rounded p-2">
                        {p.problem_description}
                      </p>
                    ) : null}
                    <textarea
                      className="w-full text-sm border rounded px-2 py-1.5"
                      rows={2}
                      placeholder="Yanıtınız (kuryeye/şubeye iletilecek)"
                      value={answerText[p.id] || ''}
                      onChange={(e) => setAnswerText((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => answer(p.id, true)}
                        disabled={answering === p.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        ✅ Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => answer(p.id, false)}
                        disabled={answering === p.id}
                        className="text-red-600 border-red-300"
                      >
                        ❌ Reddet
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {answered.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Yanıtlanmış Sorunlar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {answered.map((p) => (
                  <div key={p.id} className="border rounded p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span>
                        {p.orders?.order_number ? `#${p.orders.order_number}` : p.mng_shipment_id}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${STATUS_LABEL[p.status].cls}`}>
                        {STATUS_LABEL[p.status].label}
                      </span>
                    </div>
                    {p.admin_answer ? (
                      <p className="text-xs text-muted-foreground mt-1">Yanıt: {p.admin_answer}</p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
