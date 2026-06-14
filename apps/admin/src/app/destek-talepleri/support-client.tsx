'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Badge, PageHeader } from '@novagross/ui'
import { Loader2, Send, Inbox } from 'lucide-react'
import { replyToTicket, setTicketStatus, getTicketMessages } from './actions'

type Ticket = {
  id: string
  ticket_no: string
  source: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  store_id: string | null
  order_id: string | null
  category: string
  subject: string | null
  summary: string | null
  status: string
  priority: string
  route_to: string
  created_at: string
}
type Msg = { id: string; role: string; sender_name: string | null; content: string; created_at: string }

const STATUS_LABEL: Record<string, string> = {
  open: 'Açık', in_progress: 'İşlemde', waiting_customer: 'Müşteri bekleniyor', resolved: 'Çözüldü', closed: 'Kapandı',
}
const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600', normal: 'bg-blue-100 text-blue-700', high: 'bg-amber-100 text-amber-700', urgent: 'bg-red-100 text-red-700',
}
const FILTERS = [
  { key: 'active', label: 'Aktif' },
  { key: 'open', label: 'Açık' },
  { key: 'resolved', label: 'Çözüldü' },
  { key: 'closed', label: 'Kapandı' },
  { key: 'all', label: 'Tümü' },
]

export function SupportClient({
  tickets,
  storeNames,
  statusFilter,
}: {
  tickets: Ticket[]
  storeNames: Record<string, string>
  statusFilter: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const openTicket = async (t: Ticket) => {
    setSelected(t)
    setMessages([])
    setLoadingMsgs(true)
    try {
      setMessages(await getTicketMessages(t.id))
    } finally {
      setLoadingMsgs(false)
    }
  }

  const onReply = async () => {
    if (!selected || !reply.trim()) return
    setSending(true)
    try {
      await replyToTicket(selected.id, reply)
      setReply('')
      setMessages(await getTicketMessages(selected.id))
      router.refresh()
    } catch (e: any) {
      alert(e?.message || 'Hata')
    } finally {
      setSending(false)
    }
  }

  const changeStatus = async (status: string) => {
    if (!selected) return
    await setTicketStatus(selected.id, status)
    setSelected({ ...selected, status })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Destek Talepleri" description="AI asistanın oluşturduğu müşteri ve satıcı talepleri" />

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <a
            key={f.key}
            href={`/destek-talepleri?status=${f.key}`}
            className={`text-sm px-3 py-1.5 rounded-md border ${statusFilter === f.key ? 'bg-orange-600 text-white border-orange-600' : 'bg-white'}`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liste */}
        <Card className="lg:col-span-1 p-0 max-h-[70vh] overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-2 text-gray-300" /> Talep yok
            </div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => openTicket(t)}
                className={`w-full text-left px-3 py-3 border-b hover:bg-orange-50/50 ${selected?.id === t.id ? 'bg-orange-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-gray-500">{t.ticket_no}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                </div>
                <p className="text-sm font-medium truncate mt-0.5">{t.subject || '(konu yok)'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{t.source === 'seller' ? 'Satıcı' : 'Müşteri'}</Badge>
                  <span className="text-[11px] text-muted-foreground">{STATUS_LABEL[t.status]}</span>
                  {t.store_id && storeNames[t.store_id] && <span className="text-[11px] text-muted-foreground truncate">· {storeNames[t.store_id]}</span>}
                </div>
              </button>
            ))
          )}
        </Card>

        {/* Detay */}
        <Card className="lg:col-span-2 p-4 flex flex-col min-h-[400px] max-h-[70vh]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Soldan bir talep seçin
            </div>
          ) : (
            <>
              <div className="border-b pb-3 mb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold">{selected.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {selected.ticket_no} · {selected.customer_name || '-'} {selected.customer_email ? `· ${selected.customer_email}` : ''} {selected.customer_phone ? `· ${selected.customer_phone}` : ''}
                    </p>
                    {selected.summary && <p className="text-xs text-gray-600 mt-1">{selected.summary}</p>}
                  </div>
                  <select
                    value={selected.status}
                    onChange={(e) => changeStatus(e.target.value)}
                    className="text-sm border rounded-md px-2 py-1"
                  >
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {loadingMsgs ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                        m.role === 'user' ? 'bg-gray-100' : m.role === 'agent' ? 'bg-green-100' : 'bg-orange-50 border'
                      }`}>
                        <p className="text-[10px] text-gray-500 mb-0.5">{m.role === 'user' ? 'Kullanıcı' : m.role === 'agent' ? (m.sender_name || 'Yetkili') : 'AI Asistan'}</p>
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-3 mt-3 flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  placeholder="Yanıt yazın (müşteriye e-posta gönderilir)…"
                  className="flex-1 resize-none border rounded-lg px-3 py-2 text-sm"
                />
                <Button onClick={onReply} disabled={sending || !reply.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
