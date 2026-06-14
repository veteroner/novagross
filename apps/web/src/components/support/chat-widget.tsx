'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Loader2, Headphones } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string }

const GREETING: Msg = {
  role: 'assistant',
  content:
    'Merhaba! Novagross destek asistanıyım 👋 Sipariş, kargo, iade veya başka bir konuda nasıl yardımcı olabilirim?',
}

export function SupportChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ticketNo, setTicketNo] = useState<string | null>(null)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const next = [...messages, { role: 'user' as const, content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: next.filter((m) => m.content !== GREETING.content),
          ticketId,
          orderNumber: orderNumber.trim() || null,
          contact: { email: email.trim() || null },
        }),
      })
      const data = await res.json()
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || 'Talebinizi aldım.' }])
      if (data.ticketId) setTicketId(data.ticketId)
      if (data.ticketNo) setTicketNo(data.ticketNo)
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Bağlantı sorunu oluştu, lütfen tekrar deneyin.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Açma butonu */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Destek sohbetini aç"
          className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full px-4 py-3 shadow-lg text-white"
          style={{ backgroundColor: '#FF6000' }}
        >
          <Headphones className="h-5 w-5" />
          <span className="hidden sm:inline text-sm font-medium">Yardım</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-[60] w-[92vw] max-w-sm h-[70vh] max-h-[560px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border">
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: '#FF6000' }}>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold leading-tight">Novagross Destek</p>
                {ticketNo && <p className="text-[11px] opacity-90">Talep no: {ticketNo}</p>}
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Kapat"><X className="h-5 w-5" /></button>
          </div>

          {/* Opsiyonel iletişim alanları */}
          <div className="px-3 py-2 border-b bg-gray-50 grid grid-cols-2 gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta (opsiyonel)"
              className="text-xs border rounded px-2 py-1.5"
            />
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Sipariş no (varsa)"
              className="text-xs border rounded px-2 py-1.5"
            />
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-orange-600 text-white rounded-br-sm' : 'bg-white border rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
          </div>

          <div className="p-2 border-t flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder="Mesajınızı yazın…"
              className="flex-1 resize-none border rounded-lg px-3 py-2 text-sm max-h-24"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="rounded-lg p-2 text-white disabled:opacity-50"
              style={{ backgroundColor: '#FF6000' }}
              aria-label="Gönder"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
