import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Push bildirim gönderimi (pg_cron, dakikada bir).
//
// notification_outbox (notify()/notify_store() doldurur) → Expo Push API → APNs/FCM.
// 1. Bekleyenler: kullanıcının o uygulamadaki (store/seller) aktif cihazlarına gönder.
// 2. Makbuzlar: 15 dk önce gönderilenlerin teslim sonucunu sor; uygulaması
//    silinmiş cihazları (DeviceNotRegistered) kapat.
// Yetki: IYZICO_CRON_SECRET (cron'lar ortak secret'ı kullanıyor).
// Bkz docs/MOBIL_UYGULAMA_PLANI.md §3.3.

const EXPO_SEND = 'https://exp.host/--/api/v2/push/send'
const EXPO_RECEIPTS = 'https://exp.host/--/api/v2/push/getReceipts'
const CHUNK = 100
const MAX_ATTEMPTS = 3

// Android bildirim kanalları (uygulamalarda aynı id'lerle tanımlanmalı)
const CHANNEL_BY_TYPE: Record<string, string> = {
  new_order: 'orders',
  order_cancelled: 'orders',
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.IYZICO_CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

async function expoPost(url: string, body: unknown): Promise<any> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    'accept-encoding': 'gzip, deflate',
    'content-type': 'application/json',
  }
  if (process.env.EXPO_ACCESS_TOKEN) headers.authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`Expo HTTP ${res.status}: ${JSON.stringify(json)?.slice(0, 300)}`)
  return json
}

