import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mngKargo } from '@novagross/cargo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// MNG'nin platforma kestiği kargo/komisyon faturalarını listeler (gerçek
// zamanlı MNG çağrısı — DB'de ayrıca saklanmaz, salt görüntüleme).

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const cfg = mngKargo.isConfigured()
    if (!cfg.ok) {
      return NextResponse.json({ error: `MNG eksik ayar: ${cfg.missing.join(', ')}` }, { status: 500 })
    }

    const days = Number(req.nextUrl.searchParams.get('days')) || 90
    const end = new Date()
    const start = new Date(Date.now() - days * 24 * 3600_000)

    const invoices = await mngKargo.getCommissionInvoiceList(fmt(start), fmt(end))
    return NextResponse.json({ invoices })
  } catch (e: any) {
    console.error('[commission-invoices] error', e)
    return NextResponse.json({ error: e?.message || 'Hata' }, { status: 500 })
  }
}
