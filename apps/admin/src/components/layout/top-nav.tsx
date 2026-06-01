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
  ChevronDown,
  Bell,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type CounterKey =
  | 'pendingProducts'
  | 'pendingReviews'
  | 'newMessages'
  | 'pendingWithdrawals'
  | 'pendingApplications'
  | 'openClaims'
  | 'escalatedClaims'
  | 'pendingAds'
  | 'pendingInfluencers'

type NavLeaf = {
  href: string
  label: string
  icon?: LucideIcon
  counter?: CounterKey
  description?: string
}

type NavGroup = {
  label: string
  icon: LucideIcon
  href?: string // direct link if no dropdown
  items: NavLeaf[]
  surfacesCounters?: CounterKey[]
}

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Trendikon'

const NAV: NavGroup[] = [
  { label: 'Anasayfa', icon: LayoutDashboard, href: '/', items: [] },
  {
    label: 'Ürünler',
    icon: Package,
    items: [
      { href: '/urunler', label: 'Tüm Ürünler', icon: Package, description: 'Liste, düzenle, sil' },
      {
        href: '/urunler/onay-bekleyenler',
        label: 'Onay Bekleyenler',
        icon: BadgeCheck,
        description: 'Satıcı ürün onayı',
        counter: 'pendingProducts',
      },
      { href: '/urunler/ekle', label: 'Yeni Ürün Ekle', icon: Package, description: 'Manuel ekle' },
      { href: '/urunler/stok-gecmisi', label: 'Stok Geçmişi', icon: Package, description: 'Hareketler' },
      { href: '/kategoriler', label: 'Kategoriler', icon: Tag, description: 'Kategori ağacı' },
    ],
    surfacesCounters: ['pendingProducts'],
  },
  { label: 'Sipariş', icon: ShoppingCart, href: '/siparisler', items: [] },
  { label: 'Müşteriler', icon: Users, href: '/musteriler', items: [] },
  {
    label: 'Pazaryeri',
    icon: Store,
    items: [
      { href: '/saticilar', label: 'Satıcılar', icon: Store, description: 'Mağaza listesi' },
      {
        href: '/saticilar/basvurular',
        label: 'Başvurular',
        icon: Store,
        description: 'Bekleyen',
        counter: 'pendingApplications',
      },
      {
        href: '/para-cekme',
        label: 'Para Çekme',
        icon: Banknote,
        description: 'Withdrawal',
        counter: 'pendingWithdrawals',
      },
      { href: '/odemeler', label: 'Haftalık Ödemeler', icon: Wallet, description: 'Çarşamba batch' },
      { href: '/ayarlar/komisyon', label: 'Komisyon', icon: Settings, description: 'Satıcı oranları' },
    ],
    surfacesCounters: ['pendingApplications', 'pendingWithdrawals'],
  },
  {
    label: 'Pazarlama',
    icon: Megaphone,
    items: [
      { href: '/banners', label: 'Bannerlar', icon: ImageIcon, description: 'Anasayfa görselleri' },
      { href: '/kuponlar', label: 'Kuponlar', icon: Ticket, description: 'İndirim kodları' },
      {
        href: '/reklamlar',
        label: 'Reklamlar',
        icon: Megaphone,
        description: 'Sponsorlu ürün moderasyonu',
        counter: 'pendingAds',
      },
      {
        href: '/influencerlar',
        label: 'Influencerlar',
        icon: Users,
        description: 'Affiliate program & komisyon',
        counter: 'pendingInfluencers',
      },
      {
        href: '/yorumlar',
        label: 'Yorumlar',
        icon: MessageSquare,
        description: 'Onay & moderasyon',
        counter: 'pendingReviews',
      },
    ],
    surfacesCounters: ['pendingReviews', 'pendingAds', 'pendingInfluencers'],
  },
  {
    label: 'E-posta',
    icon: Mail,
    items: [
      { href: '/aboneler', label: 'Aboneler', icon: Mail, description: 'Bülten' },
      { href: '/email-logs', label: 'Loglar', icon: Mail, description: 'Gönderim kayıtları' },
      { href: '/email-templates-analytics', label: 'Şablon Analitiği', icon: BarChart3, description: 'Açılma & tıklama' },
      { href: '/email-unsubscribes', label: 'Çıkışlar', icon: Mail, description: 'Abonelikten çıkanlar' },
      { href: '/ayarlar/email-sablonlari', label: 'Şablonlar', icon: Mail, description: '49 hazır şablon' },
    ],
  },
  {
    label: 'İletişim',
    icon: MessageSquare,
    items: [
      {
        href: '/iletisim-mesajlari',
        label: 'İletişim Mesajları',
        icon: MessageSquare,
        description: 'Genel iletişim formu',
        counter: 'newMessages',
      },
      {
        href: '/talepler',
        label: 'Müşteri Talepleri',
        icon: MessageSquare,
        description: 'İade / değişim / şikayet',
        counter: 'openClaims',
      },
    ],
    surfacesCounters: ['newMessages', 'openClaims'],
  },
  {
    label: 'Raporlar',
    icon: BarChart3,
    items: [
      { href: '/raporlar', label: 'Platform Raporları', icon: BarChart3, description: 'GMV, top satıcılar' },
      { href: '/raporlar/anlik-trafik', label: 'Anlık Trafik', icon: BarChart3, description: 'Canlı kullanıcılar' },
    ],
  },
  {
    label: 'Ayarlar',
    icon: Settings,
    items: [
      { href: '/ayarlar', label: 'Genel', icon: Settings, description: 'Ayar paneli' },
      { href: '/ayarlar/site', label: 'Site Ayarları', icon: Settings, description: 'Ortam değişkenleri' },
      { href: '/ayarlar/guvenlik', label: 'Güvenlik', icon: Settings, description: 'Admin & yetki' },
      { href: '/ayarlar/kargo', label: 'Kargo', icon: Settings, description: 'Firma & oranlar' },
    ],
  },
]

