'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'

interface ProductImage {
  url: string
  alt: string
}

interface ProductImageGalleryProps {
  images: ProductImage[]
}

export function ProductImageGallery({ images }: ProductImageGalleryProps) {
  const safeImages = useMemo(() => images?.filter((img) => Boolean(img?.url)) ?? [], [images])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [hasError, setHasError] = useState(false)

  const activeIndex = safeImages.length === 0 ? 0 : Math.min(selectedIndex, safeImages.length - 1)

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
        {safeImages.length === 0 || hasError ? (
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            📦
          </div>
        ) : (
          <Image
            src={safeImages[activeIndex].url}
            alt={safeImages[activeIndex].alt}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            onError={() => setHasError(true)}
            priority
          />
        )}
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {safeImages.map((image, index) => (
          <button
            key={index}
            onClick={() => {
              setHasError(false)
              setSelectedIndex(index)
            }}
            className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
              selectedIndex === index
                ? 'border-primary'
                : 'border-transparent hover:border-muted-foreground/50'
            }`}
          >
            <Image
              src={image.url}
              alt={image.alt}
              width={80}
              height={80}
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
