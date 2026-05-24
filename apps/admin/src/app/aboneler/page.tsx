import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmailSubscribersClient } from './EmailSubscribersClient'

export const metadata: Metadata = {
  title: 'E-posta Aboneleri',
  description: 'Bültene abone olan kullanıcıları yönetin',
}

export default async function EmailSubscribersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  // Fetch email subscribers
  const { data: subscribers, error } = await supabase
    .from('email_preferences')
    .select('*')
    .eq('newsletters', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching subscribers:', error)
  }

  return <EmailSubscribersClient initialSubscribers={subscribers || []} />
}
