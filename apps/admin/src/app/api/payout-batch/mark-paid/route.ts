import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { runWeeklyPayoutBatch } from '@/lib/payout/run-weekly-payout'

export const dynamic = 'force-dynamic'

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const asOf = body?.asOf
    const reference = body?.reference ?? null

    if (!isIsoDate(asOf)) {
      return NextResponse.json({ error: 'Invalid asOf date' }, { status: 400 })
    }

    // Require logged-in user (cookie-based session)
    const sessionClient = await createClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role using service role (bypass RLS)
    const service = createServiceRoleClient()
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const role = (profile as any)?.role
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || process.env.URL

    const result = await runWeeklyPayoutBatch({
      service,
      asOf,
      reference,
      processedBy: user.id,
      adminUrl,
    })

    return NextResponse.json(result || { ok: true })
  } catch (err: any) {
    console.error('[payout-batch/mark-paid] error:', err)
    return NextResponse.json({ error: 'Failed to mark paid' }, { status: 500 })
  }
}
