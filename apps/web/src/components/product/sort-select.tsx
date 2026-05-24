'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function SortSelect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sortBy = searchParams.get('sort') || 'newest'

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    const value = e.target.value
    
    if (value === 'newest') {
      params.delete('sort')
    } else {
      params.set('sort', value)
    }

    router.push(`/urunler?${params.toString()}`)
  }

  return (
    <select
      name="sort"
      value={sortBy}
      onChange={handleChange}
      className="px-3 py-2 border rounded-md text-sm bg-background text-foreground"
    >
      <option value="newest">En Yeniler</option>
      <option value="price-asc">Fiyat: Düşükten Yükseğe</option>
      <option value="price-desc">Fiyat: Yüksekten Düşüğe</option>
      <option value="popular">En Popüler</option>
    </select>
  )
}
