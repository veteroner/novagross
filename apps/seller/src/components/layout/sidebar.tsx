'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  Wallet,
  MessageSquare,
  User,
  LogOut,
  Store,
  Menu,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/urunler', label: 'Ürünlerim', icon: Package },
  { href: '/siparisler', label: 'Siparişlerim', icon: ShoppingCart },
  { href: '/analizler', label: 'Satış Analizleri', icon: BarChart3 },
  { href: '/kazanclarim', label: 'Kazançlarım', icon: Wallet },
  { href: '/mesajlar', label: 'Mesajlar', icon: MessageSquare },
  { href: '/magaza', label: 'Mağaza Ayarları', icon: Store },
  { href: '/profil', label: 'Profil', icon: User },
  { href: '/ayarlar', label: 'Ayarlar', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [storeName, setStoreName] = useState<string>('')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const fetchStore = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: store } = await supabase
        .from('stores')
        .select('store_name')
        .eq('owner_id', user.id)
        .single()

      if (store) setStoreName(store.store_name)
    }
    fetchStore()
  }, [])

  const onLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navContent = (
    <>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Store className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary">Novagross</h1>
            <p className="text-xs text-muted-foreground truncate max-w-[160px]">
              {storeName || 'Satıcı Paneli'}
            </p>
          </div>
        </div>
      </div>

      <nav className="mt-2 flex-1">
        {menuItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary border-r-4 border-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-6 border-t">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900 w-full"
        >
          <LogOut className="h-5 w-5" />
          Çıkış Yap
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-white shadow-lg flex flex-col
        transform transition-transform lg:transform-none
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {navContent}
      </aside>
    </>
  )
}
