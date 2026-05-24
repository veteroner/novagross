import { Card, Badge } from '@novagross/ui'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { Mail, Phone, ShoppingBag } from 'lucide-react'

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Müşteriler</h1>
        <p className="text-gray-600 mt-1">Toplam {customers?.length || 0} müşteri</p>
      </div>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">Ad Soyad</th>
                <th className="text-left py-3 px-4 font-medium">İletişim</th>
                <th className="text-left py-3 px-4 font-medium">Sipariş</th>
                <th className="text-left py-3 px-4 font-medium">Üyelik</th>
              </tr>
            </thead>
            <tbody>
              {customers?.map((customer) => (
                <tr key={customer.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <p className="font-medium">
                      {[customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'İsimsiz'}
                    </p>
                  </td>
                  <td className="py-3 px-4">
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
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">
                      <ShoppingBag className="h-3 w-3 mr-1" />
                      {(customer.orders as any)?.[0]?.count || 0}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {customer.created_at ? new Date(customer.created_at).toLocaleDateString('tr-TR') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!customers || customers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Henüz müşteri yok
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
