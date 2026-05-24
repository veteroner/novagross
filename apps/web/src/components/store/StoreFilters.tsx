'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'

export function StoreFilters({
  sort,
  badge,
}: {
  sort?: string
  badge?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSort = sort || searchParams.get('sort') || 'rating'
  const currentBadge = badge || searchParams.get('badge') || 'all'

  const baseParams = useMemo(() => {
    return new URLSearchParams(searchParams.toString())
  }, [searchParams])

  const pushWith = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString()
      router.push(qs ? `/magaza?${qs}` : '/magaza')
    },
    [router]
  )

  const onSortChange = useCallback(
    (value: string) => {
      const next = new URLSearchParams(baseParams)
      next.set('sort', value)
      pushWith(next)
    },
    [baseParams, pushWith]
  )

  const onBadgeChange = useCallback(
    (value: string) => {
      const next = new URLSearchParams(baseParams)
      if (value === 'all') next.delete('badge')
      else next.set('badge', value)
      pushWith(next)
    },
    [baseParams, pushWith]
  )

  return (
    <div className="flex flex-wrap gap-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Sıralama</label>
        <select
          className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={currentSort}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="rating">En Yüksek Puan</option>
          <option value="sales">En Çok Satış</option>
          <option value="newest">En Yeni</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Rozet</label>
        <select
          className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={currentBadge}
          onChange={(e) => onBadgeChange(e.target.value)}
        >
          <option value="all">Tümü</option>
          <option value="platinum">Platinum</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
          <option value="bronze">Bronze</option>
        </select>
      </div>
    </div>
  )
}
