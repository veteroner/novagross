import { Card } from '@novagross/ui'
import { CategoryGrid } from '@/components/home/category-grid'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kategoriler',
  description: 'Novagross ürün kategorilerine göz atın',
}

export default function CategoriesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tüm Kategoriler</h1>
        <p className="text-muted-foreground">
          Aradığınız ürünü bulmak için kategorilerimize göz atın
        </p>
      </div>

      <CategoryGrid />

      <Card className="mt-8 p-6 bg-muted">
        <h2 className="text-xl font-semibold mb-4">Kategoriler Hakkında</h2>
        <p className="text-muted-foreground mb-4">
          Novagross olarak geniş ürün yelpazemizle size hizmet vermekten mutluluk duyuyoruz.
          Kategorilerimiz sürekli güncellenmekte ve yeni ürünler eklenmektedir.
        </p>
        <p className="text-muted-foreground">
          Aradığınız ürünü bulamadıysanız, arama çubuğunu kullanabilir veya 
          müşteri hizmetlerimizle iletişime geçebilirsiniz.
        </p>
      </Card>
    </div>
  )
}
