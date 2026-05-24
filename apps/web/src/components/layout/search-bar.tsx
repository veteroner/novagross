'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@novagross/ui'
import { formatPrice } from '@novagross/utils'
import { Search, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SearchResult {
  id: string
  name: string
  slug: string
  price: number
  image_url?: string
}

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const searchProducts = async () => {
      if (query.length < 2) {
        setResults([])
        return
      }

      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          price,
          product_images(url)
        `)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,brand.ilike.%${query}%`)
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .limit(5)

      if (!error && data) {
        setResults(data.map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          image_url: p.product_images?.[0]?.url
        })))
      }
      setLoading(false)
    }

    const debounce = setTimeout(searchProducts, 300)
    return () => clearTimeout(debounce)
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/urunler?q=${encodeURIComponent(query)}`)
      setIsOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Ürün ara..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => query.length >= 2 && setIsOpen(true)}
            className="pl-10 pr-10"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setResults([])
                inputRef.current?.focus()
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </form>

      {/* Search Results Dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((product) => (
                <Link
                  key={product.id}
                  href={`/urun/${product.slug}`}
                  onClick={() => {
                    setIsOpen(false)
                    setQuery('')
                  }}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50"
                >
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center shrink-0">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <span>📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-sm text-primary font-semibold">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </Link>
              ))}
              <div className="border-t mt-2 pt-2 px-4 pb-2">
                <button
                  onClick={handleSubmit}
                  className="text-sm text-primary hover:underline w-full text-left"
                >
                  "{query}" için tüm sonuçları gör →
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>Sonuç bulunamadı</p>
              <p className="text-sm mt-1">Farklı anahtar kelimeler deneyin</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
