'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Mail,
  Megaphone,
  Store,
  Settings,
  BarChart3,
  MessageSquare,
  ChevronDown,
  LogOut,
  Bell,
  Search,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type CounterKey =
  | 'pendingProducts'
  | 'pendingReviews'
  | 'newMessages'
  | 'pendingWithdrawals'
  | 'pendingApplications'

type NavLeaf = {
  href: string
  label: string
  counter?: CounterKey
  description?: string
}

type NavGroup = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string // top-level click target (optional, otherwise dropdown only)
  items: NavLeaf[]
  /** Sum of all child counters surfaces on the group itself */
  surfacesCounters?: CounterKey[]
}

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Trendikon'

const NAV: NavGroup[] = [
  {
    label: 'Anasayfa',
    icon: LayoutDashboard,
    href: '/',
    items: [],
  },
  {
    label: 'Ürünler',
    icon: Package,
    items: [
      { href: '/urunler', label: 'Tüm Ürünler', description: 'Liste, düzenle, sil' },
      {
        href: '/urunler/onay-bekleyenler',
        label: 'Onay Bekleyenler',
        description: 'Satıcı ürün onayı',
        counter: 'pendingProducts',
      },
      { href: '/urunler/ekle', label: 'Yeni Ürün Ekle', description: 'Manuel ürün ekle' },
      { href: '/urunler/stok-gecmisi', label: 'Stok Geçmişi', description: 'Stok hareketleri' },
      { href: '/kategoriler', label: 'Kategoriler', description: 'Kategori ağacı' },
    ],
    surfacesCounters: ['pendingProducts'],
  },
  {
    label: 'Sipariş',
    icon: ShoppingCart,
    href: '/siparisler',
    items: [],
  },
  {
    label: 'Müşteriler',
    icon: Users,
    href: '/musteriler',
    items: [],
  },
  {
    label: 'Pazaryeri',
    icon: Store,
    items: [
      { href: '/saticilar', label: 'Satıcılar', description: 'Mağaza listesi' },
      {
        href: '/saticilar/basvurular',
        label: 'Satıcı Başvuruları',
        description: 'Bekleyen başvurular',
        counter: 'pendingApplications',
      },
      {
        href: '/para-cekme',
        label: 'Para Çekme',
        description: 'Withdrawal talepleri',
        counter: 'pendingWithdrawals',
      },
      { href: '/odemeler', label: 'Haftalık Ödemeler', description: 'Çarşamba batch' },
      { href: '/ayarlar/komisyon', label: 'Komisyon Ayarları', description: 'Satıcı oranları' },
    ],
    surfacesCounters: ['pendingApplications', 'pendingWithdrawals'],
  },
  {
    label: 'Pazarlama',
    icon: Megaphone,
    items: [
      { href: '/banners', label: 'Bannerlar', description: 'Anasayfa görselleri' },
      { href: '/kuponlar', label: 'Kuponlar', description: 'İndirim kodları' },
      {
        href: '/yorumlar',
        label: 'Yorumlar',
        description: 'Onay & moderasyon',
        counter: 'pendingReviews',
      },
    ],
    surfacesCounters: ['pendingReviews'],
  },
  {
    label: 'E-posta',
    icon: Mail,
    items: [
      { href: '/aboneler', label: 'Aboneler', description: 'Bülten listesi' },
      { href: '/email-logs', label: 'Loglar', description: 'Gönderim kayıtları' },
      { href: '/email-templates-analytics', label: 'Şablon Analitiği', description: 'Açılma & tıklama' },
      { href: '/email-unsubscribes', label: 'Çıkışlar', description: 'Abonelikten çıkanlar' },
      { href: '/ayarlar/email-sablonlari', label: 'Şablonlar', description: '49 hazır şablon' },
    ],
  },
  {
    label: 'İletişim',
    icon: MessageSquare,
    href: '/iletisim-mesajlari',
    items: [],
    surfacesCounters: ['newMessages'],
  },
  {
    label: 'Raporlar',
    icon: BarChart3,
    items: [
      { href: '/raporlar', label: 'Platform Raporları', description: 'GMV, top satıcılar' },
      { href: '/raporlar/anlik-trafik', label: 'Anlık Trafik', description: 'Canlı kullanıcılar' },
    ],
  },
  {
    label: 'Ayarlar',
    icon: Settings,
    items: [
      { href: '/ayarlar', label: 'Genel', description: 'Ayar paneli' },
      { href: '/ayarlar/site', label: 'Site Ayarları', description: 'Ortam değişkenleri' },
      { href: '/ayarlar/guvenlik', label: 'Güvenlik', description: 'Admin & yetki' },
      { href: '/ayarlar/kargo', label: 'Kargo', description: 'Firma & oranlar' },
    ],
  },
]

