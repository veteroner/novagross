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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Onay Bekleyen Ürünler</h1>
        <p className="mt-2 text-gray-600">
          Satıcılar tarafından eklenen ürünleri onaylayın veya reddedin
        </p>
      </div>

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
        <div className="text-center py-12">
          <p className="text-gray-500">Henüz onay bekleyen ürün bulunmuyor</p>
        </div>
      )}
    </div>
  )
}
