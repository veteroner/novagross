import * as React from 'react'
import { cn } from '@novagross/utils'

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Lucide-style icon component (passed as a component, not a JSX element). */
  icon?: React.ComponentType<{ className?: string }>
  /** Heading line, e.g. "Henüz yorum yok". */
  title: React.ReactNode
  /** Optional explanatory copy below the title. */
  description?: React.ReactNode
  /** Optional CTA(s) — typically a Button. */
  action?: React.ReactNode
  /** Compact variant for use inside small cards/tables. */
  compact?: boolean
}

/**
 * Empty / zero-state visual. Use anywhere a list, table, or card has no rows
 * to keep all "nothing here" screens visually consistent.
 */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    { className, icon: Icon, title, description, action, compact = false, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center',
          compact ? 'py-8' : 'py-16',
          className
        )}
        {...props}
      >
        {Icon ? (
          <div
            className={cn(
              'inline-flex items-center justify-center rounded-full bg-gray-100 mb-4',
              compact ? 'w-10 h-10' : 'w-16 h-16'
            )}
          >
            <Icon
              className={cn(
                'text-gray-400',
                compact ? 'h-5 w-5' : 'h-8 w-8'
              )}
            />
          </div>
        ) : null}
        <h3
          className={cn(
            'font-semibold text-gray-900',
            compact ? 'text-base' : 'text-lg'
          )}
        >
          {title}
        </h3>
        {description ? (
          <p className="text-gray-600 mt-1 max-w-md mx-auto text-sm">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    )
  }
)
EmptyState.displayName = 'EmptyState'

export { EmptyState }
