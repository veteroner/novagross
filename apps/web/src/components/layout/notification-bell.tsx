'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@novagross/ui'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

/** Site içi bildirim zili — RLS sayesinde kullanıcı yalnızca kendi bildirimlerini görür. */
export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data } = await (supabase as any)
        .from('user_notifications')
        .select('id, type, title, body, link, read_at, created_at')
        .order('created_at', { ascending: false })
        .limit(15)
      const list: Notification[] = data || []
      setItems(list)
      setUnread(list.filter((n) => !n.read_at).length)
    } catch {
      // sessiz
    }
  }, [])

  useEffect(() => {
    load()
    // 2 dakikada bir tazele (hafif polling)
    const t = setInterval(load, 120000)
    return () => clearInterval(t)
  }, [load, userId])

  // Dışarı tıklayınca kapat
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      // Açınca okunmamışları okundu işaretle
      try {
        const supabase = createClient()
        const ids = items.filter((n) => !n.read_at).map((n) => n.id)
        if (ids.length > 0) {
          await (supabase as any)
            .from('user_notifications')
            .update({ read_at: new Date().toISOString() })
            .in('id', ids)
          setUnread(0)
          setItems((prev) =>
            prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
          )
        }
      } catch {
        // sessiz
      }
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <Button variant="ghost" size="icon" className="relative" onClick={toggle} aria-label="Bildirimler">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center"
            aria-hidden="true"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border bg-white shadow-lg z-50">
          <div className="px-4 py-2 border-b text-sm font-semibold">Bildirimler</div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              Henüz bildiriminiz yok.
            </p>
          ) : (
            items.map((n) => {
              const content = (
                <div className="px-4 py-3 border-b last:border-0 hover:bg-gray-50">
                  <p className="text-sm font-medium leading-snug">
                    {n.type === 'offer' ? '🎁 ' : ''}
                    {n.title}
                  </p>
                  {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {new Date(n.created_at).toLocaleString('tr-TR')}
                  </p>
                </div>
              )
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
