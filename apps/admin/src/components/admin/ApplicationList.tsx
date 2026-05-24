'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@novagross/ui/button'
import { Input } from '@novagross/ui/input'
import { Badge } from '@novagross/ui/badge'
import { useAuth } from '@/hooks/useAuth'

interface Application {
  id: string
  user_id: string
  store_name: string
  company_name: string | null
  tax_number: string | null
  description: string | null
  identity_document_url: string | null
  tax_certificate_url: string | null
  status: string
  created_at: string
  profiles: {
    id: string
    email: string | null
    first_name: string | null
    last_name: string | null
  }
}

interface ApplicationListProps {
  applications: Application[]
}

export function ApplicationList({ applications: initialApplications }: ApplicationListProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [applications, setApplications] = useState(initialApplications)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const handleApprove = async (application: Application) => {
    if (!user) {
      alert('❌ Lütfen önce giriş yapın')
      return
    }

    if (!confirm(`${application.store_name} mağazasını onaylamak istediğinizden emin misiniz?`)) {
      return
    }

    setIsApproving(true)
    
    try {
      const response = await fetch('/api/seller/applications/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: application.id }),
      })

      const data = await response.json().catch(() => ({} as any))
      if (!response.ok) {
        throw new Error(data?.error || 'Başvuru onaylanamadı')
      }

      // Remove from list
      setApplications(prev => prev.filter(app => app.id !== application.id))
      alert('✅ Başvuru onaylandı ve mağaza oluşturuldu!')
      router.refresh()
    } catch (error: any) {
      console.error('Onay hatası:', error)
      alert(error.message || 'Başvuru onaylanamadı.')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!user) {
      alert('❌ Lütfen önce giriş yapın')
      return
    }

    if (!selectedApp || !rejectionReason.trim()) {
      alert('Lütfen red nedeni belirtin')
      return
    }

    setIsRejecting(true)

    try {
      const response = await fetch('/api/seller/applications/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedApp.id,
          reason: rejectionReason,
        }),
      })

      const data = await response.json().catch(() => ({} as any))
      if (!response.ok) {
        throw new Error(data?.error || 'Başvuru reddedilemedi')
      }

      // Remove from list
      setApplications(prev => prev.filter(app => app.id !== selectedApp.id))
      setSelectedApp(null)
      setRejectionReason('')
      alert('❌ Başvuru reddedildi.')
      router.refresh()
    } catch (error: any) {
      console.error('Red hatası:', error)
      alert(error.message || 'Başvuru reddedilemedi.')
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {applications.map((app) => (
          <div
            key={app.id}
            className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  {app.store_name}
                </h3>
                <p className="text-sm text-gray-600">
                  {app.profiles?.first_name || ''} {app.profiles?.last_name || ''} • {app.profiles?.email || 'Email yok'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Başvuru: {new Date(app.created_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <Badge variant="warning">Bekliyor</Badge>
            </div>

            {app.description && (
              <p className="text-gray-700 mb-4 text-sm">
                {app.description}
              </p>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
              {app.company_name && (
                <div>
                  <span className="font-medium text-gray-700">Şirket:</span>{' '}
                  {app.company_name}
                </div>
              )}
              {app.tax_number && (
                <div>
                  <span className="font-medium text-gray-700">Vergi No:</span>{' '}
                  {app.tax_number}
                </div>
              )}
            </div>

            <div className="flex gap-4 mb-4">
              {app.identity_document_url && (
                <a
                  href={app.identity_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  📄 Kimlik Belgesi
                </a>
              )}
              {app.tax_certificate_url && (
                <a
                  href={app.tax_certificate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  📄 Vergi Levhası
                </a>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => handleApprove(app)}
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApproving ? 'Onaylanıyor...' : '✓ Onayla'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedApp(app)}
                disabled={isRejecting}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                ✗ Reddet
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Rejection Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">
              Başvuruyu Reddet
            </h3>
            <p className="text-gray-600 mb-4">
              <strong>{selectedApp.store_name}</strong> başvurusunu neden reddediyorsunuz?
            </p>
            
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Red nedeni..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleReject}
                disabled={isRejecting || !rejectionReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {isRejecting ? 'Reddediliyor...' : 'Reddet'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedApp(null)
                  setRejectionReason('')
                }}
                disabled={isRejecting}
              >
                İptal
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
