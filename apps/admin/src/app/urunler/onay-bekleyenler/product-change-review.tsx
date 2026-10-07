'use client'

import { useState, useTransition } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@novagross/ui'
import { Check, Loader2, X } from 'lucide-react'
import { approveProductChanges, rejectProductChanges } from './change-actions'

export type PendingChangeProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  brand: string | null
  barcode: string | null
  meta_title: string | null
  meta_description: string | null
  is_digital: boolean | null
  category_id: string | null
  pending_changes: Record<string, any>
  pending_changes_at: string
  store: { store_name: string } | null
  product_images: { id: string; url: string; sort_order: number }[]
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Ürün adı',
  slug: 'URL (slug)',
  description: 'Açıklama',
  category_id: 'Kategori',
  brand: 'Marka',
  barcode: 'Barkod',
  meta_title: 'SEO başlığı',
  meta_description: 'SEO açıklaması',
  is_digital: 'Dijital ürün',
}

function show(field: string, v: any, categories: Record<string, string>) {
  if (v === null || v === undefined || v === '') return <span className="text-gray-400">(boş)</span>
  if (field === 'category_id') return categories[v] ?? v
  if (typeof v === 'boolean') return v ? 'Evet' : 'Hayır'
  return String(v)
}

export function ProductChangeReview({
  products,
  categories,
}: {
  products: PendingChangeProduct[]
  categories: Record<string, string>
}) {
  const [items, setItems] = useState(products)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const act = (id: string, fn: () => Promise<void>) => {
    setBusy(id)
    setError(null)
    startTransition(async () => {
      try {
        await fn()
        setItems((prev) => prev.filter((p) => p.id !== id))
      } catch (e: any) {
        setError(e?.message ?? 'İşlem başarısız')
      } finally {
        setBusy(null)
      }
    })
  }

  if (items.length === 0) return <p className="text-sm text-muted-foreground">Değişiklik onayı bekleyen ürün yok.</p>

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-700">{error}</p>}
      {items.map((p) => {
        const c = p.pending_changes ?? {}
        const fields = Object.keys(FIELD_LABELS).filter((f) => f in c)
        const removeIds: string[] = c.images_remove ?? []
        const adds: { url: string }[] = c.images_add ?? []
        const removed = p.product_images.filter((i) => removeIds.includes(i.id))
        return (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex flex-wrap items-center gap-2">
                {p.name}
                <Badge variant="secondary">{p.store?.store_name}</Badge>
                <span className="text-xs font-normal text-muted-foreground">
                  {new Date(p.pending_changes_at).toLocaleString('tr-TR')} · ürün eski haliyle yayında
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {fields.length > 0 && (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="py-1 w-40">Alan</th>
                      <th className="py-1">Yayındaki</th>
                      <th className="py-1">Önerilen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f) => (
                      <tr key={f} className="border-b align-top">
                        <td className="py-2 font-medium">{FIELD_LABELS[f]}</td>
                        <td className="py-2 pr-4 text-gray-600 whitespace-pre-wrap">{show(f, (p as any)[f], categories)}</td>
                        <td className="py-2 text-orange-800 whitespace-pre-wrap">{show(f, c[f], categories)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {(adds.length > 0 || removed.length > 0) && (
                <div className="grid md:grid-cols-2 gap-4">
                  {removed.length > 0 && (
                    <div>
                      <p className="font-medium mb-2">Kaldırılacak görseller</p>
                      <div className="flex flex-wrap gap-2">
                        {removed.map((i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i.id} src={i.url} alt="" className="h-20 w-20 rounded object-cover ring-2 ring-red-400 opacity-70" />
                        ))}
                      </div>
                    </div>
                  )}
                  {adds.length > 0 && (
                    <div>
                      <p className="font-medium mb-2">Eklenecek görseller</p>
                      <div className="flex flex-wrap gap-2">
                        {adds.map((i, idx) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={idx} src={i.url} alt="" className="h-20 w-20 rounded object-cover ring-2 ring-green-500" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={busy === p.id}
                  onClick={() => act(p.id, () => approveProductChanges(p.id))}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {busy === p.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                  Değişikliği onayla
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === p.id}
                  onClick={() => {
                    const reason = prompt('Red nedeni (satıcıya iletilir):')
                    if (reason && reason.trim()) act(p.id, () => rejectProductChanges(p.id, reason.trim()))
                  }}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X className="h-3 w-3 mr-1" />
                  Reddet
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
