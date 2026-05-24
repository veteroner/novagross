'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@novagross/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { HeroBanner } from '@/components/home/hero-banner'

type BannerLinkType = 'product' | 'category' | 'page' | 'external'

type Banner = {
  id: string
  title: string
  description: string | null
  image_url: string
  link_type: BannerLinkType
  link_value: string
  button_text: string
  sort_order: number
}

function resolveHref(banner: Banner): string {
  switch (banner.link_type) {
    case 'product':
      return `/urun/${banner.link_value}`
    case 'category':
      return `/kategori/${banner.link_value}`
    case 'external':
      return banner.link_value
    case 'page':
    default:
      return banner.link_value.startsWith('/') ? banner.link_value : `/${banner.link_value}`
  }
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href)
}

export function DynamicBanner() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchBanners() {
      try {
        const response = await fetch('/api/banners', { cache: 'no-store' })
        const data = (await response.json()) as Banner[]
        if (!cancelled) {
          setBanners(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error('Banner yüklenemedi:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchBanners()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (banners.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, 7000)

    return () => clearInterval(interval)
  }, [banners.length])

  const currentBanner = useMemo(() => {
    if (banners.length === 0) return null
    const safeIndex = Math.min(Math.max(currentIndex, 0), banners.length - 1)
    return banners[safeIndex]
  }, [banners, currentIndex])

  if (loading) {
    return (
      <section className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container py-20">
          <div className="h-[220px] md:h-[280px] animate-pulse rounded-xl bg-white/10" />
        </div>
      </section>
    )
  }

  if (!currentBanner) {
    return <HeroBanner />
  }

  const href = resolveHref(currentBanner)
  const external = isExternalHref(href)

  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
  const goNext = () => setCurrentIndex((prev) => (prev + 1) % banners.length)

  return (
    <section className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      <div className="relative h-[380px] md:h-[520px]">
        <Image
          src={currentBanner.image_url}
          alt={currentBanner.title}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />

        <div className="container relative h-full flex items-center">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{currentBanner.title}</h1>
            {currentBanner.description ? (
              <p className="text-lg md:text-xl opacity-90 mb-8">{currentBanner.description}</p>
            ) : null}

            <Button asChild size="lg" variant="secondary">
              <Link
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
              >
                {currentBanner.button_text || 'İncele'}
              </Link>
            </Button>
          </div>
        </div>

        {banners.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 rounded-full p-2 transition-colors"
              aria-label="Önceki banner"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 rounded-full p-2 transition-colors"
              aria-label="Sonraki banner"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {banners.map((b, idx) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${
                    idx === currentIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/70'
                  }`}
                  aria-label={`Banner ${idx + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
