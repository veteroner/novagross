import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@novagross/ui'
import { Wallet, Gift, ArrowDownCircle, ArrowUpCircle, Plus } from 'lucide-react'

type Coupon = {
  id: string
  amount: number
  remaining_amount: number
  type: string
  title: string | null
  status: string
  expires_at: string | null
}

type Tx = {
  id: string
  amount: number
  type: string
  description: string | null
  balance_after: number | null
  created_at: string
}

function formatTRY(n: number) {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)
  } catch {
    return `${n.toFixed(2)} ₺`
  }
}

const TX_LABEL: Record<string, string> = {
  topup_iyzico: 'Kartla yükleme',
  admin_grant: 'Admin tanımlaması',
  gift: 'Hediye kredisi',
  ad_spend: 'Reklam harcaması',
  refund: 'İade',
  adjustment: 'Düzeltme',
}

const TOPUP_MESSAGE: Record<string, { text: string; ok: boolean }> = {
  success: { text: 'Ödeme başarılı, reklam bakiyeniz güncellendi.', ok: true },
  failed: { text: 'Ödeme tamamlanamadı. Lütfen tekrar deneyin.', ok: false },
  mismatch: { text: 'Ödeme tutarı eşleşmedi, işlem iptal edildi.', ok: false },
  error: { text: 'Ödeme sırasında bir hata oluştu.', ok: false },
}

export function AdBalancePanel({
  adBalance,
  coupons,
  transactions,
  topupStatus,
}: {
  adBalance: number
  coupons: Coupon[]
  transactions: Tx[]
  topupStatus?: string
}) {
  const notice = topupStatus ? TOPUP_MESSAGE[topupStatus] : null
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-orange-600" /> Reklam Bakiyesi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {notice && (
          <div className={`text-sm rounded-md px-3 py-2 ${notice.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {notice.text}
          </div>
        )}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Kullanılabilir bakiye</p>
            <p className="text-3xl font-bold text-orange-700">{formatTRY(adBalance)}</p>
          </div>
          <Link href="/reklam/bakiye-yukle">
            <Button>
              <Plus className="h-4 w-4 mr-1" /> Bakiye Yükle
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Kampanya tıklamaları bu bakiyeden düşülür. Bakiye bittiğinde kampanyalarınız otomatik durur.
        </p>

        {/* Hediye kuponları */}
        {coupons.length > 0 && (
          <div>
            <p className="text-sm font-medium flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4" /> Hediye Kuponlarınız
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {coupons.map((c) => (
                <div key={c.id} className="border rounded-lg p-3 bg-orange-50/40">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{c.title || 'Hediye kupon'}</span>
                    <span className="font-bold text-orange-700">{formatTRY(c.remaining_amount)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.type === 'commission_credit' ? 'Komisyon faturanızdan düşülür' : 'Reklam bakiyesi kredisi'}
                    {c.expires_at ? ` · Son: ${new Date(c.expires_at).toLocaleDateString('tr-TR')}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Son hareketler */}
        {transactions.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Son Hareketler</p>
            <div className="space-y-1.5">
              {transactions.map((t) => {
                const positive = Number(t.amount) >= 0
                return (
                  <div key={t.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <span className="flex items-center gap-2">
                      {positive ? (
                        <ArrowUpCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>{t.description || TX_LABEL[t.type] || t.type}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </span>
                    <span className={positive ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                      {positive ? '+' : ''}{formatTRY(Number(t.amount))}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
