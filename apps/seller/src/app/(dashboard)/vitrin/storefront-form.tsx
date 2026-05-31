'use client'

import { useState, useTransition } from 'react'
import { Button, Card, Input, Label, Badge } from '@novagross/ui'
import { Loader2, Image as ImageIcon, Eye, Save, ExternalLink } from 'lucide-react'
import { saveStorefront, type StorefrontInput } from './actions'

export type StorefrontRow = {
  banner_url: string | null
  banner_link: string | null
  hero_title: string | null
  hero_subtitle: string | null
  about: string | null
  featured_product_ids: string[] | null
  featured_category_ids: string[] | null
  theme_color: string | null
  is_published: boolean
}

export function StorefrontForm({
  initial,
  storeSlug,
  products,
  categories,
  webBaseUrl,
}: {
  initial: StorefrontRow | null
  storeSlug: string
  products: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  webBaseUrl: string
}) {
  const [form, setForm] = useState<StorefrontInput>({
    banner_url: initial?.banner_url ?? '',
    banner_link: initial?.banner_link ?? '',
    hero_title: initial?.hero_title ?? '',
    hero_subtitle: initial?.hero_subtitle ?? '',
    about: initial?.about ?? '',
    featured_product_ids: initial?.featured_product_ids ?? [],
    featured_category_ids: initial?.featured_category_ids ?? [],
    theme_color: initial?.theme_color ?? '#16A34A',
    is_published: initial?.is_published ?? false,
  })

  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [isPending, startTransition] = useTransition()

  const toggleProduct = (id: string) => {
    const list = form.featured_product_ids ?? []
    if (list.includes(id)) {
      setForm({ ...form, featured_product_ids: list.filter((x) => x !== id) })
    } else if (list.length < 10) {
      setForm({ ...form, featured_product_ids: [...list, id] })
    }
  }
  const toggleCategory = (id: string) => {
    const list = form.featured_category_ids ?? []
    if (list.includes(id)) {
      setForm({ ...form, featured_category_ids: list.filter((x) => x !== id) })
    } else if (list.length < 5) {
      setForm({ ...form, featured_category_ids: [...list, id] })
    }
  }

  const onSave = (publish?: boolean) => {
    setError(null)
    const payload =
      publish === undefined ? form : { ...form, is_published: publish }
    startTransition(async () => {
      try {
        await saveStorefront(payload)
        setSavedAt(new Date())
        if (publish !== undefined) setForm({ ...form, is_published: publish })
      } catch (err: any) {
        setError(err?.message ?? 'Kayıt başarısız.')
      }
    })
  }

  const publicUrl = `${webBaseUrl}/magaza/${storeSlug}`

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {form.is_published ? (
            <Badge variant="success">Yayında</Badge>
          ) : (
            <Badge variant="secondary">Taslak</Badge>
          )}
          {savedAt && (
            <span className="text-xs text-gray-500">
              Son kayıt: {savedAt.toLocaleTimeString('tr-TR')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-green-700 hover:underline"
          >
            <Eye className="h-4 w-4" />
            Vitrini görüntüle
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Banner */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-green-600" />
          Vitrin Bannerı
        </h2>
        <div>
          <Label htmlFor="banner_url">Banner Görsel URL</Label>
          <Input
            id="banner_url"
            value={form.banner_url ?? ''}
            onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
            placeholder="https://..."
            disabled={isPending}
          />
          <p className="text-xs text-gray-500 mt-1">
            16:5 oran önerilir (örn. 1600×500px). PNG/JPG/WebP.
          </p>
        </div>
        <div>
          <Label htmlFor="banner_link">Banner Tıklanınca Gidilecek URL (opsiyonel)</Label>
          <Input
            id="banner_link"
            value={form.banner_link ?? ''}
            onChange={(e) => setForm({ ...form, banner_link: e.target.value })}
            placeholder="/kampanyalar/yaz veya https://..."
            disabled={isPending}
          />
        </div>

        {form.banner_url && (
          <div className="border rounded-md overflow-hidden">
            <img
              src={form.banner_url}
              alt="Banner önizleme"
              className="w-full h-auto max-h-60 object-cover"
            />
          </div>
        )}
      </Card>

      {/* Hero text */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Mağaza Tanıtım Metni</h2>
        <div>
          <Label htmlFor="hero_title">Başlık</Label>
          <Input
            id="hero_title"
            value={form.hero_title ?? ''}
            onChange={(e) => setForm({ ...form, hero_title: e.target.value })}
            placeholder="Örn: Hoş geldiniz!"
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="hero_subtitle">Alt başlık</Label>
          <Input
            id="hero_subtitle"
            value={form.hero_subtitle ?? ''}
            onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })}
            placeholder="Kısa tanıtım"
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="about">Mağaza Hakkında</Label>
          <textarea
            id="about"
            value={form.about ?? ''}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
            rows={5}
            placeholder="Mağazanızı detaylı tanıtın..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={isPending}
          />
        </div>
        <div>
          <Label htmlFor="theme_color">Tema Rengi</Label>
          <div className="flex items-center gap-2">
            <input
              id="theme_color"
              type="color"
              value={form.theme_color ?? '#16A34A'}
              onChange={(e) => setForm({ ...form, theme_color: e.target.value })}
              className="h-10 w-16 rounded border border-input cursor-pointer"
              disabled={isPending}
            />
            <Input
              value={form.theme_color ?? ''}
              onChange={(e) => setForm({ ...form, theme_color: e.target.value })}
              placeholder="#16A34A"
              className="font-mono"
              disabled={isPending}
            />
          </div>
        </div>
      </Card>

      {/* Featured products */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          Öne Çıkan Ürünler{' '}
          <span className="text-sm font-normal text-gray-500">
            ({form.featured_product_ids?.length ?? 0} / 10)
          </span>
        </h2>
        <div className="border rounded-md max-h-60 overflow-y-auto p-2 space-y-1">
          {products.length === 0 && (
            <p className="text-sm text-gray-500 p-2">Mağazanızda ürün yok.</p>
          )}
          {products.map((p) => {
            const checked = (form.featured_product_ids ?? []).includes(p.id)
            const disabled =
              !checked && (form.featured_product_ids?.length ?? 0) >= 10
            return (
              <label
                key={p.id}
                className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled || isPending}
                  onChange={() => toggleProduct(p.id)}
                />
                <span>{p.name}</span>
              </label>
            )
          })}
        </div>
      </Card>

      {/* Featured categories */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          Öne Çıkan Kategoriler{' '}
          <span className="text-sm font-normal text-gray-500">
            ({form.featured_category_ids?.length ?? 0} / 5)
          </span>
        </h2>
        <div className="border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
          {categories.map((c) => {
            const checked = (form.featured_category_ids ?? []).includes(c.id)
            const disabled =
              !checked && (form.featured_category_ids?.length ?? 0) >= 5
            return (
              <label
                key={c.id}
                className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled || isPending}
                  onChange={() => toggleCategory(c.id)}
                />
                <span>{c.name}</span>
              </label>
            )
          })}
        </div>
      </Card>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-end sticky bottom-0 bg-white p-3 border-t -mx-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSave(false)}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Taslak olarak kaydet
        </Button>
        <Button
          type="button"
          onClick={() => onSave(true)}
          disabled={isPending}
          style={{ backgroundColor: '#16A34A' }}
          className="text-white"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Yayınla
        </Button>
      </div>
    </form>
  )
}
