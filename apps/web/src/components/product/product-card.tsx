import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, Button } from '@novagross/ui'
import { formatPrice, calculateDiscount } from '@novagross/utils'
import { Heart, Star, Zap, BadgeCheck, ShoppingBag, Flame, Sparkles, Truck } from 'lucide-react'
import { AddToCartQuickButton } from '@/components/product/add-to-cart-quick-button'
import { AdTracker } from '@/components/product/ad-tracker'

export type ProductCardData = {
  id: string
  name: string
  slug: string
  price: number
  compare_at_price: number | null
  stock: number | null
  brand?: string | null
  category_name?: string | null
  image_url?: string | null
  /** From store_campaigns aggregation: best discount line (for top coupon strip) */
  coupon_amount?: number | null // ek X TL kupon (sabit indirim)
  coupon_percent?: number | null // ek %X kupon
  /** From popular_products view rank — top 30 = bestseller. */
  bestseller_rank?: number | null
  /** Mağaza onaylı satıcı mı (stores.status='active') */
  verified_seller?: boolean | null
  /** Eğer ürünün hem compare_at_price hem indirimi varsa "Sepete özel" yeşil fiyatı göster. */
  cart_special?: boolean
  /** Son 14 günde eklenen ürün */
  is_new?: boolean | null
  /** Ürün için ücretsiz kargo aktif mi (free_shipping kupon veya kategori bazında) */
  free_shipping?: boolean | null
  /** Sponsorlu reklam ile öne çıkarıldı (Hepsi tarzı "Sponsorlu" rozeti) */
  is_sponsored?: boolean | null
  /** Sponsorlu ise hangi kampanyaya bağlı (impression/click loglamak için) */
  ad_campaign_id?: string | null
}

