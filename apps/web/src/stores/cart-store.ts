import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface CartItem {
  productId: string
  variantId: string | null
  quantity: number
  price: number
  name: string
  image: string | null
}

interface CartState {
  items: CartItem[]
  isHydrated: boolean
  lastSyncedUserId: string | null
  setHydrated: () => void
  addItem: (item: CartItem) => void
  removeItem: (productId: string, variantId: string | null) => void
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
  // Login olduğunda DB ile birleştir (lokal + sunucu — quantity max).
  // Kullanıcı yeni cihazdan girdiğinde sepeti geri yükler.
  syncWithServer: (userId: string) => Promise<void>
  setItems: (items: CartItem[]) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isHydrated: false,
      lastSyncedUserId: null,

      setHydrated: () => set({ isHydrated: true }),

      setItems: (items) => set({ items }),

      syncWithServer: async (userId) => {
        if (typeof window === 'undefined') return
        // Aynı user için bu session'da zaten sync edildiyse atla
        if (get().lastSyncedUserId === userId) return
        try {
          const res = await fetch('/api/cart/sync', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ items: get().items }),
          })
          if (!res.ok) return
          const data = await res.json().catch(() => ({}))
          if (Array.isArray(data?.items)) {
            set({ items: data.items, lastSyncedUserId: userId })
          }
        } catch {
          // Network/auth hatası — sessiz, local sepete dokunma
        }
      },

      addItem: (item) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.productId === item.productId && i.variantId === item.variantId
          )

          if (existingIndex > -1) {
            const updatedItems = [...state.items]
            updatedItems[existingIndex].quantity += item.quantity
            return { items: updatedItems }
          }

          return { items: [...state.items, item] }
        })
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.productId === productId && item.variantId === variantId)
          ),
        }))
      },

      updateQuantity: (productId, variantId, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.variantId === variantId
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          ),
        }))
      },

      clearCart: () => set({ items: [], lastSyncedUserId: null }),

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },
    }),
    {
      name: 'nova-cart',
      storage: createJSONStorage(() => localStorage),
      skipHydration: typeof window === 'undefined',
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated()
      },
    }
  )
)
