import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { runWeeklyPayoutBatch } from '@/lib/payout/run-weekly-payout'

export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.PAYOUT_BATCH_SECRET
  if (!secret) return false

  const authHeader = req.headers.get('authorization') || ''
  return authHeader === `Bearer ${secret}`
}

function getIstanbulIsoDate(): string {
  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getIstanbulWeekdayShort(): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    weekday: 'short',
  }).format(new Date())
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dryRun') === '1'
  const overrideDate = url.searchParams.get('asOf')

  const asOf = overrideDate && /^\d{4}-\d{2}-\d{2}$/.test(overrideDate) ? overrideDate : getIstanbulIsoDate()
  const weekday = getIstanbulWeekdayShort()

  if (weekday !== 'Wed') {
    return NextResponse.json({ ok: true, skipped: true, reason: `Not Wednesday in Europe/Istanbul (${weekday})`, asOf })
  }

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, asOf })
  }

  const service = createServiceRoleClient()
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || process.env.URL

  try {
    const result = await runWeeklyPayoutBatch({
      service,
      asOf,
      reference: 'auto-cron',
      processedBy: null,
      adminUrl,
    })

    return NextResponse.json({ ok: true, asOf, result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, asOf, error: e?.message || 'Failed' }, { status: 500 })
  }
}
