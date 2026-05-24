import Link from 'next/link'
import { Button } from '@novagross/ui'

export function HeroBanner() {
  return (
    <section className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container py-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Yeni Sezon Ürünleri
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-8">
            En yeni trendler ve en kaliteli ürünler şimdi Novagross'da.
            %50'ye varan indirimlerle alışverişin keyfini çıkarın!
          </p>
          <div className="flex gap-4">
            <Button asChild size="lg" variant="secondary">
              <Link href="/urunler">Alışverişe Başla</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/kampanyalar">Kampanyaları Gör</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
