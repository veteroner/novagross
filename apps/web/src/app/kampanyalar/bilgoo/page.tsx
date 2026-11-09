import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { BilgooOfferActions } from './offer-actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Bilgoo × NovaGross',
  description: 'Bilgoo iş birliğiyle NovaGross ilk sipariş kampanyası ve güncel kullanım koşulları.',
  alternates: { canonical: 'https://novagross.com/kampanyalar/bilgoo' },
}

const notices: Record<string, string> = {
  sold_out: 'Kampanya kotası doldu.',
  reserved: 'Kalan haklar şu anda ödeme aşamasında. Daha sonra tekrar kontrol edebilirsin.',
  ended: 'Kampanya sona erdi.',
  pending: 'Kampanya henüz başlamadı.',
  unavailable: 'Kampanya şu anda kullanıma açık değil.',
}

async function getOffer() {
  if (process.env.BILGOO_OFFER_CHECKOUT_ENABLED !== '1') {
    return { status: 'pending' as const, products: [], startsAt: null, endsAt: null }
  }
  try {
    const supabase = await createClient()
    const { data, error } = await (supabase as any).rpc('get_bilgoo_offer')
    if (error || !data) return { status: 'unavailable' as const, products: [], startsAt: null, endsAt: null }
    const eligibleIds: string[] = Array.isArray(data.product_ids) ? data.product_ids : []
    const { data: products } = eligibleIds.length
      ? await supabase.from('products').select('id, name, slug').eq('is_active', true).in('id', eligibleIds)
      : { data: [] }
    return { status: String(data.status), products: products ?? [], startsAt: data.starts_at, endsAt: data.ends_at }
  } catch {
    return { status: 'unavailable' as const, products: [], startsAt: null, endsAt: null }
  }
}

const date = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'Europe/Istanbul', dateStyle: 'long', timeStyle: 'short',
})

export default async function BilgooCampaignPage() {
  const { status, products, startsAt, endsAt } = await getOffer()
  const active = status === 'active'
  return (
    <div className="container max-w-5xl space-y-6 py-8 sm:py-12">
      <section aria-labelledby="bilgoo-title" className="grid overflow-hidden rounded-3xl border bg-card shadow-sm md:grid-cols-2">
        <div className="order-2 flex flex-col justify-center gap-4 p-6 sm:p-9 md:order-1">
          <p className="text-sm font-semibold tracking-wide text-primary">Bilgoo × NovaGross</p>
          <h1 id="bilgoo-title" className="text-3xl font-bold tracking-tight sm:text-4xl">
            {active ? 'İlk siparişine 100 TL indirim' : 'Bilgoo’ya özel ilk sipariş kampanyası'}
          </h1>
          {active
            ? <p className="text-muted-foreground">NovaGross hesabınla giriş yap ve ödeme adımında kampanya kodunu gir.</p>
            : <p role="status" className="font-medium">{notices[status] ?? notices.unavailable}</p>}
          <Link className="w-fit rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90" href="/urunler">
            Mağazayı keşfet
          </Link>
        </div>
        <Image src="/campaign/bilgoo.webp" alt="" width={1280} height={720} sizes="(max-width: 767px) 100vw, 480px"
          className="order-1 h-full w-full bg-indigo-50 object-cover md:order-2" priority />
      </section>
      {active && (
        <section aria-labelledby="bilgoo-terms" className="space-y-4 rounded-2xl border bg-card p-6">
          <h2 id="bilgoo-terms" className="text-xl font-semibold">Kampanya koşulları</h2>
          <BilgooOfferActions available />
          <ul className="list-disc space-y-2 pl-5">
            <li>Seçili ürünlerin toplamı kargo hariç en az 500 TL olmalı.</li>
            <li>İlk siparişte, NovaGross hesabı başına bir kez kullanılabilir.</li>
            <li>Ödemesi onaylanan ilk 20 uygun sipariş için geçerlidir. İadeler yeni bir kampanya hakkı açmaz.</li>
            <li>28 gün sürer. Bilgoo skoru ve sıralaması kampanya koşulu değildir.</li>
          </ul>
          {startsAt && endsAt && <p>Türkiye saatiyle {date.format(new Date(startsAt))} – {date.format(new Date(endsAt))}</p>}
          <Link className="underline" href="/gizlilik-politikasi#bilgoo-kampanyasi">Kampanya verileri ve gizlilik</Link>
        </section>
      )}
      {active && !!products.length && (
        <section className="space-y-3 rounded-2xl border bg-card p-6" aria-labelledby="bilgoo-products">
          <h2 id="bilgoo-products" className="text-xl font-semibold">Kampanyalı ürünler</h2>
          <ul className="list-disc space-y-1 pl-5">
            {products.map((product) => (
              <li key={product.id}><Link className="underline" href={`/urun/${product.slug}`}>{product.name}</Link></li>
            ))}
          </ul>
        </section>
      )}
      <Link className="inline-block py-2 underline underline-offset-4" href="https://bilgoo.com/kampanya/">Bilgoo Günün Yarışması’na göz at ↗</Link>
    </div>
  )
}
