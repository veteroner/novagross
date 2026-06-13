'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Badge = {
  id: string
  title: string
  icon: string
  bg_color: string
  link: string
  sort_order: number
}

export function CampaignBadges() {
  const [badges, setBadges] = useState<Badge[]>([])

  useEffect(() => {
    fetch('/api/campaign-badges')
      .then(r => r.json())
      .then(d => setBadges(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  if (badges.length === 0) return null

  return (
    <div className="border-b bg-background">
      <div className="container">
        <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
          {badges.map(badge => (
            <Link
              key={badge.id}
              href={badge.link}
              className="flex flex-col items-center gap-1.5 min-w-[80px] px-3 py-2 rounded-xl hover:bg-muted transition-colors flex-shrink-0"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl"
                style={{ backgroundColor: badge.bg_color }}
              >
                <i className={`ti ${badge.icon}`} aria-hidden="true" />
              </div>
              <span className="text-xs text-center leading-tight font-medium text-foreground whitespace-nowrap">
                {badge.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
