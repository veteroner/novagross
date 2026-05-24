'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@novagross/ui'
import { Button } from '@novagross/ui'
import { Input } from '@novagross/ui'
import { MessageCircle, Send, User, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  sender_id: string
  sender_type: 'seller' | 'admin'
  content: string
  created_at: string
  is_read: boolean
}

export default function MessagesPage() {
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!store) return
      setStoreId(store.id)

      // Fetch messages for this store
      const { data: messagesData } = await (supabase as any)
        .from('store_messages')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: true })
        .limit(100)

      setMessages(messagesData || [])

      // Mark unread messages as read
      if (messagesData && messagesData.length > 0) {
        const unreadIds = messagesData
          .filter((m: any) => !m.is_read && m.sender_type === 'admin')
          .map((m: any) => m.id)

        if (unreadIds.length > 0) {
          await (supabase as any)
            .from('store_messages')
            .update({ is_read: true })
            .in('id', unreadIds)
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !storeId || !userId) return

    setSending(true)

    try {
      const supabase = createClient()

      const { data, error } = await (supabase as any)
        .from('store_messages')
        .insert({
          store_id: storeId,
          sender_id: userId,
          sender_type: 'seller',
          content: newMessage.trim(),
          is_read: false,
        })
        .select()
        .single()

      if (error) throw error

      setMessages(prev => [...prev, data])
      setNewMessage('')
    } catch (error: any) {
      console.error('Failed to send message:', error)
      alert('Mesaj gönderilemedi')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mesajlar</h1>
        <p className="text-gray-600">Novagross yönetimi ile iletişim</p>
      </div>

      <Card className="flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
        <CardHeader className="border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Novagross Destek</CardTitle>
              <p className="text-sm text-gray-500">Platform yönetim ekibi</p>
            </div>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">Henüz mesaj yok</p>
                <p className="text-sm">Novagross yönetimine mesaj göndermek için aşağıdaki alanı kullanın</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'seller' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${
                    msg.sender_type === 'seller'
                      ? 'bg-primary text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl'
                      : 'bg-gray-100 text-gray-800 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl'
                  } px-4 py-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      {msg.sender_type === 'admin' ? (
                        <Shield className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      <span className="text-xs opacity-75">
                        {msg.sender_type === 'admin' ? 'Novagross' : 'Siz'}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender_type === 'seller' ? 'text-white/60' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>

        {/* Input Area */}
        <div className="border-t p-4 flex-shrink-0">
          <div className="flex gap-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Mesajınızı yazın..."
              className="flex-1"
              disabled={sending}
            />
            <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Enter ile gönder</p>
        </div>
      </Card>
    </div>
  )
}
