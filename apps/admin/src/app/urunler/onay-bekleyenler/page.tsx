import { PageHeader, EmptyState } from '@novagross/ui'
import { BadgeCheck } from 'lucide-react'
import { ProductApprovalList } from '@/components/admin/ProductApprovalList'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { ProductChangeReview } from './product-change-review'

export default async function PendingProductsPage() {
  const { userId, supabase } = await requireAdmin('/urunler/onay-bekleyenler')

  const { data: pendingProducts, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      stock,
      sku,
      created_at,
      approval_status,
      category:category_id (
        id,
        name
      ),
      store:store_id (
        id,
        store_name,
        store_slug,
        owner:owner_id (
          id,
          email,
          first_name,
          last_name
        )
      ),
      product_images (
        id,
        url,
        sort_order
      )
    `)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load pending products:', error)
  }

  // Onaylı ürünlerin değişiklik taslakları (eski hal yayında kalır)
  const [{ data: changeProducts }, { data: cats }] = await Promise.all([
    (supabase as any)
      .from('products')
      .select(
        'id, name, slug, description, brand, barcode, meta_title, meta_description, is_digital, category_id, pending_changes, pending_changes_at, store:store_id (store_name), product_images (id, url, sort_order)'
      )
      .eq('pending_changes_status', 'pending')
      .order('pending_changes_at', { ascending: true }),
    supabase.from('categories').select('id, name'),
  ])
  const categoryNames = Object.fromEntries(((cats as any[]) ?? []).map((c) => [c.id, c.name]))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onay Bekleyen Ürünler"
        description="Satıcılar tarafından eklenen ürünleri onaylayın veya reddedin"
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Değişiklik onayı bekleyenler {changeProducts?.length ? `(${changeProducts.length})` : ''}
        </h2>
        <p className="text-sm text-muted-foreground">
          Yayındaki ürünlerde satıcının yaptığı içerik değişiklikleri. Onaylanana kadar ürün eski haliyle satışta kalır.
        </p>
        <ProductChangeReview products={(changeProducts as any) ?? []} categories={categoryNames} />
      </section>

      <h2 className="text-lg font-semibold">Yeni ürünler</h2>
      {pendingProducts && pendingProducts.length > 0 ? (
        <ProductApprovalList
          initialProducts={
            pendingProducts.map((p: any) => ({
              ...p,
              product_images: (p.product_images ?? []).map((img: any) => ({
                id: img.id,
                image_url: img.url,
                display_order: img.sort_order ?? 0,
              })),
            })) as any
          }
          adminId={userId}
        />
      ) : (
        <EmptyState
          icon={BadgeCheck}
          title="Onay bekleyen ürün yok"
          description="Tüm ürünler değerlendirildi."
        />
      )}
    </div>
  )
}
