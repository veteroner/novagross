'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ShoppingCart, User, Menu, X, LogOut, Heart } from 'lucide-react'
import { Button } from '@novagross/ui'
import { useCartStore } from '@/stores/cart-store'
import { useAuthStore } from '@/stores/auth-store'
import { useFavoritesStore } from '@/stores/favorites-store'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { SearchBar } from './search-bar'

interface Category {
  id: string
  name: string
  slug: string
}

export function Header() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isSeller, setIsSeller] = useState<boolean>(false)
  const { items, isHydrated, syncWithServer } = useCartStore()
  const { user, setUser, isHydrated: authHydrated } = useAuthStore()

  // Kullanıcı login olunca sepeti DB ile birleştir (yeni cihaz/oturum senaryosu).
  // syncWithServer aynı user için tek seferlik çalışır (cart-store içinde guard var).
  useEffect(() => {
    if (user?.id && isHydrated) {
      void syncWithServer(user.id)
    }
  }, [user?.id, isHydrated, syncWithServer])
  const { items: favoriteItems, isHydrated: favoritesHydrated } = useFavoritesStore()
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalFavorites = favoriteItems.length

  const hydratedCartCount = mounted && isHydrated ? totalItems : 0
  const hydratedFavoritesCount = mounted && favoritesHydrated ? totalFavorites : 0
  const cartAriaLabel = hydratedCartCount > 0 ? `Sepetim (${hydratedCartCount} ürün)` : 'Sepetim'
  const favoritesAriaLabel = hydratedFavoritesCount > 0 ? `Favorilerim (${hydratedFavoritesCount} ürün)` : 'Favorilerim'

  useEffect(() => {
    setMounted(true)

    // Create single Supabase client instance for this effect
    const supabase = createClient()
    
    // Check auth state
    const checkAuth = async () => {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser()
        
        // If refresh token is invalid, clear auth
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid')) {
          console.warn('Invalid auth token, clearing session...')
          await supabase.auth.signOut({ scope: 'local' })
          setUser(null)
          setIsSeller(false)
          return
        }
      
        if (authUser) {
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            firstName: authUser.user_metadata?.first_name || null,
            lastName: authUser.user_metadata?.last_name || null,
            avatarUrl: authUser.user_metadata?.avatar_url || null,
          })

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_seller')
            .eq('id', authUser.id)
            .maybeSingle()
          if (profileError) {
            console.warn('Failed to read profile (is_seller):', profileError)
          }
          setIsSeller(!!profile?.is_seller)
        } else {
          setUser(null)
          setIsSeller(false)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        await supabase.auth.signOut({ scope: 'local' })
        setUser(null)
        setIsSeller(false)
      }
    }
    
    checkAuth()
    
    // Listen for auth changes (using same supabase instance)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          firstName: session.user.user_metadata?.first_name || null,
          lastName: session.user.user_metadata?.last_name || null,
          avatarUrl: session.user.user_metadata?.avatar_url || null,
        })

        supabase
          .from('profiles')
          .select('is_seller')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data }) => setIsSeller(!!data?.is_seller))
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsSeller(false)
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [setUser])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-44 items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="Novagross Ana Sayfa">
          <Image
            src="/logo.webp"
            alt="Novagross"
            width={640}
            height={160}
            priority
            className="h-40 w-auto"
          />
        </Link>

        {/* Navigation - Desktop */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Ana navigasyon">
          <Link href="/urunler" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-1">
            Ürünler
          </Link>
          <Link href="/kategoriler" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-1">
            Kategoriler
          </Link>
          {mounted && authHydrated && user && isSeller ? (
            <a
              href={(process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.novagross.com') + '/seller/dashboard'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-1"
              aria-label="Satıcı paneline git (yeni sekmede açılır)"
            >
              Satıcı Paneli
            </a>
          ) : (
            <Link href="/satici-ol" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-1">
              Satıcı Ol
            </Link>
          )}
        </nav>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <SearchBar />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href="/favoriler" className="hidden sm:block" aria-label={favoritesAriaLabel}>
            <Button variant="ghost" size="icon" className="relative">
              <Heart className="h-5 w-5" />
              {mounted && favoritesHydrated && hydratedFavoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center" aria-hidden="true">
                  {hydratedFavoritesCount > 99 ? '99+' : hydratedFavoritesCount}
                </span>
              )}
            </Button>
          </Link>

          {mounted && authHydrated && user ? (
            <div className="flex items-center gap-2">
              <Link href="/hesabim" aria-label="Hesabım">
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  <User className="h-4 w-4 mr-2" />
                  {user.firstName || 'Hesabım'}
                </Button>
                <Button variant="ghost" size="icon" className="sm:hidden">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Çıkış yap">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Link href="/giris" aria-label="Giriş yap">
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                Giriş Yap
              </Button>
              <Button variant="ghost" size="icon" className="sm:hidden">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          )}

          <Link href="/sepet" aria-label={cartAriaLabel}>
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {mounted && isHydrated && hydratedCartCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center" aria-hidden="true">
                  {hydratedCartCount > 99 ? '99+' : hydratedCartCount}
                </span>
              )}
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t" id="mobile-menu">
          <nav className="container py-4 space-y-2" aria-label="Mobil navigasyon">
            <Link
              href="/urunler"
              className="block px-4 py-2 hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Ürünler
            </Link>
            <Link
              href="/kategoriler"
              className="block px-4 py-2 hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Kategoriler
            </Link>
            {mounted && authHydrated && user && isSeller ? (
              <a
                href={(process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.novagross.com') + '/seller/dashboard'}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2 hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Satıcı paneline git (yeni sekmede açılır)"
              >
                Satıcı Paneli
              </a>
            ) : (
              <Link
                href="/satici-ol"
                className="block px-4 py-2 hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Satıcı Ol
              </Link>
            )}
            {mounted && authHydrated && !user && (
              <>
                <hr className="my-2" aria-hidden="true" />
                <Link
                  href="/giris"
                  className="block px-4 py-2 hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/kayit"
                  className="block px-4 py-2 hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Kayıt Ol
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
