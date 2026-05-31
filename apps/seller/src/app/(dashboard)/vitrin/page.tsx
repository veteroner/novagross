import { PageHeader } from '@novagross/ui'
import { requireSeller } from '@/lib/auth/requireSeller'
import { StorefrontForm, type StorefrontRow } from './storefront-form'

export const dynamic = 'force-dynamic'

export default async function StorefrontPage() {
  const { supabase, storeId } = await requireSeller('/vitrin')

  const [storeRes, sfRes, productsRes, categoriesRes] = await Promise.all([
    supabase.from('stores').select('store_slug').eq('id', storeId).single(),
    (supabase as any)
      .from('store_storefront')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle(),
    supabase
      .from('products')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .order('name'),
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
  ])

  const storeSlug = storeRes.data?.store_slug ?? ''
  const initial = (sfRes.data ?? null) as StorefrontRow | null
  const webBaseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://novagross.com').replace(/\/$/, '')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mağaza Vitrini"
        description="Mağaza sayfanızı banner, öne çıkan ürün ve tema rengi ile kişiselleştirin"
      />

      <StorefrontForm
        initial={initial}
        storeSlug={storeSlug}
        products={(productsRes.data ?? []) as { id: string; name: string }[]}
        categories={(categoriesRes.data ?? []) as { id: string; name: string }[]}
        webBaseUrl={webBaseUrl}
      />
    </div>
  )
}
