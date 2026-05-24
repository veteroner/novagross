'use client'

import { useState } from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@novagross/ui'
import { Download, Mail, Users, TrendingUp } from 'lucide-react'

type Subscriber = {
  id: string
  email: string
  newsletters: boolean | null
  marketing: boolean | null
  product_updates: boolean | null
  unsubscribed_all: boolean | null
  created_at: string | null
  updated_at: string | null
}

type Props = {
  initialSubscribers: Subscriber[]
}

export function EmailSubscribersClient({ initialSubscribers }: Props) {
  const [subscribers] = useState(initialSubscribers)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredSubscribers = subscribers.filter((sub) =>
    sub.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: subscribers.length,
    activeNewsletters: subscribers.filter((s) => s.newsletters && !s.unsubscribed_all).length,
    activeMarketing: subscribers.filter((s) => s.marketing && !s.unsubscribed_all).length,
    unsubscribed: subscribers.filter((s) => s.unsubscribed_all).length,
  }

  const exportToCSV = () => {
    const headers = ['E-posta', 'Bülten', 'Pazarlama', 'Kayıt Tarihi']
    const rows = filteredSubscribers.map((sub) => [
      sub.email,
      sub.newsletters ? 'Evet' : 'Hayır',
      sub.marketing ? 'Evet' : 'Hayır',
      sub.created_at ? new Date(sub.created_at).toLocaleDateString('tr-TR') : '-',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `aboneler-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">E-posta Aboneleri</h1>
          <p className="text-muted-foreground">Bültene abone olan kullanıcıları yönetin</p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="mr-2 h-4 w-4" />
          CSV İndir
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Abone</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bülten Abonesi</p>
                <p className="text-2xl font-bold">{stats.activeNewsletters}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pazarlama İzni</p>
                <p className="text-2xl font-bold">{stats.activeMarketing}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Abonelikten Çıkan</p>
                <p className="text-2xl font-bold">{stats.unsubscribed}</p>
              </div>
              <Mail className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscribers List */}
      <Card>
        <CardHeader>
          <CardTitle>Abone Listesi</CardTitle>
          <div className="mt-4">
            <input
              type="text"
              placeholder="E-posta ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-96 px-4 py-2 border rounded-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">E-posta</th>
                  <th className="text-left py-3 px-4">Bülten</th>
                  <th className="text-left py-3 px-4">Pazarlama</th>
                  <th className="text-left py-3 px-4">Ürün Güncellemeleri</th>
                  <th className="text-left py-3 px-4">Kayıt Tarihi</th>
                  <th className="text-left py-3 px-4">Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Abone bulunamadı' : 'Henüz abone yok'}
                    </td>
                  </tr>
                ) : (
                  filteredSubscribers.map((subscriber) => (
                    <tr key={subscriber.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{subscriber.email}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          subscriber.newsletters ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {subscriber.newsletters ? 'Evet' : 'Hayır'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          subscriber.marketing ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {subscriber.marketing ? 'Evet' : 'Hayır'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          subscriber.product_updates ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {subscriber.product_updates ? 'Evet' : 'Hayır'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {subscriber.created_at ? new Date(subscriber.created_at).toLocaleDateString('tr-TR') : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          subscriber.unsubscribed_all ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {subscriber.unsubscribed_all ? 'İptal' : 'Aktif'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
