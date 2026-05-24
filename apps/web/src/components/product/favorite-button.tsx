'use client'

import { Heart } from 'lucide-react'
import { useFavoritesStore } from '@/stores/favorites-store'
import { cn } from '@novagross/utils'
import { toast } from 'sonner'

interface FavoriteButtonProps {
  productId: string
  name: string
  slug: string
  price: number
  image?: string
  className?: string
}

export function FavoriteButton({ 
  productId, 
  name, 
  slug, 
  price, 
  image,
  className 
}: FavoriteButtonProps) {
  const { addToFavorites, removeFromFavorites, isFavorite, isHydrated } = useFavoritesStore()
  const isInFavorites = isFavorite(productId)

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isInFavorites) {
      removeFromFavorites(productId)
      toast.success('Favorilerden çıkarıldı', {
        description: name,
      })
    } else {
      addToFavorites({ productId, name, slug, price, image })
      toast.success('Favorilere eklendi', {
        description: name,
      })
    }
  }

  if (!isHydrated) {
    return (
      <button className={cn("p-2 rounded-full bg-white shadow", className)}>
        <Heart className="h-5 w-5 text-gray-300" />
      </button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "p-2 rounded-full bg-white shadow hover:scale-110 transition-transform",
        className
      )}
      aria-label={isInFavorites ? "Favorilerden çıkar" : "Favorilere ekle"}
    >
      <Heart 
        className={cn(
          "h-5 w-5 transition-colors",
          isInFavorites ? "fill-red-500 text-red-500" : "text-gray-400"
        )} 
      />
    </button>
  )
}
