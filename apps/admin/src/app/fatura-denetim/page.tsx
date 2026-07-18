'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, PageHeader, Badge } from '@novagross/ui'
import { createClient } from '@/lib/supabase/client'
import { Loader2, FileWarning } from 'lucide-react'
import Link from 'next/link'

interface Obligation {
  order_id: string
  store_id: string
  order_number: string
  status: string
  shipped_at: string
  due_date: string
  store_name?: string
}

type TabKey = 'overdue' | 'upcoming' | 'all'

export default function InvoiceAuditPage() {
  const [items, setItems] = useState<Obligation[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('overdue')

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: obligations } = await (supabase as any)
      .from('order_invoice_obligations')
      .select('order_id, store_id, order_number, status, shipped_at, due_date')
      .is('invoice_id', null)
      .order('due_date', { ascending: true })
      .limit(300)

    const storeIds: string[] = Array.from(new Set((obligations || []).map((o: any) => o.store_id as string)))
    let storeNameById = new Map<string, string>()
    if (storeIds.length > 0) {
      const { data: stores } = await supabase.from('stores').select('id, store_name').in('id', storeIds)
      storeNameById = new Map((stores || []).map((s: any) => [s.id, s.store_name]))
    }

    setItems(
      (obligations || []).map((o: any) => ({ ...o, store_name: storeNameById.get(o.store_id) || '—' }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const now = Date.now()
  const withMeta = items.map((o) => ({
    ...o,
    overdue: new Date(o.due_date).getTime() < now,
    daysLeft: Math.ceil((new Date(o.due_date).getTime() - now) / (24 * 60 * 60 * 1000)),
  }))

  const filtered = useMemo(() => {
    if (tab === 'overdue') return withMeta.filter((o) => o.overdue)
    if (tab === 'upcoming') return withMeta.filter((o) => !o.overdue)
    return withMeta
  }, [withMeta, tab])

  const overdueCount = withMeta.filter((o) => o.overdue).length
  const upcomingCount = withMeta.length - overdueCount

  return (
    <div>
      <PageHeader
        title="Sipariş Fatura Denetimi"
        description="Kargolanmış/teslim edilmiş ama e-Arşiv faturası yüklenmemiş siparişler"
      />

      <div className="flex gap-2 mb-6">
        {[
          { key: 'overdue' as TabKey, label: `Geciken (${overdueCount})` },
          { key: 'upcoming' as TabKey, label: `Yaklaşan (${upcomingCount})` },
          { key: 'all' as TabKey, label: `Tümü (${withMeta.length})` },
        ].map((t) => (
          <Button key={t.key} variant={tab === t.key ? 'default' : 'outline'} size="sm" onClick={() => setTab(t.key)}>
            {t.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5" />
            Faturası Eksik Siparişler
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Bu grupta sipariş yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Mağaza</th>
                    <th className="py-2 pr-4">Sipariş No</th>
                    <th className="py-2 pr-4">Kargolanma</th>
                    <th className="py-2 pr-4">Son Tarih</th>
                    <th className="py-2 pr-4">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={`${o.order_id}-${o.store_id}`} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <Link href={`/saticilar/${o.store_id}`} className="text-primary hover:underline">
                          {o.store_name}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 font-mono">#{o.order_number}</td>
                      <td className="py-2 pr-4">{new Date(o.shipped_at).toLocaleDateString('tr-TR')}</td>
                      <td className="py-2 pr-4">{new Date(o.due_date).toLocaleDateString('tr-TR')}</td>
                      <td className="py-2 pr-4">
                        {o.overdue ? (
                          <Badge className="bg-red-100 text-red-700">
                            Gecikti ({Math.abs(o.daysLeft)} gün)
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800">Son {o.daysLeft} gün</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
