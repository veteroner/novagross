'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@novagross/ui/button'
import { createClient } from '@novagross/database/client'

interface StoreFollowButtonProps {
  storeId: string
  initialIsFollowing: boolean
  initialFollowerCount: number
}

export default function StoreFollowButton({
  storeId,
  initialIsFollowing,
  initialFollowerCount
}: StoreFollowButtonProps) {
  const router = useRouter()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followerCount, setFollowerCount] = useState(initialFollowerCount)
  const [loading, setLoading] = useState(false)

  const handleToggleFollow = async () => {
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Redirect to login
        router.push('/giris?redirect=' + window.location.pathname)
        return
      }

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('store_followers')
          .delete()
          .eq('store_id', storeId)
          .eq('user_id', user.id)

        if (error) throw error

        setIsFollowing(false)
        setFollowerCount(prev => prev - 1)
      } else {
        // Follow
        const { error } = await supabase
          .from('store_followers')
          .insert({
            store_id: storeId,
            user_id: user.id
          })

        if (error) throw error

        setIsFollowing(true)
        setFollowerCount(prev => prev + 1)
      }
    } catch (error: any) {
      console.error('Follow error:', error)
      alert('Bir hata oluştu: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleToggleFollow}
      disabled={loading}
      variant={isFollowing ? 'outline' : 'default'}
    >
      {loading ? '...' : isFollowing ? '✓ Takip Ediliyor' : '+ Takip Et'}
    </Button>
  )
}
