import * as React from 'react'
import { cn } from '@novagross/utils'

export interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Main heading text shown as <h1>. */
  title: React.ReactNode
  /** Optional supporting copy below the title. */
  description?: React.ReactNode
  /** Optional right-aligned actions (buttons, links, badges). */
  actions?: React.ReactNode
}

/**
 * Top-of-page heading used by every admin/seller page.
 * Renders a consistent title + description on the left and action slot on the right.
 */
const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, actions, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-wrap items-start justify-between gap-4',
          className
        )}
        {...props}
      >
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description ? (
            <p className="text-gray-600 mt-1">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        ) : null}
      </div>
    )
  }
)
PageHeader.displayName = 'PageHeader'

export { PageHeader }
