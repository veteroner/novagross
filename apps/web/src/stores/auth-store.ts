import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isHydrated: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setHydrated: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isHydrated: false,

      setUser: (user) => set({ user, isLoading: false }),

      setLoading: (isLoading) => set({ isLoading }),
      
      setHydrated: () => set({ isHydrated: true }),

      logout: () => set({ user: null }),
    }),
    {
      name: 'nova-auth',
      partialize: (state) => ({ user: state.user }),
      storage: createJSONStorage(() => localStorage),
      skipHydration: typeof window === 'undefined',
      onRehydrateStorage: () => (state) => {
        if (state) state.setHydrated()
      },
    }
  )
)
