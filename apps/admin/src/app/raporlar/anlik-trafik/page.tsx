'use client'

import { useEffect, useState } from 'react'
import { Card, PageHeader, EmptyState } from '@novagross/ui'
import { Users, Eye, Monitor, Smartphone, Tablet, Activity } from 'lucide-react'

type RealtimeStats = {
  active_sessions: number
  active_page_views: number
  top_pages: Array<{
    page_url: string
    page_title: string
    views: number
  }>
  device_breakdown: Record<string, number>
  timestamp: string
}

const deviceIcons: Record<string, any> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: Activity,
}

export default function RealtimeTrafficPage() {
  const [stats, setStats] = useState<RealtimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/analytics/realtime')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const data = await response.json()
        setStats(data)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchStats()

    // Refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-red-600">Hata: {error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Anlık Trafik"
        description="Son 5 dakika içindeki aktif kullanıcılar"
        actions={
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Activity className="w-4 h-4 animate-pulse text-green-500" />
            <span>Canlı • {stats ? new Date(stats.timestamp).toLocaleTimeString('tr-TR') : ''}</span>
          </div>
        }
      />

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Aktif Oturumlar</p>
              <p className="text-4xl font-bold">{stats?.active_sessions || 0}</p>
              <p className="text-blue-100 text-sm mt-2">Benzersiz ziyaretçiler</p>
            </div>
            <Users className="w-16 h-16 text-blue-200 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">Aktif Sayfa Görüntülemeleri</p>
              <p className="text-4xl font-bold">{stats?.active_page_views || 0}</p>
              <p className="text-green-100 text-sm mt-2">Şu anda görüntülenen sayfalar</p>
            </div>
            <Eye className="w-16 h-16 text-green-200 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Device Breakdown */}
      <Card>
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Cihaz Dağılımı</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats?.device_breakdown || {}).map(([device, count]) => {
              const Icon = deviceIcons[device] || Activity
              return (
                <div key={device} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Icon className="w-8 h-8 text-gray-600" />
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-gray-600 capitalize">{device}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Top Pages */}
      <Card>
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Popüler Sayfalar</h2>
          <p className="text-sm text-gray-600">Son 5 dakikada en çok görüntülenen sayfalar</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-600">Sayfa</th>
                <th className="text-left py-3 px-6 font-medium text-gray-600">URL</th>
                <th className="text-right py-3 px-6 font-medium text-gray-600">Görüntülenme</th>
              </tr>
            </thead>
            <tbody>
              {stats?.top_pages && stats.top_pages.length > 0 ? (
                stats.top_pages.map((page, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-6">
                      <p className="font-medium">{page.page_title || 'Başlıksız'}</p>
                    </td>
                    <td className="py-3 px-6">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {page.page_url}
                      </code>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <span className="font-bold text-lg">{page.views}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-0">
                    <EmptyState compact icon={Eye} title="Henüz veri yok" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Anlık Trafik Hakkında</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Veriler 10 saniyede bir otomatik güncellenir</li>
            <li>• Son 5 dakika içindeki aktif kullanıcıları gösterir</li>
            <li>• Oturum süresi dolunca kullanıcı pasif sayılır</li>
            <li>• Detaylı analytics için Google Analytics Dashboard'unu kullanabilirsiniz</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
