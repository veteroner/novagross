import { useWishlist } from '@/lib/cart'
import { useAuth } from '@/providers/auth'
import { LoginPrompt } from '@/components/login-prompt'
import { ProductGrid } from '@/components/product'
import { Empty, Loading, Screen } from '@/components/ui'

export default function Favorites() {
  const { session } = useAuth()
  const { data, isLoading, refetch, isRefetching } = useWishlist()
  if (!session) return <LoginPrompt text="Favori ürünlerinizi kaydetmek için giriş yapın." />
  if (isLoading) return <Loading />
  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      {data?.length ? <ProductGrid items={data.map((w) => w.product)} /> : <Empty text="Favori ürününüz yok. Ürün sayfasındaki ♡ ile ekleyin." />}
    </Screen>
  )
}
