'use client'

import { useState } from 'react'
import { Button } from '@novagross/ui/button'
import { Badge } from '@novagross/ui/badge'
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'

type OrderItem = {
  id: string
  product_name: string
  iyzico_payment_transaction_id: string | null
  iyzico_approval_status: 'pending' | 'approved' | 'disapproved' | null
  iyzico_approved_at: string | null
}

interface IyzicoApprovalCardProps {
  items: OrderItem[]
  paymentStatus: string
}

const statusBadge = (status: string | null) => {
  if (status === 'approved') return <Badge className="bg-green-100 text-green-800">Onaylandı</Badge>
  if (status === 'disapproved') return <Badge className="bg-red-100 text-red-800">Onay Kaldırıldı</Badge>
  return <Badge className="bg-yellow-100 text-yellow-800">Onay Bekliyor</Badge>
}

export function IyzicoApprovalCard({ items, paymentStatus }: IyzicoApprovalCardProps) {
  const [statuses, setStatuses] = useState<
    Record<string, { approvalStatus: string | null; loadingApprove: boolean; loadingDisapprove: boolean; error: string | null }>
  >(
    Object.fromEntries(
      items.map((it) => [
        it.id,
        {
          approvalStatus: it.iyzico_approval_status ?? 'pending',
          loadingApprove: false,
          loadingDisapprove: false,
          error: null,
        },
      ])
    )
  )

  const callApi = async (orderItemId: string, action: 'approve' | 'disapprove') => {
    setStatuses((prev) => ({
      ...prev,
      [orderItemId]: {
        ...prev[orderItemId],
        loadingApprove: action === 'approve',
        loadingDisapprove: action === 'disapprove',
        error: null,
      },
    }))

    try {
      const res = await fetch(`/api/iyzico/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemId }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `İşlem başarısız (${res.status})`)
      }

      setStatuses((prev) => ({
        ...prev,
        [orderItemId]: {
          ...prev[orderItemId],
          approvalStatus: action === 'approve' ? 'approved' : 'disapproved',
          loadingApprove: false,
          loadingDisapprove: false,
          error: null,
        },
      }))
    } catch (err: any) {
      setStatuses((prev) => ({
        ...prev,
        [orderItemId]: {
          ...prev[orderItemId],
          loadingApprove: false,
          loadingDisapprove: false,
          error: err.message || 'Bir hata oluştu',
        },
      }))
    }
  }

  // Only show for paid orders
  if (paymentStatus !== 'paid') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        iyzico onay işlemleri yalnızca ödemesi tamamlanmış siparişler için yapılabilir.
      </div>
    )
  }

  const hasAnyTxId = items.some((it) => it.iyzico_payment_transaction_id)

  if (!hasAnyTxId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Bu siparişin kalemlerine ait iyzico <code className="font-mono bg-amber-100 px-1 rounded">paymentTransactionId</code> değerleri
          veritabanında bulunamadı. Bu, siparişin eski bir ödeme akışıyla oluşturulduğu anlamına gelebilir.
          Onay işlemi için iyzico kontrol panelini kullanın.
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Ürünlere onay verildiğinde para, iyzico korumalı havuzdan satıcıya transfer edilir.
        Onay kaldırılabilir; ancak transfer gerçekleştikten sonra geri alınamaz.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-medium">Ürün</th>
              <th className="text-left py-2 px-3 font-medium">TX ID</th>
              <th className="text-left py-2 px-3 font-medium">Durum</th>
              <th className="text-right py-2 px-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const st = statuses[item.id]
              const hasTxId = !!item.iyzico_payment_transaction_id
              return (
                <tr key={item.id} className="border-b">
                  <td className="py-2 px-3 font-medium">{item.product_name}</td>
                  <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                    {item.iyzico_payment_transaction_id ?? '—'}
                  </td>
                  <td className="py-2 px-3">
                    {statusBadge(st?.approvalStatus ?? null)}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-end gap-2">
                      {st?.error && (
                        <span className="text-xs text-red-600 max-w-48 truncate" title={st.error}>
                          {st.error}
                        </span>
                      )}
                      {!hasTxId ? (
                        <span className="text-xs text-muted-foreground">TX ID yok</span>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              st?.approvalStatus === 'approved' ||
                              st?.loadingApprove ||
                              st?.loadingDisapprove
                            }
                            onClick={() => callApi(item.id, 'approve')}
                            className="text-green-700 border-green-300 hover:bg-green-50 disabled:opacity-50"
                          >
                            {st?.loadingApprove ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                            )}
                            Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              st?.approvalStatus === 'disapproved' ||
                              st?.loadingApprove ||
                              st?.loadingDisapprove
                            }
                            onClick={() => callApi(item.id, 'disapprove')}
                            className="text-red-700 border-red-300 hover:bg-red-50 disabled:opacity-50"
                          >
                            {st?.loadingDisapprove ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            Onayı Kaldır
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
