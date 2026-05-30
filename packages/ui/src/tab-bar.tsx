'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@novagross/utils'

export type TabItem = {
  /** Unique key used to compare with `value`. */
  key: string
  /** Display label. */
  label: React.ReactNode
  /** Optional counter shown in a pill. */
  count?: number
  /** Optional Lucide-style icon. */
  icon?: React.ComponentType<{ className?: string }>
  /** href for link-based navigation (e.g. server filters via querystring). */
  href?: string
  /** Highlight color (tailwind border class). Default is brand orange. */
  accent?: string
  /** Disabled state. */
  disabled?: boolean
}

export interface TabBarProps {
  items: TabItem[]
  /** Active tab key. */
  value: string
  /** Callback for non-href tabs. Ignored when item has href. */
  onChange?: (key: string) => void
  /** Visual variant. */
  variant?: 'primary' | 'secondary'
  className?: string
}

/**
 * Hepsiburada-style horizontal tab bar with counter pills.
 * Use `href` on items for server-side filters (querystring), otherwise pass `onChange`.
 */
export function TabBar({ items, value, onChange, variant = 'primary', className }: TabBarProps) {
  const isPrimary = variant === 'primary'

  return (
    <div
      className={cn(
        isPrimary ? 'bg-white rounded-lg border' : 'bg-transparent',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-0 overflow-x-auto',
          isPrimary ? 'border-b' : ''
        )}
      >
        {items.map((t) => {
          const active = t.key === value
          const Icon = t.icon
          const accentBorder = t.accent ?? 'border-orange-500'
          const padding = isPrimary ? 'px-5 py-3' : 'px-3 py-2'
          const textSize = isPrimary ? 'text-sm' : 'text-xs'

          const inner = (
            <span
              className={cn(
                'inline-flex items-center gap-2 font-medium border-b-2 transition-colors whitespace-nowrap',
                padding,
                textSize,
                active
                  ? cn('text-gray-900', accentBorder)
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                t.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {t.label}
              {typeof t.count === 'number' ? (
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1.5 rounded-full text-xs font-semibold',
                    active ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {t.count}
                </span>
              ) : null}
            </span>
          )

          if (t.disabled) {
            return (
              <span key={t.key} aria-disabled>
                {inner}
              </span>
            )
          }

          if (t.href) {
            return (
              <Link key={t.key} href={t.href} className="focus:outline-none">
                {inner}
              </Link>
            )
          }

          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange?.(t.key)}
              className="focus:outline-none"
            >
              {inner}
            </button>
          )
        })}
      </div>
    </div>
  )
}
