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
  const [runs, setRuns] = useState<any[]>([])
  const [notScanned, setNotScanned] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await (supabase as any)
      .from('delivery_problems')
      .select('*, orders(order_number)')
      .order('created_at', { ascending: false })
      .limit(100)
    setItems(data || [])

    // Kargo takip senkronizasyonu: son çalışmalar + MNG'de okutulmamış paketler
    const [{ data: runRows }, { data: ns }] = await Promise.all([
      (supabase as any).from('cargo_sync_runs').select('*').order('ran_at', { ascending: false }).limit(10),
      (supabase as any)
        .from('order_shipments')
        .select('id, tracking_number, created_at, mng_last_checked_at, mng_not_scanned_alerted_at, orders(order_number)')
        .eq('provider_code', 'mng')
        .is('mng_shipment_id', null)
        .not('mng_last_checked_at', 'is', null)
        .not('status', 'in', '(delivered,returned,failed,cancelled)')
        .order('created_at', { ascending: false })
        .limit(20),
    ])
    setRuns(runRows || [])
    setNotScanned((ns || []).filter((r: any) => !String(r.tracking_number).startsWith('MOCK')))
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

      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle>Kargo takip senkronizasyonu (MNG)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {notScanned.length > 0 && (
              <div className="rounded border border-amber-300 bg-amber-50 p-3">
                <p className="font-medium text-amber-900 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> MNG&apos;de gönderiye dönüşmemiş (şubede okutulmamış) paketler
                </p>
                <ul className="mt-2 space-y-1 text-amber-900">
                  {notScanned.map((r) => (
                    <li key={r.id}>
                      #{r.orders?.order_number} · {r.tracking_number} · etiket{' '}
                      {new Date(r.created_at).toLocaleString('tr-TR')}
                      {r.mng_not_scanned_alerted_at ? ' · uyarı gönderildi' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {runs.length === 0 ? (
              <p className="text-gray-500">Henüz kayıtlı çalışma yok (6 saatte bir çalışır).</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-gray-600">
                    <th className="py-2">Zaman</th>
                    <th>Durum</th>
                    <th>Toplu</th>
                    <th>Kontrol</th>
                    <th>Güncellenen</th>
                    <th>Okutulmamış</th>
                    <th>Hatalar</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-b align-top">
                      <td className="py-2">{new Date(r.ran_at).toLocaleString('tr-TR')}</td>
                      <td>{r.ok ? <Badge variant="success">OK</Badge> : <Badge variant="destructive">Hata</Badge>}</td>
                      <td>{r.summary?.bulkFetched ?? 0}</td>
                      <td>{r.summary?.checked ?? 0}</td>
                      <td>{r.summary?.updated ?? 0}</td>
                      <td>{r.summary?.notScanned ?? 0}</td>
                      <td className="text-red-700 text-xs break-all">{(r.errors || []).join(' · ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

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
