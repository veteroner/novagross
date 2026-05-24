'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Tag, 
  Image as ImageIcon,
  Settings,
  BarChart3,
  Ticket,
  MessageSquare,
  BadgeCheck,
  Store,
  Banknote,
  Wallet,
  LogOut,
  Mail
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/urunler', label: 'Ürünler', icon: Package },
  { href: '/urunler/onay-bekleyenler', label: 'Onay Bekleyenler', icon: BadgeCheck },
  { href: '/siparisler', label: 'Siparişler', icon: ShoppingCart },
  { href: '/kategoriler', label: 'Kategoriler', icon: Tag },
  { href: '/banners', label: 'Bannerlar', icon: ImageIcon },
  { href: '/musteriler', label: 'Müşteriler', icon: Users },
  { href: '/aboneler', label: 'E-posta Aboneleri', icon: Mail },
  { href: '/email-logs', label: 'E-posta Logları', icon: Mail },
  { href: '/email-templates-analytics', label: 'E-posta Şablon Analitiği', icon: BarChart3 },
  { href: '/email-unsubscribes', label: 'E-posta Çıkışları', icon: Mail },
  { href: '/iletisim-mesajlari', label: 'İletişim Mesajları', icon: MessageSquare },
  { href: '/saticilar', label: 'Satıcılar', icon: Store },
  { href: '/saticilar/basvurular', label: 'Satıcı Başvuruları', icon: Store },
  { href: '/para-cekme', label: 'Para Çekme', icon: Banknote },
  { href: '/odemeler', label: 'Ödemeler', icon: Wallet },
  { href: '/kuponlar', label: 'Kuponlar', icon: Ticket },
  { href: '/yorumlar', label: 'Yorumlar', icon: MessageSquare },
  { href: '/raporlar', label: 'Raporlar', icon: BarChart3 },
  { href: '/ayarlar', label: 'Ayarlar', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const onLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-white shadow-lg">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">Novagross</h1>
        <p className="text-sm text-muted-foreground">Admin Panel</p>
      </div>

      <nav className="mt-6">
        {menuItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
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

      <div className="absolute bottom-0 w-64 p-6 border-t">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 text-sm text-gray-600 hover:text-gray-900"
        >
          <LogOut className="h-5 w-5" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  )
}
