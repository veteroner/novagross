'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AGREEMENT_VERSION } from '@/lib/agreements/registry'
import { AgreementCheckbox, type AgreementsState } from './agreement-checkbox'
import { Button } from '@novagross/ui'
export function MembershipConsentGate() {
  const [needed, setNeeded] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [state, setState] = useState<AgreementsState>({})
  const pathname = usePathname()
  useEffect(() => {
    let active = true
    const client = createClient()
    const refresh = async () => {
      try {
        const response = await fetch('/api/agreements/accept', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (active) setNeeded(data.missing?.length > 0)
      } catch { /* Payment endpoints also enforce the required records. */ }
    }
    void refresh()
    const { data } = client.auth.onAuthStateChange(() => { void refresh() })
    window.addEventListener('agreements-updated', refresh)
    return () => { active = false; data.subscription.unsubscribe(); window.removeEventListener('agreements-updated', refresh) }
  }, [])
  // Leave legal documents accessible while the user reads them.
  if (!needed || pathname.startsWith('/sozlesmeler') || pathname.startsWith('/bulten/') || pathname === '/odeme/mobil-onay' || ['/kvkk', '/gizlilik-politikasi', '/cerez-politikasi', '/mesafeli-satis-sozlesmesi'].includes(pathname)) return null
  async function save() {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/agreements/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: AGREEMENT_VERSION, agreements: Object.entries(state).filter(([, value]) => value).map(([key]) => key) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Onay kaydedilemedi')
      setNeeded(false)
      window.dispatchEvent(new Event('agreements-updated'))
    } catch (error) { setError(error instanceof Error ? error.message : 'Onay kaydedilemedi') } finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="membership-title"><div className="w-full max-w-lg max-h-[80dvh] overflow-y-auto rounded-xl bg-background p-6 space-y-5"><h2 id="membership-title" className="text-xl font-bold">Üyelik Belgeleri</h2><p className="text-sm text-muted-foreground">Hesabınıza ait güncel belge kaydı eksik. Devam etmeden önce üyelik koşullarını inceleyin. Pazarlama izni isteğe bağlıdır.</p>{(['uyelik_sozlesmesi', 'kvkk_aydinlatma', 'acik_riza'] as const).map(type => <AgreementCheckbox key={type} type={type} checked={!!state[type]} onChange={checked => setState(prev => ({ ...prev, [type]: checked }))} disabled={busy} />)}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap gap-3"><Button disabled={busy || !state.uyelik_sozlesmesi || !state.kvkk_aydinlatma} onClick={save}>{busy ? 'Kaydediliyor…' : 'Kaydet ve Devam Et'}</Button><Button variant="outline" disabled={busy} onClick={async () => { await createClient().auth.signOut(); setNeeded(false); location.reload() }}>Çıkış Yap</Button></div></div></div>
}
