'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@novagross/ui'
import { Button } from '@novagross/ui'
import { DollarSign, TrendingUp, ArrowDownToLine, Clock, CheckCircle, AlertCircle, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface WithdrawalRequest {
  id: string
  amount: number
  status: string | null
  iban: string
  created_at: string | null
  completed_at: string | null
  admin_notes: string | null
  [key: string]: any
}

export default function EarningsPage() {
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState({ available: 0, pending: 0, total_earned: 0 })
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [showWithdrawForm, setShowWithdrawForm] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawIban, setWithdrawIban] = useState('')
  const [withdrawAccountHolder, setWithdrawAccountHolder] = useState('')
  const [withdrawBankName, setWithdrawBankName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)

  useEffect(() => {
    fetchEarnings()
  }, [])

  const fetchEarnings = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('id', ((await (supabase as any).rpc('get_my_store')).data?.[0]?.store_id) ?? '')
        .single()

      if (!store) return
      setStoreId(store.id)

      // Get store balance — tablo adı 'store_balance' (tekil); 404'ün sebebi
      // yanlış 'store_balances' çağrısıydı.
      const { data: balanceData } = await (supabase as any)
        .from('store_balance')
        .select('available_balance, pending_balance, total_withdrawn')
        .eq('store_id', store.id)
        .maybeSingle()

      if (balanceData) {
        const available = Number(balanceData.available_balance || 0)
        const pending = Number(balanceData.pending_balance || 0)
        const withdrawn = Number(balanceData.total_withdrawn || 0)
        setBalance({
          available,
          pending,
          // Toplam kazanç = mevcut + bekleyen + çekilmiş
          total_earned: available + pending + withdrawn,
        })
      }

      // Get withdrawal requests
      const { data: withdrawalData } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(20)

      setWithdrawals(withdrawalData || [])
    } catch (error) {
      console.error('Failed to fetch earnings:', error)
    } finally {
      setLoading(false)
    }
  }

  const requestWithdrawal = async () => {
    if (!storeId) return

    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0) {
      alert('Geçerli bir tutar girin')
      return
    }

    if (amount > balance.available) {
      alert('Bakiyeniz yetersiz')
      return
    }

    if (!withdrawIban || withdrawIban.length < 20) {
      alert('Geçerli bir IBAN girin')
      return
    }

    if (!withdrawAccountHolder.trim()) {
      alert('Hesap sahibi adını girin')
      return
    }

    if (!withdrawBankName.trim()) {
      alert('Banka adını girin')
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from('withdrawal_requests').insert({
        store_id: storeId,
        amount,
        net_amount: amount,
        iban: withdrawIban.replace(/\s/g, ''),
        account_holder: withdrawAccountHolder.trim(),
        bank_name: withdrawBankName.trim(),
        status: 'pending',
      })

      if (error) throw error

      alert('Çekim talebi oluşturuldu. Admin onayı bekleniyor.')
      setShowWithdrawForm(false)
      setWithdrawAmount('')
      setWithdrawIban('')
      setWithdrawAccountHolder('')
      setWithdrawBankName('')
      fetchEarnings()
    } catch (error: any) {
      console.error('Withdrawal error:', error)
      alert(error.message || 'Çekim talebi oluşturulamadı')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" />Tamamlandı</span>
      case 'approved': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3" />Onaylandı</span>
      case 'rejected': return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3" />Reddedildi</span>
      default: return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" />Beklemede</span>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Kazançlarım</h1>
          <p className="text-gray-600">Bakiye ve çekim işlemlerinizi yönetin</p>
        </div>
        <Button onClick={() => setShowWithdrawForm(!showWithdrawForm)} className="flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4" />
          Para Çek
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Kullanılabilir Bakiye</p>
                <p className="text-3xl font-bold text-green-600">₺{balance.available.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-gray-500 mt-1">Çekim yapılabilir</p>
              </div>
              <Wallet className="w-12 h-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Bekleyen Bakiye</p>
                <p className="text-3xl font-bold text-orange-600">₺{balance.pending.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-gray-500 mt-1">İşleme alınacak</p>
              </div>
              <Clock className="w-12 h-12 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Toplam Kazanç</p>
                <p className="text-3xl font-bold text-purple-600">₺{balance.total_earned.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                <p className="text-sm text-gray-500 mt-1">Tüm zamanlar</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Form */}
      {showWithdrawForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Para Çekim Talebi</CardTitle>
            <CardDescription>Bakiyenizden hesabınıza para çekin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tutar (₺)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={balance.available}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Maks: ₺{balance.available.toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">IBAN</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={withdrawIban}
                  onChange={(e) => setWithdrawIban(e.target.value)}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hesap Sahibi</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={withdrawAccountHolder}
                  onChange={(e) => setWithdrawAccountHolder(e.target.value)}
                  placeholder="Ad Soyad"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Banka Adı</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={withdrawBankName}
                  onChange={(e) => setWithdrawBankName(e.target.value)}
                  placeholder="Ziraat Bankası, İş Bankası, vb."
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={requestWithdrawal} disabled={submitting}>
                {submitting ? 'İşleniyor...' : 'Çekim Talebi Oluştur'}
              </Button>
              <Button variant="outline" onClick={() => setShowWithdrawForm(false)}>
                İptal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdrawal History */}
      <Card>
        <CardHeader>
          <CardTitle>Çekim Geçmişi</CardTitle>
          <CardDescription>Son çekim talepleriniz</CardDescription>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Henüz çekim talebi yok</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold text-sm">Tarih</th>
                    <th className="text-left p-3 font-semibold text-sm">Tutar</th>
                    <th className="text-left p-3 font-semibold text-sm">IBAN</th>
                    <th className="text-left p-3 font-semibold text-sm">Durum</th>
                    <th className="text-left p-3 font-semibold text-sm">Not</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm">{w.created_at ? new Date(w.created_at).toLocaleDateString('tr-TR') : '-'}</td>
                      <td className="p-3 text-sm font-semibold">₺{w.amount.toFixed(2)}</td>
                      <td className="p-3 text-xs font-mono">{w.iban}</td>
                      <td className="p-3">{getStatusBadge(w.status || 'pending')}</td>
                      <td className="p-3 text-sm text-gray-600">{w.admin_notes || '-'}</td>
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
