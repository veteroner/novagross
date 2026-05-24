'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@novagross/ui';
import { Button } from '@novagross/ui';
import { createClient } from '../../../lib/supabase/client';
import { BarChart, TrendingUp, Mail, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface EmailStats {
  totalSent: number;
  totalQueued: number;
  totalFailed: number;
  totalDelivered: number;
  avgDeliveryTime: number;
}

interface TemplateStats {
  template: string;
  totalSent: number;
  avgSentPerDay: number;
  lastSent: string;
}

export default function EmailAnalyticsPage() {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [templateStats, setTemplateStats] = useState<TemplateStats[]>([]);
  const [recentEmails, setRecentEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  const fetchAnalytics = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Calculate date range
      const now = new Date();
      let startDate: Date | null = null;
      
      switch (timeRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      // Fetch email queue stats
      const queueQuery = supabase
        .from('email_queue')
        .select('status, created_at, sent_at');
      
      if (startDate) {
        queueQuery.gte('created_at', startDate.toISOString());
      }

      const { data: queueData } = await queueQuery;

      if (queueData) {
        const totalSent = queueData.filter((e: any) => e.status === 'sent').length;
        const totalQueued = queueData.filter((e: any) => e.status === 'queued' || e.status === 'processing').length;
        const totalFailed = queueData.filter((e: any) => e.status === 'failed').length;

        // Calculate avg delivery time
        const deliveryTimes = queueData
          .filter((e: any) => e.sent_at && e.created_at)
          .map((e: any) => new Date(e.sent_at).getTime() - new Date(e.created_at).getTime());
        
        const avgDeliveryTime = deliveryTimes.length > 0
          ? deliveryTimes.reduce((a: number, b: number) => a + b, 0) / deliveryTimes.length / 1000
          : 0;

        setStats({
          totalSent,
          totalQueued,
          totalFailed,
          totalDelivered: totalSent,
          avgDeliveryTime: Math.round(avgDeliveryTime),
        });
      }

      // Fetch template analytics directly from email_queue
      const { data: templates } = await supabase
        .from('email_queue')
        .select('template, created_at, status');

      if (templates) {
        const templateMap = new Map<string, any>();
        
        templates.forEach((email: any) => {
          if (!templateMap.has(email.template)) {
            templateMap.set(email.template, {
              template: email.template,
              totalSent: 0,
              lastSent: email.created_at,
            });
          }
          
          const stats = templateMap.get(email.template);
          if (email.status === 'sent') stats.totalSent++;
          if (new Date(email.created_at) > new Date(stats.lastSent)) {
            stats.lastSent = email.created_at;
          }
        });

        const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 365;
        const templateArray = Array.from(templateMap.values()).map((t: any) => ({
          ...t,
          avgSentPerDay: Number((t.totalSent / days).toFixed(2)),
        }));

        setTemplateStats(templateArray.sort((a, b) => b.totalSent - a.totalSent));
      }

      // Fetch recent emails
      const recentQuery = supabase
        .from('email_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (startDate) {
        recentQuery.gte('created_at', startDate.toISOString());
      }

      const { data: recent } = await recentQuery;
      setRecentEmails(recent || []);

    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'queued':
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Mail className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      queued: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor email delivery and performance</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-2 bg-white rounded-lg border p-1">
            {(['24h', '7d', '30d', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  timeRange === range
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {range === '24h' ? '24H' : range === '7d' ? '7D' : range === '30d' ? '30D' : 'All'}
              </button>
            ))}
          </div>
          <Button onClick={fetchAnalytics} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sent</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSent.toLocaleString() || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Successfully delivered emails</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Queued</CardTitle>
            <Clock className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalQueued || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Pending delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
            <XCircle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFailed || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Delivery failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Delivery</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgDeliveryTime || 0}s</div>
            <p className="text-xs text-gray-500 mt-1">Average delivery time</p>
          </CardContent>
        </Card>
      </div>

      {/* Template Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            Template Performance
          </CardTitle>
          <CardDescription>Email templates ranked by usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Template</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Total Sent</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Avg/Day</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Last Sent</th>
                </tr>
              </thead>
              <tbody>
                {templateStats.map((template, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">{template.template}</code>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{template.totalSent}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{template.avgSentPerDay}</td>
                    <td className="py-3 px-4 text-right text-sm text-gray-500">
                      {new Date(template.lastSent).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
                {templateStats.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      No email templates used yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Emails */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Emails</CardTitle>
          <CardDescription>Latest email queue entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentEmails.map((email, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(email.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{email.to_email}</p>
                    <p className="text-sm text-gray-500 truncate">{email.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <code className="text-xs bg-white px-2 py-1 rounded border">{email.template}</code>
                  {getStatusBadge(email.status)}
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(email.created_at).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
            {recentEmails.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                No recent emails
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
