import { PageHeader, EmptyState } from '@novagross/ui'
import { BadgeCheck } from 'lucide-react'
import { ProductApprovalList } from '@/components/admin/ProductApprovalList'
import { requireAdmin } from '@/lib/auth/requireAdmin'

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onay Bekleyen Ürünler"
        description="Satıcılar tarafından eklenen ürünleri onaylayın veya reddedin"
      />

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
