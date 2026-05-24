import { Metadata } from 'next'
import { Mail, Phone, MapPin } from 'lucide-react'
import { Card } from '@novagross/ui'
import { ContactForm } from '@/components/contact/contact-form'
import { generateMetadata as genMetadata } from '@/lib/metadata'
import { JsonLd } from '@/components/seo/json-ld'
import { generateBreadcrumbSchema, generateWebPageSchema } from '@/lib/structured-data'

export const metadata: Metadata = genMetadata({
  title: 'İletişim',
  description: 'Novagross müşteri hizmetleri ile iletişime geçin. Sorularınız ve talepleriniz için 7/24 hizmetinizdeyiz. Telefon: 0312 345 67 89, Adres: Sıncan/Ankara',
  keywords: ['iletişim', 'müşteri hizmetleri', 'destek', 'telefon', 'e-posta', 'adres'],
  url: '/iletisim',
})

export const revalidate = 60 * 60 * 12

export default function IletisimPage() {
  return (
    <>
      <JsonLd
        data={generateWebPageSchema({
          name: 'İletişim',
          description: 'Novagross müşteri hizmetleri ile iletişime geçin.',
          url: '/iletisim',
        })}
      />
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: 'Ana Sayfa', url: '/' },
          { name: 'İletişim', url: '/iletisim' },
        ])}
      />

      <div className="container max-w-6xl py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">İletişim</h1>
        <p className="text-muted-foreground text-lg">
          Sorularınız veya önerileriniz için bizimle iletişime geçebilirsiniz
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Phone className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">Telefon</h3>
          <a href="tel:08508502020" className="text-primary hover:underline">
            0850 850 20 20
          </a>
          <p className="text-sm text-muted-foreground mt-2">
            Hafta içi 09:00 - 18:00
          </p>
        </Card>

        <Card className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">E-posta</h3>
          <a href="mailto:bilgi@teknovagroup.com" className="text-primary hover:underline">
            bilgi@teknovagroup.com
          </a>
          <p className="text-sm text-muted-foreground mt-2">
            24 saat içinde yanıt
          </p>
        </Card>

        <Card className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">Adres</h3>
          <p className="text-sm">
            Mevlana Mah. 432 Cad.<br />
            No: 8 İç Kapı No: 23<br />
            Sıncan/Ankara
          </p>
        </Card>
      </div>

      <ContactForm />

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <h3 className="font-semibold mb-2">Çalışma Saatleri</h3>
        <p>Pazartesi - Cuma: 09:00 - 18:00</p>
        <p>Cumartesi: 10:00 - 16:00</p>
        <p>Pazar: Kapalı</p>
      </div>
      </div>
    </>
  )
}