const EMPTY_COUNTERS: Record<CounterKey, number> = {
  pendingProducts: 0,
  pendingReviews: 0,
  newMessages: 0,
  pendingWithdrawals: 0,
  pendingApplications: 0,
  openClaims: 0,
  escalatedClaims: 0,
  pendingAds: 0,
  pendingInfluencers: 0,
}

async function fetchCounters(supabase: ReturnType<typeof createClient>) {
  const [a, b, c, d, e, f, g, h, i] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
    supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('store_applications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    (supabase as any)
      .from('customer_claims')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress', 'escalated']),
    (supabase as any)
      .from('customer_claims')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'escalated'),
    (supabase as any)
      .from('ad_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    (supabase as any)
      .from('influencers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])
  return {
    pendingProducts: a.count ?? 0,
    pendingReviews: b.count ?? 0,
    newMessages: c.count ?? 0,
    pendingWithdrawals: d.count ?? 0,
    pendingApplications: e.count ?? 0,
    openClaims: f.count ?? 0,
    escalatedClaims: g.count ?? 0,
    pendingAds: h.count ?? 0,
    pendingInfluencers: i.count ?? 0,
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

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [counters, setCounters] = useState(EMPTY_COUNTERS)

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

  const onLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isGroupActive = (g: NavGroup) => {
    if (g.href && (g.href === '/' ? pathname === '/' : pathname.startsWith(g.href))) return true
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
    counters.pendingApplications +
    counters.escalatedClaims

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

          <div className="flex items-center gap-2">
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
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
              title="Çıkış yap"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary nav — CSS-only hover/focus dropdowns (no JS state).
          IMPORTANT: no `overflow-x-auto` here — that clips the absolutely
          positioned dropdown menu on the y-axis (browsers force overflow-y
          to a non-visible value when overflow-x is auto/scroll). */}
      <div className="max-w-screen-2xl mx-auto px-6">
        <nav className="flex items-stretch gap-1 -mb-px flex-wrap">
          {NAV.map((g) => {
            const Icon = g.icon
            const active = isGroupActive(g)
            const hasDropdown = g.items.length > 0
            const counter = groupCounterTotal(g)

            const labelInner = (
              <span
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'text-gray-900 border-orange-500'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {g.label}
                <Badge n={counter} />
                {hasDropdown && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
              </span>
            )

            // Group with dropdown: hover/focus reveals menu via CSS-only.
            if (hasDropdown) {
              return (
                <div key={g.label} className="relative group">
                  {/* Tabbable trigger — keyboard focus also opens menu */}
                  <button type="button" tabIndex={0} className="focus:outline-none cursor-pointer">
                    {labelInner}
                  </button>

                  {/* Menu — opens when group is hovered or any descendant is focused */}
                  <div
                    className="absolute left-0 top-full w-72 bg-white border rounded-b-lg shadow-xl overflow-hidden z-50
                               opacity-0 invisible translate-y-1
                               group-hover:opacity-100 group-hover:visible group-hover:translate-y-0
                               group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0
                               transition duration-150"
                    role="menu"
                  >
                    {g.items.map((it) => {
                      const ItemIcon = it.icon
                      const count = it.counter ? counters[it.counter] : 0
                      const itemActive = pathname.startsWith(it.href)
                      return (
                        <Link
                          key={it.href}
                          href={it.href}
                          role="menuitem"
                          className={`flex items-start gap-3 px-4 py-2.5 hover:bg-orange-50 focus:bg-orange-50 outline-none ${
                            itemActive ? 'bg-orange-50' : ''
                          }`}
                        >
                          {ItemIcon ? (
                            <ItemIcon className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              {it.label}
                              <Badge n={count} />
                            </div>
                            {it.description ? (
                              <div className="text-xs text-gray-500 mt-0.5">{it.description}</div>
                            ) : null}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            }

            // Direct link, no dropdown.
            return (
              <Link key={g.label} href={g.href!} className="block">
                {labelInner}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
