import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()
        
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid')) {
          console.warn('Invalid auth token in seller panel, clearing session...')
          await supabase.auth.signOut({ scope: 'local' })
          setUser(null)
          setLoading(false)
          return
        }
        
        setUser(data.user)
        setLoading(false)
      } catch (error) {
        console.error('Auth check error in seller:', error)
        await supabase.auth.signOut({ scope: 'local' })
        setUser(null)
        setLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
