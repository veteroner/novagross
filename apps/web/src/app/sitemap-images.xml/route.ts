import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // Fetch all active products with images
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      product_images (
        url
      )
    `)
    .eq('is_active', true)
    .eq('approval_status', 'approved')

  const images: Array<{
    loc: string
    title: string
    caption: string
  }> = []

  for (const product of products || []) {
    const productImages = product.product_images || []
    for (const image of productImages) {
      if (image?.url) {
        images.push({
          loc: image.url,
          title: product.name,
          caption: `${product.name} - Novagross'da satışta`,
        })
      }
    }
  }

  // Generate XML sitemap
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${products
  ?.map((product) => {
    const productImages = product.product_images || []
    if (productImages.length === 0) return ''

    return `  <url>
    <loc>https://novagross.com/urun/${product.slug}</loc>
${productImages
  .map(
    (img) =>
      `    <image:image>
      <image:loc>${img.url}</image:loc>
      <image:title>${product.name}</image:title>
      <image:caption>${product.name} - Novagross'da satışta</image:caption>
    </image:image>`
  )
  .join('\n')}
  </url>`
  })
  .filter(Boolean)
  .join('\n')}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate',
    },
  })
}