type Msg = { outboxId: string; app: string; token: string; payload: Record<string, any> }

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const service: any = createServiceRoleClient()
  const summary = { pending: 0, sent: 0, noDevice: 0, failed: 0, receiptsChecked: 0, devicesDisabled: 0, errors: [] as string[] }

  // ---- 1. Bekleyenler ----
  const { data: pending, error } = await service
    .from('notification_outbox')
    .select('id, user_id, app, type, title, body, data, priority, attempts')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(500)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  summary.pending = pending?.length ?? 0

  if (pending && pending.length > 0) {
    const userIds = Array.from(new Set(pending.map((p: any) => p.user_id)))
    const { data: devices } = await service
      .from('push_devices')
      .select('user_id, app, expo_push_token')
      .in('user_id', userIds)
      .is('disabled_at', null)

    const tokensFor = (userId: string, app: string): string[] =>
      (devices ?? []).filter((d: any) => d.user_id === userId && d.app === app).map((d: any) => d.expo_push_token)

    const messages: Msg[] = []
    const noDeviceIds: string[] = []
    for (const n of pending as any[]) {
      const tokens = tokensFor(n.user_id, n.app)
      if (tokens.length === 0) {
        noDeviceIds.push(n.id)
        continue
      }
      for (const token of tokens) {
        messages.push({
          outboxId: n.id,
          app: n.app,
          token,
          payload: {
            to: token,
            title: n.title,
            body: n.body,
            data: { ...(n.data ?? {}), notification_id: n.id },
            sound: 'default',
            priority: n.priority === 'high' ? 'high' : 'default',
            channelId: CHANNEL_BY_TYPE[n.type] ?? 'default',
          },
        })
      }
    }

    if (noDeviceIds.length > 0) {
      await service.from('notification_outbox').update({ status: 'no_device' }).in('id', noDeviceIds)
      summary.noDevice = noDeviceIds.length
    }

    // outboxId → { tickets, errors }
    const results = new Map<string, { tickets: { id: string; token: string }[]; errors: string[] }>()
    const disableTokens = new Set<string>()

    // Expo bir istekte yalnızca TEK projenin token'larını kabul ediyor
    // (PUSH_TOO_MANY_EXPERIENCE_IDS → tüm paket reddedilir). Satıcı ve müşteri
    // uygulamaları ayrı EAS projeleri → paketleri uygulamaya göre ayır.
    const chunks: Msg[][] = []
    for (const app of Array.from(new Set(messages.map((m) => m.app)))) {
      const group = messages.filter((m) => m.app === app)
      for (let i = 0; i < group.length; i += CHUNK) chunks.push(group.slice(i, i + CHUNK))
    }

    for (const chunk of chunks) {
      try {
        const res = await expoPost(EXPO_SEND, chunk.map((m) => m.payload))
        const tickets: any[] = res?.data ?? []
        chunk.forEach((m, idx) => {
          const t = tickets[idx]
          const r = results.get(m.outboxId) ?? { tickets: [], errors: [] }
          if (t?.status === 'ok' && t.id) {
            r.tickets.push({ id: t.id, token: m.token })
          } else {
            const code = t?.details?.error || t?.message || 'bilinmeyen hata'
            r.errors.push(String(code))
            if (t?.details?.error === 'DeviceNotRegistered') disableTokens.add(m.token)
          }
          results.set(m.outboxId, r)
        })
      } catch (e: any) {
        // Ağ/Expo hatası: bu paketteki bildirimler bir sonraki dakikada yeniden denenir
        summary.errors.push(e?.message || String(e))
        for (const m of chunk) {
          const r = results.get(m.outboxId) ?? { tickets: [], errors: [] }
          r.errors.push('transient')
          results.set(m.outboxId, r)
        }
      }
    }

    const now = new Date().toISOString()
    for (const n of pending as any[]) {
      const r = results.get(n.id)
      if (!r) continue
      if (r.tickets.length > 0) {
        await service
          .from('notification_outbox')
          .update({ status: 'sent', sent_at: now, tickets: r.tickets, attempts: n.attempts + 1, error: r.errors.join(', ') || null })
          .eq('id', n.id)
        summary.sent++
      } else {
        const attempts = n.attempts + 1
        const transient = r.errors.includes('transient')
        await service
          .from('notification_outbox')
          .update({
            status: transient && attempts < MAX_ATTEMPTS ? 'pending' : 'failed',
            attempts,
            error: r.errors.join(', ').slice(0, 500),
          })
          .eq('id', n.id)
        if (!(transient && attempts < MAX_ATTEMPTS)) summary.failed++
      }
    }

    if (disableTokens.size > 0) {
      await service.from('push_devices').update({ disabled_at: now }).in('expo_push_token', Array.from(disableTokens))
      summary.devicesDisabled += disableTokens.size
    }
  }

  // ---- 2. Makbuzlar (15 dk sonra) ----
  const receiptBefore = new Date(Date.now() - 15 * 60_000).toISOString()
  const { data: sentRows } = await service
    .from('notification_outbox')
    .select('id, tickets')
    .eq('status', 'sent')
    .is('receipts_checked_at', null)
    .lt('sent_at', receiptBefore)
    .limit(300)

  if (sentRows && sentRows.length > 0) {
    const ticketToToken = new Map<string, string>()
    for (const row of sentRows as any[]) for (const t of row.tickets ?? []) ticketToToken.set(t.id, t.token)
    const ids = Array.from(ticketToToken.keys())
    const disable = new Set<string>()
    try {
      for (let i = 0; i < ids.length; i += 1000) {
        const res = await expoPost(EXPO_RECEIPTS, { ids: ids.slice(i, i + 1000) })
        for (const [id, rec] of Object.entries<any>(res?.data ?? {})) {
          if (rec?.status === 'error' && rec?.details?.error === 'DeviceNotRegistered') {
            const token = ticketToToken.get(id)
            if (token) disable.add(token)
          }
        }
      }
      await service
        .from('notification_outbox')
        .update({ receipts_checked_at: new Date().toISOString() })
        .in('id', sentRows.map((r: any) => r.id))
      summary.receiptsChecked = sentRows.length
      if (disable.size > 0) {
        await service.from('push_devices').update({ disabled_at: new Date().toISOString() }).in('expo_push_token', Array.from(disable))
        summary.devicesDisabled += disable.size
      }
    } catch (e: any) {
      summary.errors.push(`makbuz: ${e?.message || e}`)
    }
  }

  const ok = summary.errors.length === 0
  return NextResponse.json({ ok, summary }, { status: ok ? 200 : 207 })
}
