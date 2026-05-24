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
  setHydrated: () => void
  addItem: (item: CartItem) => void
  removeItem: (productId: string, variantId: string | null) => void
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isHydrated: false,
      
      setHydrated: () => set({ isHydrated: true }),

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

      clearCart: () => set({ items: [] }),

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
