'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type PromoSection = {
  id: string
  title: string
  subtitle: string | null
  image_url: string | null
  bg_color: string
  link: string
  position: number
}

export function PromoGrid() {
  const [sections, setSections] = useState<PromoSection[]>([])

  useEffect(() => {
    fetch('/api/promo-sections')
      .then(r => r.json())
      .then(d => setSections(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  if (sections.length === 0) return null

  return (
    <section className="container">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sections.map(section => {
          const hasImage = Boolean(section.image_url)
          return (
            <Link
              key={section.id}
              href={section.link}
              className="group relative rounded-xl overflow-hidden h-40 md:h-48 flex flex-col justify-end p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              style={{ backgroundColor: section.bg_color }}
            >
              {hasImage && (
                <>
                  <Image
                    src={section.image_url!}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Yazının her fotoğrafta okunması için alttan koyulaşan katman */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent"
                  />
                </>
              )}
              <div className="relative z-10">
                <p
                  className={`text-sm md:text-base font-bold leading-tight ${
                    hasImage ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]' : 'text-gray-900'
                  }`}
                >
                  {section.title}
                </p>
                {section.subtitle && (
                  <p
                    className={`text-xs mt-0.5 line-clamp-1 ${
                      hasImage ? 'text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]' : 'text-gray-700'
                    }`}
                  >
                    {section.subtitle}
                  </p>
                )}
                <span
                  className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                    hasImage ? 'bg-white text-gray-900' : 'bg-primary text-primary-foreground'
                  }`}
                >
                  Keşfet →
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
