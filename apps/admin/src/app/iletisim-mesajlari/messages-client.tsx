'use client'

import { useState, useTransition } from 'react'
import { Card, Badge, Button, PageHeader, EmptyState, StatCard, TabBar, type TabItem } from '@novagross/ui'
import {
  Mail,
  Phone,
  Clock,
  CheckCircle,
  MessageSquare,
  X,
  Reply,
  Trash2,
  Loader2,
  Eye,
  Archive,
} from 'lucide-react'
import {
  updateMessageStatus,
  updateMessageNotes,
  deleteMessage,
  type MessageStatus,
} from './actions'

export type Message = {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  status: MessageStatus
  admin_notes: string | null
  created_at: string | null
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

function statusBadge(status: MessageStatus) {
  switch (status) {
    case 'new':
      return <Badge className="bg-orange-500">Yeni</Badge>
    case 'read':
      return <Badge variant="secondary">Okundu</Badge>
    case 'replied':
      return <Badge variant="success">Yanıtlandı</Badge>
    case 'archived':
      return <Badge variant="outline">Arşiv</Badge>
  }
}

export function MessagesClient({ messages }: { messages: Message[] }) {
  const [selected, setSelected] = useState<Message | null>(null)
  const [notes, setNotes] = useState('')
  const [filter, setFilter] = useState<MessageStatus | 'all'>('all')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const totalMessages = messages.length
  const newMessages = messages.filter((m) => m.status === 'new').length
  const readMessages = messages.filter((m) => m.status === 'read').length
  const repliedMessages = messages.filter((m) => m.status === 'replied').length
  const archivedMessages = messages.filter((m) => m.status === 'archived').length

  const filteredMessages = filter === 'all' ? messages : messages.filter((m) => m.status === filter)

  const tabs: TabItem[] = [
    { key: 'all', label: 'Tümü', count: totalMessages },
    { key: 'new', label: 'Yeni', count: newMessages },
    { key: 'read', label: 'Okundu', count: readMessages },
    { key: 'replied', label: 'Yanıtlandı', count: repliedMessages },
    { key: 'archived', label: 'Arşiv', count: archivedMessages },
  ]

  const openDetail = (m: Message) => {
    setSelected(m)
    setNotes(m.admin_notes ?? '')
    setError(null)
    // Auto-mark as read when opening a new message
    if (m.status === 'new') {
      startTransition(async () => {
        try {
          await updateMessageStatus(m.id, 'read')
        } catch {
          /* swallow — UI not blocked */
        }
      })
    }
  }

  const close = () => {
    setSelected(null)
    setNotes('')
    setError(null)
  }

  const onChangeStatus = (status: MessageStatus) => {
    if (!selected) return
    startTransition(async () => {
      try {
        await updateMessageStatus(selected.id, status)
        setSelected({ ...selected, status })
      } catch (err: any) {
        setError(err?.message ?? 'Durum güncellenemedi.')
      }
    })
  }

  const onSaveNotes = () => {
    if (!selected) return
    startTransition(async () => {
      try {
        await updateMessageNotes(selected.id, notes)
        setSelected({ ...selected, admin_notes: notes.trim() || null })
      } catch (err: any) {
        setError(err?.message ?? 'Not kaydedilemedi.')
      }
    })
  }

  const onDelete = () => {
    if (!selected) return
    if (!confirm(`"${selected.subject}" mesajını silmek istediğine emin misin?`)) return
    startTransition(async () => {
      try {
        await deleteMessage(selected.id)
        close()
      } catch (err: any) {
        setError(err?.message ?? 'Silinemedi.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="İletişim Mesajları"
        description="Müşteri mesajlarını görüntüleyin ve yanıtlayın"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Toplam Mesaj"
          value={totalMessages}
          icon={MessageSquare}
          iconColor="text-blue-500"
        />
        <StatCard
          label="Yeni"
          value={newMessages}
          icon={Clock}
          iconColor="text-orange-500"
          emphasis="warning"
        />
        <StatCard
          label="Yanıtlandı"
          value={repliedMessages}
          icon={CheckCircle}
          iconColor="text-green-500"
        />
      </div>

      <TabBar items={tabs} value={filter} onChange={(k) => setFilter(k as any)} />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-600">
              <tr>
                <th className="text-left py-3 px-4 font-medium">İsim</th>
                <th className="text-left py-3 px-4 font-medium">İletişim</th>
                <th className="text-left py-3 px-4 font-medium">Konu</th>
                <th className="text-left py-3 px-4 font-medium">Mesaj</th>
                <th className="text-center py-3 px-4 font-medium">Durum</th>
                <th className="text-left py-3 px-4 font-medium">Tarih</th>
                <th className="text-right py-3 px-4 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      compact
                      icon={MessageSquare}
                      title={filter === 'all' ? 'Henüz mesaj yok' : 'Bu durumda mesaj yok'}
                    />
                  </td>
                </tr>
              ) : (
                filteredMessages.map((m) => (
                  <tr
                    key={m.id}
                    className={`border-b hover:bg-gray-50 cursor-pointer ${
                      m.status === 'new' ? 'bg-orange-50/40' : ''
                    }`}
                    onClick={() => openDetail(m)}
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium">{m.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <span>{m.email}</span>
                        </div>
                        {m.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{m.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{m.subject}</p>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <p className="text-gray-600 line-clamp-2">{m.message}</p>
                    </td>
                    <td className="py-3 px-4 text-center">{statusBadge(m.status)}</td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {formatDate(m.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openDetail(m)
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Görüntüle
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
          onClick={close}
        >
          <Card
            className="w-full max-w-2xl my-12 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">{selected.subject}</h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                  <span>{selected.name}</span>
                  <span>·</span>
                  <span>{formatDate(selected.created_at)}</span>
                  <span>·</span>
                  {statusBadge(selected.status)}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={close}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <a
                  href={`mailto:${selected.email}`}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="h-3 w-3" />
                  {selected.email}
                </a>
                {selected.phone && (
                  <a
                    href={`tel:${selected.phone}`}
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Phone className="h-3 w-3" />
                    {selected.phone}
                  </a>
                )}
              </div>

              <div className="bg-gray-50 rounded-md p-4 border">
                <p className="whitespace-pre-wrap text-gray-800">{selected.message}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Admin Notları</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Bu mesajla ilgili dahili notlar…"
                  disabled={isPending}
                />
                <div className="flex justify-end mt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onSaveNotes}
                    disabled={isPending || (notes ?? '') === (selected.admin_notes ?? '')}
                  >
                    Notu Kaydet
                  </Button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex flex-wrap items-center gap-2">
              <a
                href={`mailto:${selected.email}?subject=${encodeURIComponent(
                  'Re: ' + selected.subject
                )}&body=${encodeURIComponent(
                  `\n\n---\n${selected.message}`
                )}`}
                onClick={() => onChangeStatus('replied')}
              >
                <Button size="sm">
                  <Reply className="h-3 w-3 mr-1" />
                  E-posta ile Yanıtla
                </Button>
              </a>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onChangeStatus('replied')}
                disabled={isPending || selected.status === 'replied'}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Yanıtlandı İşaretle
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onChangeStatus('archived')}
                disabled={isPending || selected.status === 'archived'}
              >
                <Archive className="h-3 w-3 mr-1" />
                Arşivle
              </Button>
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={onDelete}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  <span className="ml-1">Sil</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
