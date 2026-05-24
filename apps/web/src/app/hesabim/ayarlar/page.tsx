import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/giris')
  }

  // Profil bilgilerini çek
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Metadata'dan ayarları oku veya default değerleri kullan
  const metadata = profile?.metadata as Record<string, unknown> || {}

  return (
    <SettingsClient
      userId={user.id}
      initialProfile={{
        newsletter_subscribed: Boolean(metadata.newsletter_subscribed ?? false),
        email_notifications: Boolean(metadata.email_notifications ?? true),
        sms_notifications: Boolean(metadata.sms_notifications ?? false),
        push_notifications: Boolean(metadata.push_notifications ?? false),
        personalized_offers: Boolean(metadata.personalized_offers ?? true),
        locale: (metadata.locale as string) ?? 'tr',
        currency: (metadata.currency as string) ?? 'TRY',
      }}
    />
  )
}