function MiniBadge({
  children,
  className = '',
  style,
  icon: Icon,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  icon?: any
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight shadow-sm ${className}`}
      style={style}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </span>
  )
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const hasCompare =
    product.compare_at_price != null && product.compare_at_price > product.price
  const discountPct = hasCompare
    ? calculateDiscount(product.price, product.compare_at_price as number)
    : null

  const isBestseller =
    typeof product.bestseller_rank === 'number' && product.bestseller_rank <= 30
  const bestsellerLabel =
    isBestseller && product.bestseller_rank! <= 3
      ? `En Çok Satan ${product.bestseller_rank}. Ürün`
      : isBestseller
      ? 'Çok Satan'
      : null

  // Effective indirim yüzdesi — compare_at_price'tan gelen + kupon/kampanyadan gelen
  // (her ikisi varsa toplam tasarrufu temsil eder)
  const couponEffectivePct = product.coupon_percent
    ? product.coupon_percent
    : product.coupon_amount && product.price > 0
    ? (product.coupon_amount / product.price) * 100
    : 0
  const totalEffectivePct = Math.max(discountPct ?? 0, couponEffectivePct)

  // "Flaş Ürün": yüksek indirim (≥%30 — kupon ya da compare_at_price)
  const isFlashDeal = totalEffectivePct >= 30

  // "Avantajlı Ürün": aktif kupon/kampanya varsa veya yüksek indirim (≥%10) varsa veya
  // bestseller + indirim (≥%15) kombosu
  const isAdvantage =
    !!(product.coupon_amount || product.coupon_percent) ||
    totalEffectivePct >= 15 ||
    (isBestseller && totalEffectivePct >= 10)

  // Hesaplanmış kupon — fixed öncelik, sonra yüzde
  const couponLine =
    product.coupon_amount && product.coupon_amount > 0
      ? `Ek ${Number(product.coupon_amount).toFixed(0)} TL Kupon`
      : product.coupon_percent && product.coupon_percent > 0
      ? `Ek %${product.coupon_percent} Kupon`
      : null

  const cartSpecialPrice = product.cart_special && product.coupon_amount
    ? Math.max(0, product.price - product.coupon_amount)
    : product.cart_special && product.coupon_percent
    ? product.price * (1 - product.coupon_percent / 100)
    : null

  const card = (
    <Card className="group overflow-hidden flex flex-col">
      {/* Top coupon strip — Hepsi tarzı turuncu bant */}
      {couponLine && (
        <div
          className="px-3 py-1.5 text-center text-xs font-semibold text-white"
          style={{ backgroundColor: '#FF6000' }}
        >
          {couponLine}
        </div>
      )}

      {/* Image */}
      <div className="relative aspect-square bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={`${product.name}${product.category_name ? ` - ${product.category_name}` : ''}${product.brand ? ` (${product.brand})` : ''}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl text-muted-foreground">
            📦
          </div>
        )}

        {/* Top-left badges stack */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start max-w-[80%]">
          {product.is_sponsored && (
            <MiniBadge className="text-white bg-gray-800/90 backdrop-blur-sm">
              Sponsorlu
            </MiniBadge>
          )}
          {isAdvantage && (
            <MiniBadge
              icon={Star}
              className="text-white"
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              }}
            >
              Avantajlı Ürün
            </MiniBadge>
          )}
          {bestsellerLabel && (
            <MiniBadge
              icon={ShoppingBag}
              className="text-white"
              style={{ backgroundColor: '#FF6000' }}
            >
              {bestsellerLabel}
            </MiniBadge>
          )}
          {isFlashDeal && (
            <MiniBadge icon={Flame} className="text-white bg-pink-600">
              Flaş Ürün
            </MiniBadge>
          )}
          {totalEffectivePct > 0 && !isFlashDeal && !isAdvantage && (
            <MiniBadge icon={Zap} className="text-white bg-red-600">
              %{Math.round(totalEffectivePct)} İndirim
            </MiniBadge>
          )}
          {product.is_new && (
            <MiniBadge icon={Sparkles} className="text-white bg-purple-600">
              Yeni Geldi
            </MiniBadge>
          )}
          {product.verified_seller && (
            <MiniBadge icon={BadgeCheck} className="text-white bg-blue-600">
              Yetkili Satıcı
            </MiniBadge>
          )}
        </div>

        {/* Bottom-left mini info: Kargo Bedava */}
        {product.free_shipping && (
          <div className="absolute bottom-2 left-2">
            <MiniBadge icon={Truck} className="text-white bg-emerald-700">
              Kargo Bedava
            </MiniBadge>
          </div>
        )}

        {/* Wishlist (hover) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="secondary" size="icon" className="h-8 w-8">
            <Heart className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick view overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Link href={`/urun/${product.slug}`}>
            <Button variant="secondary">Hızlı Bakış</Button>
          </Link>
        </div>
      </div>

      <CardContent className="p-4 flex flex-col flex-1">
        {/* Category / brand */}
        <p className="text-xs text-muted-foreground mb-1 truncate">
          {product.brand || product.category_name || ' '}
        </p>

        {/* Title */}
        <Link href={`/urun/${product.slug}`}>
          <h3 className="font-medium text-foreground hover:text-primary line-clamp-2 min-h-[42px]">
            {product.name}
          </h3>
        </Link>

        {/* Stock status (compact) */}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {product.stock === null || product.stock > 0 ? (
            <span className="text-green-600">Stokta</span>
          ) : (
            <span className="text-red-600">Tükendi</span>
          )}
        </div>

        {/* Price block — Hepsi tarzı "Sepete özel" */}
        <div className="mt-2">
          {cartSpecialPrice != null ? (
            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex items-baseline gap-1 px-1.5 py-0.5 rounded bg-green-50 border border-green-200">
                <span className="text-[10px] font-semibold text-green-700 uppercase">
                  Sepete özel
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-lg text-green-700">
                  {formatPrice(cartSpecialPrice)}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.price)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-lg text-foreground">
                {formatPrice(product.price)}
              </span>
              {hasCompare && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.compare_at_price as number)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Add to cart */}
        <div className="mt-3">
          <AddToCartQuickButton
            product={{
              id: product.id,
              name: product.name,
              price: cartSpecialPrice ?? product.price,
              stock: product.stock,
              image: product.image_url ?? null,
            }}
          />
        </div>
      </CardContent>
    </Card>
  )

  if (product.is_sponsored && product.ad_campaign_id) {
    return (
      <AdTracker campaignId={product.ad_campaign_id} productId={product.id}>
        {card}
      </AdTracker>
    )
  }

  return card
}
