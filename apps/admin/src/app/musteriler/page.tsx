import Link from 'next/link'
import { Card, Badge, PageHeader, EmptyState } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { Mail, Phone, ShoppingBag, ChevronRight, Users } from 'lucide-react'

export default async function CustomersPage() {
  const { supabase } = await requireAdmin('/musteriler')

  const { data: customers } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      first_name,
      last_name,
      phone,
      created_at,
      orders:orders(count)
    `)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Müşteriler"
        description={`Toplam ${customers?.length || 0} müşteri`}
      />

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">Ad Soyad</th>
                <th className="text-left py-3 px-4 font-medium">İletişim</th>
                <th className="text-left py-3 px-4 font-medium">Sipariş</th>
                <th className="text-left py-3 px-4 font-medium">Üyelik</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {customers?.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b hover:bg-gray-50 cursor-pointer group"
                >
                  <td className="py-3 px-4">
                    <Link href={`/musteriler/${customer.id}`} className="block">
                      <p className="font-medium group-hover:text-primary">
                        {[customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'İsimsiz'}
                      </p>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/musteriler/${customer.id}`} className="block">
                      <div className="flex flex-col gap-1 text-sm">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/musteriler/${customer.id}`} className="block">
                      <Badge variant="secondary">
                        <ShoppingBag className="h-3 w-3 mr-1" />
                        {(customer.orders as any)?.[0]?.count || 0}
                      </Badge>
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    <Link href={`/musteriler/${customer.id}`} className="block">
                      {customer.created_at ? new Date(customer.created_at).toLocaleDateString('tr-TR') : '-'}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-gray-400 group-hover:text-primary">
                    <Link href={`/musteriler/${customer.id}`} className="block">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!customers || customers.length === 0 ? (
            <EmptyState compact icon={Users} title="Henüz müşteri yok" />
          ) : null}
        </div>
      </Card>
    </div>
  )
}