const EMPTY_COUNTERS: Record<CounterKey, number> = {
  pendingProducts: 0,
  pendingReviews: 0,
  newMessages: 0,
  pendingWithdrawals: 0,
  pendingApplications: 0,
}

async function fetchCounters(supabase: ReturnType<typeof createClient>) {
  const [a, b, c, d, e] = await Promise.all([
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
    pendingProducts: a.count ?? 0,
    pendingReviews: b.count ?? 0,
    newMessages: c.count ?? 0,
    pendingWithdrawals: d.count ?? 0,
    pendingApplications: e.count ?? 0,
  } as Record<CounterKey, number>
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-none ml-1">
      {n > 99 ? '99+' : n}
    </span>
  )
}

function DropdownItem({
  item,
  counters,
  onSelect,
  active,
}: {
  item: NavLeaf
  counters: Record<CounterKey, number>
  onSelect?: () => void
  active: boolean
}) {
  const count = item.counter ? counters[item.counter] : 0
  return (
    <Link
      href={item.href}
      onClick={onSelect}
      className={`flex items-start justify-between gap-3 px-4 py-2.5 hover:bg-gray-50 ${
        active ? 'bg-orange-50' : ''
      }`}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900 flex items-center">
          {item.label}
          <Badge n={count} />
        </div>
        {item.description ? (
          <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
        ) : null}
      </div>
    </Link>
  )
}

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [counters, setCounters] = useState(EMPTY_COUNTERS)
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    const load = async () => {
      try {
        const c = await fetchCounters(supabase)
        if (!cancelled) setCounters(c)
      } catch {
        /* swallow */
      }
    }
    void load()
    const id = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setOpenIdx(null)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Close dropdown on route change
  useEffect(() => {
    setOpenIdx(null)
  }, [pathname])

  const onLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isGroupActive = (g: NavGroup) => {
    if (g.href && (g.href === '/' ? pathname === '/' : pathname.startsWith(g.href))) {
      return true
    }
    return g.items.some((it) => pathname.startsWith(it.href))
  }

  const groupCounterTotal = (g: NavGroup) => {
    if (!g.surfacesCounters) return 0
    return g.surfacesCounters.reduce((sum, k) => sum + (counters[k] || 0), 0)
  }

  const totalAlerts =
    counters.pendingProducts +
    counters.pendingReviews +
    counters.newMessages +
    counters.pendingWithdrawals +
    counters.pendingApplications

  return (
    <header className="bg-white border-b sticky top-0 z-40">
      {/* Brand bar */}
      <div className="border-b">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold tracking-tight" style={{ color: '#FF6000' }}>
              {BRAND_NAME}
            </span>
            <span className="text-sm text-gray-500 font-medium">Admin Paneli</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100"
              title="Ara"
            >
              <Search className="h-4 w-4" />
              <span>Ara</span>
            </button>

            <Link
              href="/iletisim-mesajlari"
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 text-gray-700"
              title="Bildirimler"
            >
              <Bell className="h-5 w-5" />
              {totalAlerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold leading-none flex items-center justify-center">
                  {totalAlerts > 99 ? '99+' : totalAlerts}
                </span>
              )}
            </Link>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100"
              title="Çıkış yap"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary nav */}
      <div ref={containerRef}>
        <div className="max-w-screen-2xl mx-auto px-6">
          <nav className="flex items-stretch gap-1 -mb-px overflow-x-auto">
            {NAV.map((g, idx) => {
              const Icon = g.icon
              const active = isGroupActive(g)
              const hasDropdown = g.items.length > 0
              const counter = groupCounterTotal(g)
              const onClickHandler = (e: React.MouseEvent) => {
                if (hasDropdown) {
                  e.preventDefault()
                  setOpenIdx(openIdx === idx ? null : idx)
                }
              }
              const inner = (
                <span
                  className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? 'text-gray-900 border-orange-500'
                      : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {g.label}
                  <Badge n={counter} />
                  {hasDropdown && (
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${
                        openIdx === idx ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </span>
              )
              return (
                <div key={g.label} className="relative">
                  {hasDropdown ? (
                    <button type="button" onClick={onClickHandler} className="focus:outline-none">
                      {inner}
                    </button>
                  ) : (
                    <Link href={g.href!} className="block">
                      {inner}
                    </Link>
                  )}

                  {hasDropdown && openIdx === idx && (
                    <div className="absolute left-0 top-full mt-0 w-72 bg-white border rounded-b-lg shadow-lg overflow-hidden">
                      {g.items.map((it) => (
                        <DropdownItem
                          key={it.href}
                          item={it}
                          counters={counters}
                          active={pathname.startsWith(it.href)}
                          onSelect={() => setOpenIdx(null)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}
