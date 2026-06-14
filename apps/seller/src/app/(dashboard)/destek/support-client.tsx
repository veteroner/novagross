'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Badge } from '@novagross/ui'
import { Loader2, Send } from 'lucide-react'
import { getTicketMessages, replyToTicket } from './actions'

type Ticket = {
  id: string
  ticket_no: string
  source: string
  customer_name: string | null
  customer_email: string | null
  category: string
  subject: string | null
  summary: string | null
  status: string
  priority: string
}
type Msg = { id: string; role: string; sender_name: string | null; content: string; created_at: string }

const STATUS_LABEL: Record<string, string> = {
  open: 'Açık', in_progress: 'İşlemde', waiting_customer: 'Müşteri bekleniyor', resolved: 'Çözüldü', closed: 'Kapandı',
}

export function SellerSupportClient({ tickets }: { tickets: Ticket[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  const open = async (t: Ticket) => {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1 p-0 max-h-[70vh] overflow-y-auto">
        {tickets.map((t) => (
          <button
            key={t.id}
            onClick={() => open(t)}
            className={`w-full text-left px-3 py-3 border-b hover:bg-green-50/50 ${selected?.id === t.id ? 'bg-green-50' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-500">{t.ticket_no}</span>
              <Badge variant="secondary" className="text-[10px]">{t.source === 'seller' ? 'Benim talebim' : 'Müşteri'}</Badge>
            </div>
            <p className="text-sm font-medium truncate mt-0.5">{t.subject || '(konu yok)'}</p>
            <span className="text-[11px] text-muted-foreground">{STATUS_LABEL[t.status]}</span>
          </button>
        ))}
      </Card>

      <Card className="lg:col-span-2 p-4 flex flex-col min-h-[400px] max-h-[70vh]">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Soldan bir talep seçin</div>
        ) : (
          <>
            <div className="border-b pb-3 mb-3">
              <p className="font-semibold">{selected.subject}</p>
              <p className="text-xs text-muted-foreground">
                {selected.ticket_no} · {selected.customer_name || '-'} {selected.customer_email ? `· ${selected.customer_email}` : ''}
              </p>
              {selected.summary && <p className="text-xs text-gray-600 mt-1">{selected.summary}</p>}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {loadingMsgs ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.role === 'user' ? 'bg-gray-100' : m.role === 'agent' ? 'bg-green-100' : 'bg-green-50 border'
                    }`}>
                      <p className="text-[10px] text-gray-500 mb-0.5">{m.role === 'user' ? (selected.source === 'seller' ? 'Ben' : 'Müşteri') : m.role === 'agent' ? (m.sender_name || 'Yetkili') : 'AI Asistan'}</p>
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {selected.source === 'customer' && (
              <div className="border-t pt-3 mt-3 flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  placeholder="Müşteriye yanıt yazın (e-posta gönderilir)…"
                  className="flex-1 resize-none border rounded-lg px-3 py-2 text-sm"
                />
                <Button onClick={onReply} disabled={sending || !reply.trim()} style={{ backgroundColor: '#16A34A' }} className="text-white">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
