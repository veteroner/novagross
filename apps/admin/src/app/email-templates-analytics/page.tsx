import { Card, Badge } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'
import { BarChart3, Mail, MousePointerClick, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

type TemplateAnalytics = {
  id: string
  template: string
  period: string
  sent_count: number
  delivered_count: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  unsubscribed_count: number
  open_rate: string | null
  click_rate: string | null
  bounce_rate: string | null
}

function toPercent(value: string | null) {
  if (!value) return '-'
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return `${n.toFixed(2)}%`
}

export default async function EmailTemplatesAnalyticsPage() {
  await requireAdmin('/email-templates-analytics')

  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('email_templates_analytics')
    .select('*')
    .order('period', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Error fetching email_templates_analytics:', error)
  }

  const totalSent = (rows || []).reduce((sum, r) => sum + (r.sent_count || 0), 0)
  const totalOpened = (rows || []).reduce((sum, r) => sum + (r.opened_count || 0), 0)
  const totalClicked = (rows || []).reduce((sum, r) => sum + (r.clicked_count || 0), 0)
  const totalBounced = (rows || []).reduce((sum, r) => sum + (r.bounced_count || 0), 0)

  const openRate = totalSent > 0 ? `${((totalOpened / totalSent) * 100).toFixed(1)}%` : '0.0%'
  const clickRate = totalSent > 0 ? `${((totalClicked / totalSent) * 100).toFixed(1)}%` : '0.0%'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">E-posta Şablon Analitiği</h1>
        <p className="text-gray-600 mt-1">Şablon bazlı günlük gönderim/açılma/tıklama metrikleri</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gönderim</p>
              <p className="text-2xl font-bold">{totalSent}</p>
            </div>
            <Mail className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Açılma</p>
              <p className="text-2xl font-bold">{openRate}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tıklama</p>
              <p className="text-2xl font-bold">{clickRate}</p>
            </div>
            <MousePointerClick className="w-8 h-8 text-purple-500" />
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
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Şablon</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Tarih</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Sent</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Delivered</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Opened</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Clicked</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Unsub</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Open Rate</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Click Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows && rows.length > 0 ? (
                (rows as TemplateAnalytics[]).map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{row.template}</code>
                    </td>
                    <td className="py-3 px-4 text-sm">{row.period}</td>
                    <td className="py-3 px-4 text-sm text-right">{row.sent_count}</td>
                    <td className="py-3 px-4 text-sm text-right">{row.delivered_count}</td>
                    <td className="py-3 px-4 text-sm text-right">{row.opened_count}</td>
                    <td className="py-3 px-4 text-sm text-right">{row.clicked_count}</td>
                    <td className="py-3 px-4 text-sm text-right">{row.unsubscribed_count}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <Badge variant="secondary">{toPercent(row.open_rate)}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <Badge variant="secondary">{toPercent(row.click_rate)}</Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    Henüz analitik kaydı bulunmuyor
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
