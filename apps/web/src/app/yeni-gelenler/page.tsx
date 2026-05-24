import Link from 'next/link'
import { generateMetadata as genMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/json-ld'

export const metadata = genMetadata({
  title: 'Yeni Gelenler - En Yeni Ürünler',
  description:
    'Novagross\'a yeni eklenen ürünleri keşfedin! Elektronik, moda, ev & yaşam kategorilerinde en son eklenen ürünler burada. Hemen inceleyin ve fırsatları kaçırmayın.',
  keywords: [
    'yeni ürünler',
    'yeni gelenler',
    'son eklenen ürünler',
    'yeni koleksiyon',
    'online alışveriş',
    'novagross yeni',
  ],
  url: '/yeni-gelenler',
})

export default function YeniGelenlerPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Ana Sayfa',
        item: 'https://novagross.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Yeni Gelenler',
        item: 'https://novagross.com/yeni-gelenler',
      },
    ],
  }

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <div className="container py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-primary">
                Ana Sayfa
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground font-medium">
              Yeni Gelenler
            </li>
          </ol>
        </nav>

        <h1 className="text-4xl font-bold mb-4">Yeni Gelenler</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Novagross&apos;a yeni eklenen ürünleri keşfedin. En yeni ürünler, en güncel koleksiyonlar burada.
        </p>

        <div className="text-center py-20 bg-muted/30 rounded-lg">
          <p className="text-xl text-muted-foreground mb-4">
            Çok yakında yeni ürünler eklenecektir.
          </p>
          <p className="text-muted-foreground mb-8">
            Tüm ürünlerimizi incelemek için aşağıdaki butonu kullanabilirsiniz.
          </p>
          <Link
            href="/urunler"
            className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-md font-medium hover:bg-primary/90"
          >
            Tüm Ürünleri İncele
          </Link>
        </div>
      </div>
    </>
  )
}
