import Link from 'next/link'
import { Button } from '@novagross/ui'
import { Search, Home, ShoppingBag, Mail, HelpCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        {/* 404 Hero */}
        <div className="text-center mb-12">
          <div className="text-9xl font-bold text-primary mb-4">404</div>
          <h1 className="text-4xl font-bold mb-4">Sayfa Bulunamadı</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Üzgünüz, aradığınız sayfa mevcut değil veya taşınmış olabilir.
            Aşağıdaki bağlantılardan devam edebilirsiniz.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          <Button asChild size="lg" className="h-auto py-4">
            <Link href="/">
              <Home className="h-5 w-5 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Ana Sayfa</div>
                <div className="text-xs opacity-80">Başlangıca dön</div>
              </div>
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="h-auto py-4">
            <Link href="/urunler">
              <ShoppingBag className="h-5 w-5 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Ürünleri İncele</div>
                <div className="text-xs opacity-80">Alışverişe başla</div>
              </div>
            </Link>
          </Button>
        </div>

        {/* Popular Links */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 border rounded-lg bg-card hover:shadow-md transition-shadow">
            <ShoppingBag className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Alışveriş</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/kategoriler" className="text-muted-foreground hover:text-primary">
                  Kategoriler
                </Link>
              </li>
              <li>
                <Link href="/kampanyalar" className="text-muted-foreground hover:text-primary">
                  Kampanyalar
                </Link>
              </li>
              <li>
                <Link href="/yeni-gelenler" className="text-muted-foreground hover:text-primary">
                  Yeni Gelenler
                </Link>
              </li>
            </ul>
          </div>

          <div className="p-6 border rounded-lg bg-card hover:shadow-md transition-shadow">
            <HelpCircle className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Yardım</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/sikca-sorulan-sorular" className="text-muted-foreground hover:text-primary">
                  S.S.S
                </Link>
              </li>
              <li>
                <Link href="/iletisim" className="text-muted-foreground hover:text-primary">
                  İletişim
                </Link>
              </li>
              <li>
                <Link href="/siparis-takip" className="text-muted-foreground hover:text-primary">
                  Sipariş Takip
                </Link>
              </li>
            </ul>
          </div>

          <div className="p-6 border rounded-lg bg-card hover:shadow-md transition-shadow">
            <Mail className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Kurumsal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/hakkimizda" className="text-muted-foreground hover:text-primary">
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link href="/kvkk" className="text-muted-foreground hover:text-primary">
                  KVKK
                </Link>
              </li>
              <li>
                <Link href="/gizlilik-politikasi" className="text-muted-foreground hover:text-primary">
                  Gizlilik
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Search Suggestion */}
        <div className="text-center p-6 bg-muted rounded-lg">
          <Search className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Aradığınızı bulamadınız mı? Arama yaparak istediğiniz ürünü bulabilirsiniz.
          </p>
          <Button asChild>
            <Link href="/">Anasayfaya Git ve Ara</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
