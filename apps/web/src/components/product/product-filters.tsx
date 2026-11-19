'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@novagross/ui'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Category {
  name: string
  slug: string
  count: number
}

interface ProductFiltersProps {
  categories?: Category[]
}

const priceRanges = [
  { label: '0 - 500 ₺', min: 0, max: 500 },
  { label: '500 - 1.000 ₺', min: 500, max: 1000 },
  { label: '1.000 - 5.000 ₺', min: 1000, max: 5000 },
  { label: '5.000 - 10.000 ₺', min: 5000, max: 10000 },
  { label: '10.000 ₺ ve üzeri', min: 10000, max: null },
]

export function ProductFilters({ categories = [] }: ProductFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [expandedSections, setExpandedSections] = useState<string[]>(['categories', 'price', 'brands'])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [customMin, setCustomMin] = useState('')
  const [customMax, setCustomMax] = useState('')
  const [priceError, setPriceError] = useState('')
  const inStock = searchParams.get('in_stock') === 'true'
  const [brandsLoading, setBrandsLoading] = useState(true)

  // Initialize from URL params
  useEffect(() => {
    const category = searchParams.get('category')
    setSelectedCategories(category ? [category] : [])
    const min = searchParams.get('min_price') || ''
    const max = searchParams.get('max_price') || ''
    setCustomMin(min); setCustomMax(max)
    const range = priceRanges.find(r => String(r.min) === min && (r.max == null ? !max : String(r.max) === max))
    setSelectedPriceRange(range?.label || null)
    setSelectedBrands(searchParams.getAll('brand'))
  }, [searchParams])

  useEffect(() => {
    let cancelled = false

    async function fetchBrands() {
      try {
        const response = await fetch('/api/brands')
        if (!response.ok) return
        const data = (await response.json()) as unknown
        if (!cancelled) {
          setAvailableBrands(Array.isArray(data) ? (data as string[]).filter((b) => typeof b === 'string') : [])
        }
      } catch (error) {
        console.error('Failed to fetch brands:', error)
      } finally {
        if (!cancelled) setBrandsLoading(false)
      }
    }

    fetchBrands()

    return () => {
      cancelled = true
    }
  }, [])

  const updateURL = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    params.delete('page')
    router.push(`/urunler?${params.toString()}`)
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    )
  }

  const toggleCategory = (slug: string) => {
    const newCategories = selectedCategories.includes(slug)
      ? selectedCategories.filter((s) => s !== slug)
      : [slug] // Only one category at a time for simplicity

    setSelectedCategories(newCategories)
    updateURL({
      category: newCategories.length > 0 ? newCategories[0] : null,
    })
  }

  const toggleBrand = (brand: string) => {
    const brands = selectedBrands.includes(brand) ? selectedBrands.filter(b => b !== brand) : [...selectedBrands, brand]
    setSelectedBrands(brands)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('brand'); params.delete('page')
    brands.forEach(b => params.append('brand', b))
    router.push(`/urunler?${params.toString()}`)
  }

  const handlePriceRangeChange = (rangeLabel: string) => {
    const range = priceRanges.find((r) => r.label === rangeLabel)
    if (!range) return

    setSelectedPriceRange(rangeLabel)
    updateURL({
      min_price: range.min.toString(),
      max_price: range.max?.toString() || null,
    })
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setSelectedPriceRange(null)
    setSelectedBrands([])
    router.push('/urunler')
  }

  const hasFilters = selectedCategories.length > 0 || selectedPriceRange || selectedBrands.length > 0 || inStock || customMin || customMax

  return (
    <div>
      <Button variant="outline" className="w-full lg:hidden mb-3" aria-expanded={mobileOpen} aria-controls="catalog-filters" onClick={() => setMobileOpen(!mobileOpen)}>Filtreler {hasFilters ? "(aktif)" : ""} {mobileOpen ? "−" : "+"}</Button>
      <div id="catalog-filters" className={`${mobileOpen ? "block" : "hidden"} lg:block space-y-4`}>
      {/* Clear Filters */}
      {hasFilters && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          Filtreleri Temizle
        </Button>
      )}

      {/* Categories */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('categories')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Kategoriler</CardTitle>
            {expandedSections.includes('categories') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CardHeader>
        {expandedSections.includes('categories') && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              {categories.map((category) => (
                <label
                  key={category.slug}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.slug)}
                      onChange={() => toggleCategory(category.slug)}
                      className="rounded"
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ({category.count})
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Price Range */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('price')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Fiyat Aralığı</CardTitle>
            {expandedSections.includes('price') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CardHeader>
        {expandedSections.includes('price') && (
          <CardContent className="pt-0">
            <form className="mb-4 space-y-2" onSubmit={e => {
              e.preventDefault()
              const min = customMin === '' ? null : Number(customMin), max = customMax === '' ? null : Number(customMax)
              if ((min !== null && (!Number.isFinite(min) || min < 0)) || (max !== null && (!Number.isFinite(max) || max < 0)) || (min !== null && max !== null && min > max)) { setPriceError('Geçerli bir fiyat aralığı girin.'); return }
              setPriceError(''); updateURL({ min_price: min === null ? null : String(min), max_price: max === null ? null : String(max) })
            }}>
              <div className="flex gap-2"><input aria-label="En düşük fiyat" type="number" min="0" step="0.01" value={customMin} onChange={e => setCustomMin(e.target.value)} className="w-1/2 min-w-0 rounded border p-2 text-sm" placeholder="En az ₺"/><input aria-label="En yüksek fiyat" type="number" min="0" step="0.01" value={customMax} onChange={e => setCustomMax(e.target.value)} className="w-1/2 min-w-0 rounded border p-2 text-sm" placeholder="En çok ₺"/></div>
              {priceError && <p role="alert" className="text-xs text-destructive">{priceError}</p>}
              <Button type="submit" size="sm" variant="outline" className="w-full">Fiyatı Uygula</Button>
            </form>
            <div className="space-y-2">
              {priceRanges.map((range) => (
                <label
                  key={range.label}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="priceRange"
                    checked={selectedPriceRange === range.label}
                    onChange={() => handlePriceRangeChange(range.label)}
                    className="rounded"
                  />
                  <span className="text-sm">{range.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Brands */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection('brands')}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Markalar</CardTitle>
            {expandedSections.includes('brands') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CardHeader>
        {expandedSections.includes('brands') && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              {brandsLoading ? (
                <div className="text-sm text-muted-foreground">Yükleniyor…</div>
              ) : availableBrands.length === 0 ? (
                <div className="text-sm text-muted-foreground">Henüz marka yok.</div>
              ) : (
                availableBrands.map((brand) => (
                  <label
                    key={brand}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => toggleBrand(brand)}
                      className="rounded"
                    />
                    <span className="text-sm">{brand}</span>
                  </label>
                ))
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Stock Filter */}
      <Card>
        <CardContent className="pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={inStock} onChange={e => updateURL({ in_stock: e.target.checked ? "true" : null })} className="rounded" />
            <span className="text-sm">Sadece stokta olanlar</span>
          </label>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
