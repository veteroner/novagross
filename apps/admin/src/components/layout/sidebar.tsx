'use client'

import { useEffect, useState } from 'react'
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
  Mail,
  Megaphone,
  Percent,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type CounterKey =
  | 'pendingProducts'
  | 'pendingReviews'
  | 'newMessages'
  | 'pendingWithdrawals'
  | 'pendingApplications'

type MenuItem = {
  href: string
  label: string
  icon: LucideIcon
  counter?: CounterKey
}

const menuItems: MenuItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/urunler', label: 'Ürünler', icon: Package },
  {
    href: '/urunler/onay-bekleyenler',
    label: 'Onay Bekleyenler',
    icon: BadgeCheck,
    counter: 'pendingProducts',
  },
  { href: '/siparisler', label: 'Siparişler', icon: ShoppingCart },
  { href: '/kategoriler', label: 'Kategoriler', icon: Tag },
  { href: '/banners', label: 'Bannerlar', icon: ImageIcon },
  { href: '/kampanya-rozetleri', label: 'Kampanya Rozetleri', icon: ImageIcon },
  { href: '/promo-grid', label: 'Promo Grid', icon: ImageIcon },
  { href: '/musteriler', label: 'Müşteriler', icon: Users },
  { href: '/aboneler', label: 'E-posta Aboneleri', icon: Mail },
  { href: '/email-logs', label: 'E-posta Logları', icon: Mail },
  { href: '/email-templates-analytics', label: 'E-posta Şablon Analitiği', icon: BarChart3 },
  { href: '/email-unsubscribes', label: 'E-posta Çıkışları', icon: Mail },
  {
    href: '/iletisim-mesajlari',
    label: 'İletişim Mesajları',
    icon: MessageSquare,
    counter: 'newMessages',
  },
  { href: '/saticilar', label: 'Satıcılar', icon: Store },
  {
    href: '/saticilar/basvurular',
    label: 'Satıcı Başvuruları',
    icon: Store,
    counter: 'pendingApplications',
  },
  {
    href: '/para-cekme',
    label: 'Para Çekme',
    icon: Banknote,
    counter: 'pendingWithdrawals',
  },
  { href: '/odemeler', label: 'Ödemeler', icon: Wallet },
  { href: '/kuponlar', label: 'Kuponlar', icon: Ticket },
  { href: '/reklamlar', label: 'Reklamlar', icon: Megaphone },
  { href: '/komisyon-kampanyalari', label: 'Komisyon Kampanyaları', icon: Percent },
  { href: '/yorumlar', label: 'Yorumlar', icon: MessageSquare, counter: 'pendingReviews' },
  { href: '/raporlar', label: 'Raporlar', icon: BarChart3 },
  { href: '/ayarlar', label: 'Ayarlar', icon: Settings },
]

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Trendikon'

type Counters = Record<CounterKey, number>

const EMPTY_COUNTERS: Counters = {
  pendingProducts: 0,
  pendingReviews: 0,
  newMessages: 0,
  pendingWithdrawals: 0,
  pendingApplications: 0,
}

async function fetchCounters(supabase: ReturnType<typeof createClient>): Promise<Counters> {
  const [
    { count: pendingProducts },
    { count: pendingReviews },
    { count: newMessages },
    { count: pendingWithdrawals },
    { count: pendingApplications },
  ] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('store_applications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  return {
    pendingProducts: pendingProducts ?? 0,
    pendingReviews: pendingReviews ?? 0,
    newMessages: newMessages ?? 0,
    pendingWithdrawals: pendingWithdrawals ?? 0,
    pendingApplications: pendingApplications ?? 0,
  }
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [counters, setCounters] = useState<Counters>(EMPTY_COUNTERS)

  // Initial load + 60s polling. Errors are swallowed: counters stay at 0 if user
  // doesn't have RLS access yet (e.g. before sign-in completes).
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    const load = async () => {
      try {
        const c = await fetchCounters(supabase)
        if (!cancelled) setCounters(c)
      } catch {
        // ignore
      }
    }

    void load()
    const interval = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const onLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-white shadow-lg flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">{BRAND_NAME}</h1>
        <p className="text-sm text-muted-foreground">Admin Panel</p>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const Icon = item.icon
          const count = item.counter ? counters[item.counter] : 0
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
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {count > 0 ? (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-orange-500 text-white text-xs font-semibold">
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="p-6 border-t">
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
