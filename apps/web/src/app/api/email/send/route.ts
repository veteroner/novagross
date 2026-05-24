import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { csrfProtection } from '@/lib/csrf'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfError = csrfProtection(request)
  if (csrfError) return csrfError

  try {
    // Auth: must be logged in
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()

    const to = body?.to as string | undefined
    const subject = body?.subject as string | undefined
    const template = body?.template as string | undefined
    const data = (body?.data ?? {}) as Record<string, any>
    const priority = (body?.priority as string | undefined) ?? 'medium'

    if (!to || !subject || !template) {
      return NextResponse.json({ error: 'to/subject/template gerekli' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase.from('email_queue').insert({
      recipient: to,
      subject,
      template,
      data,
      priority,
      scheduled_at: new Date().toISOString(),
      status: 'pending',
    })

    if (error) {
      console.error('Email queue insert error:', error)
      return NextResponse.json({ error: 'Email kuyruğa eklenemedi' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Email send route error:', err)
    return NextResponse.json({ error: 'Beklenmeyen hata' }, { status: 500 })
  }
}
