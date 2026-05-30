import Link from 'next/link'
import { Card, Button, PageHeader } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { Percent, Truck, Mail, Globe, Shield } from 'lucide-react'

export default async function SettingsPage() {
  await requireAdmin('/ayarlar')

  const settingsSections = [
    {
      title: 'Komisyon Ayarları',
      description: 'Satıcı komisyon oranlarını yönetin',
      icon: Percent,
      href: '/ayarlar/komisyon',
      available: true,
    },
    {
      title: 'Kargo Ayarları',
      description: 'Kargo firmaları ve ücretlendirme',
      icon: Truck,
      href: '/ayarlar/kargo',
      available: true,
    },
    {
      title: 'E-posta Şablonları',
      description: 'Otomatik e-posta şablonlarını görüntüleyin ve test edin',
      icon: Mail,
      href: '/ayarlar/email-sablonlari',
      available: true,
    },
    {
      title: 'Site Ayarları',
      description: 'Ortam değişkenleri ve sistem durumu',
      icon: Globe,
      href: '/ayarlar/site',
      available: true,
    },
    {
      title: 'Güvenlik',
      description: 'Admin hesapları, kimlik doğrulama ve uyarı sinyalleri',
      icon: Shield,
      href: '/ayarlar/guvenlik',
      available: true,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Ayarlar" description="Sistem ayarları" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsSections.map((section) => (
          <Card key={section.title} className={`p-6 ${!section.available ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <section.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{section.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{section.description}</p>
              </div>
            </div>
            {section.available && section.href ? (
              <Link href={section.href}>
                <Button variant="outline" className="w-full">
                  Yönet
                </Button>
              </Link>
            ) : (
              <Button variant="outline" className="w-full" disabled>
                Yakında
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
