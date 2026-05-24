'use client'

import { useState } from 'react'
import { approveWithdrawalRequest, rejectWithdrawalRequest } from '@novagross/database/store-queries'
import { Button } from '@novagross/ui/button'
import { Input } from '@novagross/ui/input'
import { Badge } from '@novagross/ui/badge'

type WithdrawalRequest = {
  id: string
  store_id: string
  amount: number
  fee: number
  net_amount: number
  status: string
  bank_name: string
  iban: string
  account_holder: string
  rejection_reason: string | null
  admin_notes: string | null
  transaction_id: string | null
  requested_at: string
  processed_at: string | null
  created_at: string
  store: {
    id: string
    store_name: string
    store_slug: string
    owner: {
      id: string
      email: string | null
      first_name: string | null
      last_name: string | null
    }
  }
}

type Props = {
  requests: WithdrawalRequest[]
  adminId: string
}

export default function WithdrawalList({ requests: initialRequests, adminId }: Props) {
  const [requests, setRequests] = useState(initialRequests)
  const [filter, setFilter] = useState<string>('all')
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form states
  const [transactionId, setTransactionId] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const filteredRequests = filter === 'all'
    ? requests
    : requests.filter(req => req.status === filter)

  const handleApprove = async () => {
    if (!selectedRequest || !transactionId.trim()) {
      alert('Lütfen banka işlem numarasını girin')
      return
    }

    setLoading(true)
    try {
      await approveWithdrawalRequest(
        selectedRequest.id,
        adminId,
        transactionId,
        adminNotes || undefined
      )

      // Update local state
      setRequests(prevRequests =>
        prevRequests.map(req =>
          req.id === selectedRequest.id
            ? { ...req, status: 'completed', transaction_id: transactionId }
            : req
        )
      )

      setShowApproveModal(false)
      setSelectedRequest(null)
      setTransactionId('')
      setAdminNotes('')
      alert('Para çekme talebi onaylandı!')
    } catch (error: unknown) {
      console.error('Error approving withdrawal:', error)
      alert('Hata oluştu: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      alert('Lütfen red sebebini girin')
      return
    }

    setLoading(true)
    try {
      await rejectWithdrawalRequest(
        selectedRequest.id,
        adminId,
        rejectionReason,
        adminNotes || undefined
      )

      // Update local state
      setRequests(prevRequests =>
        prevRequests.map(req =>
          req.id === selectedRequest.id
            ? { ...req, status: 'rejected', rejection_reason: rejectionReason }
            : req
        )
      )

      setShowRejectModal(false)
      setSelectedRequest(null)
      setRejectionReason('')
      setAdminNotes('')
      alert('Para çekme talebi reddedildi!')
    } catch (error: unknown) {
      console.error('Error rejecting withdrawal:', error)
      alert('Hata oluştu: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      pending: 'default',
      processing: 'secondary',
      completed: 'outline',
      rejected: 'destructive'
    }

    const labels: Record<string, string> = {
      pending: 'Beklemede',
      processing: 'İşleniyor',
      completed: 'Tamamlandı',
      rejected: 'Reddedildi'
    }

    return (
      <Badge variant={variants[status] || 'default'}>
        {labels[status] || status}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Tümü ({requests.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          Beklemede ({requests.filter(r => r.status === 'pending').length})
        </Button>
        <Button
          variant={filter === 'processing' ? 'default' : 'outline'}
          onClick={() => setFilter('processing')}
        >
          İşleniyor ({requests.filter(r => r.status === 'processing').length})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          onClick={() => setFilter('completed')}
        >
          Tamamlandı ({requests.filter(r => r.status === 'completed').length})
        </Button>
        <Button
          variant={filter === 'rejected' ? 'default' : 'outline'}
          onClick={() => setFilter('rejected')}
        >
          Reddedildi ({requests.filter(r => r.status === 'rejected').length})
        </Button>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground">Bu filtrede talep bulunmuyor.</p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className="border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{request.store.store_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {request.store?.owner?.first_name || ''} {request.store?.owner?.last_name || ''}
                    {request.store?.owner?.email && ` • ${request.store.owner.email}`}
                  </p>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Talep Tutarı</p>
                  <p className="font-semibold">{formatCurrency(request.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">İşlem Ücreti</p>
                  <p className="font-semibold text-red-600">-{formatCurrency(request.fee)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Tutar</p>
                  <p className="font-semibold text-green-600">{formatCurrency(request.net_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Talep Tarihi</p>
                  <p className="font-semibold text-sm">{formatDate(request.requested_at)}</p>
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-md mb-4">
                <h4 className="font-medium mb-2">Banka Bilgileri</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Banka:</span>{' '}
                    <span className="font-medium">{request.bank_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">IBAN:</span>{' '}
                    <span className="font-mono">{request.iban}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hesap Sahibi:</span>{' '}
                    <span className="font-medium">{request.account_holder}</span>
                  </div>
                </div>
              </div>

              {request.transaction_id && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">İşlem Numarası</p>
                  <p className="font-mono">{request.transaction_id}</p>
                </div>
              )}

              {request.rejection_reason && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm font-medium text-destructive">Red Sebebi:</p>
                  <p className="text-sm">{request.rejection_reason}</p>
                </div>
              )}

              {request.admin_notes && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-900">Admin Notu:</p>
                  <p className="text-sm text-blue-800">{request.admin_notes}</p>
                </div>
              )}

              {request.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={() => {
                      setSelectedRequest(request)
                      setShowApproveModal(true)
                    }}
                  >
                    ✓ Onayla
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setSelectedRequest(request)
                      setShowRejectModal(true)
                    }}
                  >
                    ✗ Reddet
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Para Çekme Talebini Onayla</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm font-medium mb-1">Mağaza</p>
                <p>{selectedRequest.store.store_name}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Net Tutar</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(selectedRequest.net_amount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Banka İşlem Numarası <span className="text-red-500">*</span>
                </label>
                <Input
                  value={transactionId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransactionId(e.target.value)}
                  placeholder="Örn: TRX123456789"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Admin Notu (Opsiyonel)</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ekstra not..."
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={loading || !transactionId.trim()}
                className="flex-1"
              >
                {loading ? 'İşleniyor...' : 'Onayla'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowApproveModal(false)
                  setSelectedRequest(null)
                  setTransactionId('')
                  setAdminNotes('')
                }}
                disabled={loading}
              >
                İptal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Para Çekme Talebini Reddet</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm font-medium mb-1">Mağaza</p>
                <p>{selectedRequest.store.store_name}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Tutar</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(selectedRequest.amount)}
                </p>
                <p className="text-sm text-yellow-600 mt-1">
                  ⚠️ Tutar satıcının bakiyesine iade edilecektir
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Red Sebebi <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Neden reddedildiğini açıklayın..."
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Admin Notu (Opsiyonel)</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Dahili not..."
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={loading || !rejectionReason.trim()}
                className="flex-1"
              >
                {loading ? 'İşleniyor...' : 'Reddet'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false)
                  setSelectedRequest(null)
                  setRejectionReason('')
                  setAdminNotes('')
                }}
                disabled={loading}
              >
                İptal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
