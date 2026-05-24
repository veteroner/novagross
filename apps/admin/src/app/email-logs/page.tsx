import Link from 'next/link'
import { Card, Badge, Button } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'
import { Mail, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

type EmailLog = {
  id: string
  recipient: string
  template: string
  subject: string
  status: string
  error: string | null
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  created_at: string
}

const statusIcons: Record<string, any> = {
  sent: CheckCircle,
  delivered: CheckCircle,
  opened: Mail,
  clicked: Mail,
  failed: XCircle,
  bounced: AlertTriangle,
  pending: Clock,
}

const statusColors: Record<string, string> = {
  sent: 'success',
  delivered: 'success',
  opened: 'success',
  clicked: 'success',
  failed: 'destructive',
  bounced: 'destructive',
  pending: 'secondary',
}

function formatDate(isoDate: string | null) {
  if (!isoDate) return '-'
  const date = new Date(isoDate)
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function EmailLogsPage() {
  await requireAdmin('/email-logs')

  const supabase = await createClient()

  // Fetch email logs
  const { data: logs, error } = await supabase
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching email logs:', error)
  }

  // Calculate stats
  const totalSent = logs?.filter(l => ['sent', 'delivered', 'opened', 'clicked'].includes(l.status)).length || 0
  const totalFailed = logs?.filter(l => l.status === 'failed').length || 0
  const totalBounced = logs?.filter(l => l.status === 'bounced').length || 0
  const openRate = logs && logs.length > 0 
    ? ((logs.filter(l => l.opened_at).length / logs.length) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">E-posta Logları</h1>
          <p className="text-gray-600 mt-1">Gönderilen e-postaların detaylı kayıtları</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/email-templates-analytics">Şablon Analitiği</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/email-unsubscribes">Çıkışlar</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gönderilen</p>
              <p className="text-2xl font-bold">{totalSent}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Başarısız</p>
              <p className="text-2xl font-bold">{totalFailed}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bounce</p>
              <p className="text-2xl font-bold">{totalBounced}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Açılma Oranı</p>
              <p className="text-2xl font-bold">{openRate}%</p>
            </div>
            <Mail className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Email Logs Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Alıcı</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Şablon</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Konu</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Durum</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Gönderim</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Açılma</th>
              </tr>
            </thead>
            <tbody>
              {logs && logs.length > 0 ? (
                logs.map((log) => {
                  const StatusIcon = statusIcons[log.status] || Clock
                  return (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-sm">{log.recipient}</p>
                          {log.error && (
                            <p className="text-xs text-red-600 mt-1">{log.error}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {log.template}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm">{log.subject}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <StatusIcon className="w-4 h-4" />
                          <Badge variant={statusColors[log.status] as any}>
                            {log.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {formatDate(log.sent_at || log.created_at)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {log.opened_at ? (
                          <span className="text-green-600">✓ {formatDate(log.opened_at)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Henüz e-posta logu bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
