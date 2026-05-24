import Link from 'next/link'
import { Card, CardContent } from '@novagross/ui'
import { User, Package, MapPin, Heart, Settings, LogOut, Lock } from 'lucide-react'

const menuItems = [
  { label: 'Profilim', href: '/hesabim', icon: User },
  { label: 'Siparişlerim', href: '/hesabim/siparislerim', icon: Package },
  { label: 'Adreslerim', href: '/hesabim/adreslerim', icon: MapPin },
  { label: 'Favorilerim', href: '/hesabim/favorilerim', icon: Heart },
  { label: 'Şifre Değiştir', href: '/hesabim/sifre-degistir', icon: Lock },
  { label: 'Ayarlar', href: '/hesabim/ayarlar', icon: Settings },
]

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Hesabım</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <aside>
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span>{item.label}</span>
                  </Link>
                ))}
                <button className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors w-full text-left text-destructive">
                  <LogOut className="h-5 w-5" />
                  <span>Çıkış Yap</span>
                </button>
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3">{children}</div>
      </div>
    </div>
  )
}
