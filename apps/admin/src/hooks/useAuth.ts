import { useState, useEffect } from 'react'
import { createClient } from '@novagross/database/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial user with error handling
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()
        
        // Handle invalid refresh token
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid')) {
          console.warn('Invalid auth token in admin, clearing session...')
          await supabase.auth.signOut({ scope: 'local' })
          setUser(null)
          setLoading(false)
          return
        }
        
        setUser(data.user)
        setLoading(false)
      } catch (error) {
        console.error('Auth check error in admin:', error)
        await supabase.auth.signOut({ scope: 'local' })
        setUser(null)
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
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
