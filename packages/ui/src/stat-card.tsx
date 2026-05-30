import * as React from 'react'
import { cn } from '@novagross/utils'

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Top label, e.g. "Toplam Satış". */
  label: React.ReactNode
  /** Big number/string. */
  value: React.ReactNode
  /** Optional smaller line under the value. */
  hint?: React.ReactNode
  /** Lucide-style icon component (passed as a component, not a JSX element). */
  icon?: React.ComponentType<{ className?: string }>
  /** Tailwind text-color class for the icon, e.g. 'text-blue-500'. */
  iconColor?: string
  /** Highlight border (e.g. for "needs attention" stats). */
  emphasis?: 'default' | 'warning' | 'success' | 'danger'
}

const EMPHASIS_CLASS: Record<NonNullable<StatCardProps['emphasis']>, string> = {
  default: '',
  warning: 'border-2 border-orange-200',
  success: 'border-2 border-green-200',
  danger: 'border-2 border-red-200',
}

/**
 * KPI tile used at the top of dashboard-style pages.
 * Renders label / value / hint on the left and an icon on the right.
 */
const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      label,
      value,
      hint,
      icon: Icon,
      iconColor = 'text-gray-400',
      emphasis = 'default',
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border bg-card text-card-foreground shadow-sm p-4',
          EMPHASIS_CLASS[emphasis],
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-2xl font-bold mt-0.5 truncate">{value}</p>
            {hint ? <p className="text-xs text-gray-500 mt-0.5">{hint}</p> : null}
          </div>
          {Icon ? <Icon className={cn('h-7 w-7 shrink-0', iconColor)} /> : null}
        </div>
      </div>
    )
  }
)
StatCard.displayName = 'StatCard'

export { StatCard }
