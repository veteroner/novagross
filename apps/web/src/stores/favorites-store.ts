import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface FavoriteItem {
  productId: string
  name: string
  slug: string
  price: number
  image?: string
  addedAt: Date
}

interface FavoritesState {
  items: FavoriteItem[]
  isHydrated: boolean
  addToFavorites: (item: Omit<FavoriteItem, 'addedAt'>) => void
  removeFromFavorites: (productId: string) => void
  isFavorite: (productId: string) => boolean
  clearFavorites: () => void
  setHydrated: () => void
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      isHydrated: false,

      addToFavorites: (item) => {
        const exists = get().items.find((i) => i.productId === item.productId)
        if (exists) return

        set((state) => ({
          items: [...state.items, { ...item, addedAt: new Date() }],
        }))
      },

      removeFromFavorites: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }))
      },

      isFavorite: (productId) => {
        return get().items.some((item) => item.productId === productId)
      },

      clearFavorites: () => {
        set({ items: [] })
      },

      setHydrated: () => {
        set({ isHydrated: true })
      },
    }),
    {
      name: 'favorites-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: typeof window === 'undefined',
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated()
      },
    }
  )
)
