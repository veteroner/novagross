import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Kampanyalar',
  description: 'Novagross aktif kampanyalar ve fırsatlar',
}

export default function KampanyalarPage() {
  return (
    <div className="container py-12">
      <h1 className="text-4xl font-bold mb-8">Kampanyalar</h1>
      
      <div className="text-center py-20">
        <p className="text-xl text-muted-foreground mb-4">
          Şu anda aktif kampanya bulunmamaktadır.
        </p>
        <p className="text-muted-foreground mb-8">
          Yeni kampanyalardan haberdar olmak için bültenimize abone olabilirsiniz.
        </p>
        <Link
          href="/urunler"
          className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-md font-medium hover:bg-primary/90"
        >
          Ürünleri İncele
        </Link>
      </div>
    </div>
  )
}
