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
        {sections.map(section => (
          <Link
            key={section.id}
            href={section.link}
            className="group relative rounded-xl overflow-hidden h-40 md:h-48 flex flex-col justify-end p-4 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: section.bg_color }}
          >
            {section.image_url && (
              <Image
                src={section.image_url}
                alt={section.title}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-300"
              />
            )}
            <div className="relative z-10">
              <p className="text-sm font-bold text-gray-900 leading-tight">{section.title}</p>
              {section.subtitle && (
                <p className="text-xs text-gray-700 mt-0.5 line-clamp-1">{section.subtitle}</p>
              )}
              <span className="text-xs font-medium text-primary mt-1 inline-block">Keşfet →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
