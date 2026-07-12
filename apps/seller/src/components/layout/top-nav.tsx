'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  HelpCircle,
  Tag,
  Megaphone,
  TrendingUp,
  ChevronDown,
  Bell,
  AlertCircle,
  BadgeCheck,
  Activity,
  RefreshCcw,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type CounterKey =
  | 'pendingReviews'
  | 'pendingQuestions'
  | 'pendingOrders'
  | 'cartSuggestions'
  | 'openClaims'
  | 'pendingProducts'
  | 'pendingPlatformOffers'

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
  href?: string
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
      { href: '/urunler', label: 'Tüm Ürünlerim', icon: Package },
      {
        href: '/urunler/aksiyon-bekleyen',
        label: 'Aksiyon Bekleyenler',
        icon: BadgeCheck,
        description: 'Onay/red/az stok/pasif',
        counter: 'pendingProducts',
      },
    ],
    surfacesCounters: ['pendingProducts'],
  },
  {
    label: 'Siparişler',
    icon: ShoppingCart,
    href: '/siparisler',
    items: [],
    surfacesCounters: ['pendingOrders'],
  },
  {
    label: 'Pazarlama',
    icon: Megaphone,
    items: [
      { href: '/kuponlar', label: 'Kuponlar', icon: Tag, description: 'İndirim kodları' },
      {
        href: '/kampanyalar',
        label: 'Kampanyalar',
        icon: Megaphone,
        description: 'BOGO + sepet indirimleri',
      },
      {
        href: '/rota',
        label: 'Fiyat Önerileri (Rota)',
        icon: TrendingUp,
        description: 'Sepette bekleyenler için indirim',
        counter: 'cartSuggestions',
      },
      {
        href: '/reklam',
        label: 'Reklam',
        icon: Megaphone,
        description: 'Sponsorlu ürün & marka',
      },
      {
        href: '/avantajli-teklifler',
        label: 'Avantajlı Teklifler',
        icon: Megaphone,
        description: 'Platform destekli kampanya teklifleri',
        counter: 'pendingPlatformOffers',
      },
    ],
    surfacesCounters: ['cartSuggestions'],
  },
  {
    label: 'Müşteri',
    icon: MessageSquare,
    items: [
      {
        href: '/yorumlar',
        label: 'Yorumlar',
        icon: MessageSquare,
        description: 'Ürün & mağaza yorumları',
        counter: 'pendingReviews',
      },
      {
        href: '/sorular',
        label: 'Ürün Soruları',
        icon: HelpCircle,
        description: 'Müşteri soruları',
        counter: 'pendingQuestions',
      },
      {
        href: '/talepler',
        label: 'Müşteri Talepleri',
        icon: RefreshCcw,
        description: 'İade / değişim / şikayet',
        counter: 'openClaims',
      },
      { href: '/mesajlar', label: 'Mesajlar', icon: MessageSquare, description: 'Sipariş mesajları' },
    ],
    surfacesCounters: ['pendingReviews', 'pendingQuestions', 'openClaims'],
  },
  {
    label: 'Performans',
    icon: Activity,
    items: [
      {
        href: '/performans',
        label: 'Satıcı Performansı',
        icon: Activity,
        description: 'Sağlık metrikleri',
      },
      { href: '/raporlar', label: 'Raporlar', icon: BarChart3, description: 'Top ürün, yorum, kampanya' },
      {
        href: '/kacan-satislar',
        label: 'Kaçan Satışlar',
        icon: Activity,
        description: 'İlgilenen ama almayanlara teklif gönder',
      },
      {
        href: '/oneriler/stok',
        label: 'Stok Önerileri',
        icon: Package,
        description: 'Tükenecek ürünler',
      },
      { href: '/analizler', label: 'Satış Analizleri', icon: BarChart3, description: 'Klasik analiz' },
    ],
  },
  {
    label: 'Finans',
    icon: Wallet,
    items: [
      { href: '/kazanclarim', label: 'Kazançlarım', icon: Wallet, description: 'Bakiye & ödemeler' },
      { href: '/vergi', label: 'Vergi & Stopaj', icon: Wallet, description: 'Aylık %1 kesintiler & tevkifat belgesi' },
    ],
  },
  {
    label: 'Mağaza',
    icon: Store,
    items: [
      { href: '/vitrin', label: 'Mağaza Vitrini', icon: Store, description: 'Banner, öne çıkan ürünler' },
      { href: '/magaza', label: 'Mağaza Ayarları', icon: Store, description: 'Profil, logo' },
      {
        href: '/teslimat-profilleri',
        label: 'Teslimat Profilleri',
        icon: Activity,
        description: 'Kargo şablonları',
      },
      { href: '/belgeler', label: 'Belgelerim', icon: Settings, description: 'Vergi, kimlik, sözleşme' },
      { href: '/profil', label: 'Profil', icon: User, description: 'Hesap bilgileri' },
      { href: '/ayarlar', label: 'Ayarlar', icon: Settings, description: 'Genel ayarlar' },
    ],
  },
]

const EMPTY_COUNTERS: Record<CounterKey, number> = {
  pendingReviews: 0,
  pendingQuestions: 0,
  pendingOrders: 0,
  cartSuggestions: 0,
  openClaims: 0,
  pendingProducts: 0,
  pendingPlatformOffers: 0,
}

async function fetchCounters(
  supabase: ReturnType<typeof createClient>,
  storeId: string | null
): Promise<Record<CounterKey, number>> {
  if (!storeId) return EMPTY_COUNTERS
  // First — collect product ids once
  const { data: productRows } = await supabase
    .from('products')
    .select('id')
    .eq('store_id', storeId)
  const productIds = (productRows ?? []).map((p: any) => p.id)

  const [a, b, c, d, e, f, g] = await Promise.all([
    productIds.length > 0
      ? (supabase as any)
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .is('seller_reply', null)
          .in('product_id', productIds)
      : Promise.resolve({ count: 0 } as any),
    productIds.length > 0
      ? (supabase as any)
          .from('product_questions')
          .select('id', { count: 'exact', head: true })
          .is('answer', null)
          .in('product_id', productIds)
      : Promise.resolve({ count: 0 } as any),
    supabase
      .from('order_items')
      .select('id, order:orders!inner(id)', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('order.payment_status', 'paid'),
    (supabase as any)
      .from('seller_cart_suggestions')
      .select('product_id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .gt('pending_cart_count', 0),
    (supabase as any)
      .from('customer_claims')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .in('status', ['open', 'in_progress', 'escalated']),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .in('approval_status', ['pending', 'rejected']),
    (supabase as any)
      .from('platform_offers')
      .select('id', { count: 'exact', head: true })
      .or(`store_id.eq.${storeId},store_id.is.null`)
      .eq('status', 'pending'),
  ])
  return {
    pendingReviews: a.count ?? 0,
    pendingQuestions: b.count ?? 0,
    pendingOrders: c.count ?? 0,
    cartSuggestions: d.count ?? 0,
    openClaims: e.count ?? 0,
    pendingProducts: f.count ?? 0,
    pendingPlatformOffers: g.count ?? 0,
  }
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-green-600 text-white text-[10px] font-bold leading-none ml-1">
      {n > 99 ? '99+' : n}
    </span>
  )
}

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [counters, setCounters] = useState(EMPTY_COUNTERS)
  const [storeName, setStoreName] = useState('')
  const [storeId, setStoreId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        const { data: store } = await supabase
          .from('stores')
          .select('id, store_name')
          .eq('owner_id', user.id)
          .single()
        if (!store || cancelled) return
        setStoreId(store.id)
        setStoreName(store.store_name)
        const c = await fetchCounters(supabase, store.id)
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
    counters.pendingReviews +
    counters.pendingQuestions +
    counters.openClaims +
    counters.pendingProducts +
    counters.cartSuggestions

  return (
    <header className="bg-white border-b sticky top-0 z-40">
      {/* Brand bar */}
      <div className="border-b">
        <div className="max-w-screen-2xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <img src="/logo.webp" alt={BRAND_NAME} className="h-16 w-auto" />
            <span className="text-sm text-gray-500 font-medium truncate">
              {storeName || 'Satıcı Paneli'}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/yorumlar"
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 text-gray-700"
              title="Bildirimler"
            >
              <Bell className="h-5 w-5" />
              {totalAlerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-green-600 text-white text-[10px] font-bold leading-none flex items-center justify-center">
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

      {/* Primary nav — CSS-only hover/focus dropdowns */}
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
                    ? 'text-gray-900 border-green-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {g.label}
                <Badge n={counter} />
                {hasDropdown && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
              </span>
            )

            if (hasDropdown) {
              return (
                <div key={g.label} className="relative group">
                  <button type="button" tabIndex={0} className="focus:outline-none cursor-pointer">
                    {labelInner}
                  </button>
                  <div
                    role="menu"
                    className="absolute left-0 top-full w-72 bg-white border rounded-b-lg shadow-xl overflow-hidden z-50
                               opacity-0 invisible translate-y-1
                               group-hover:opacity-100 group-hover:visible group-hover:translate-y-0
                               group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0
                               transition duration-150"
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
                          className={`flex items-start gap-3 px-4 py-2.5 hover:bg-green-50 focus:bg-green-50 outline-none ${
                            itemActive ? 'bg-green-50' : ''
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
