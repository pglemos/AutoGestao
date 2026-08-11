import * as React from 'react'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'description'> {
  title: React.ReactNode
  description?: React.ReactNode
  breadcrumb?: React.ReactNode
  actions?: React.ReactNode
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, breadcrumb, actions, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-mx-sm", className)} {...props}>
        {breadcrumb && <div>{breadcrumb}</div>}
        <div className="flex flex-col 2xl:flex-row 2xl:items-start 2xl:justify-between gap-mx-md">
          <div className="space-y-mx-tiny min-w-0 flex-1">
            <Typography variant="h1" className="break-words">{title}</Typography>
            {description && (
              <Typography variant="caption" tone="muted">{description}</Typography>
            )}
          </div>
          {actions && (
            <div className="flex min-w-0 flex-wrap items-center gap-mx-xs w-full 2xl:w-auto 2xl:justify-end">
              {actions}
            </div>
          )}
        </div>
      </div>
    )
  }
)
PageHeader.displayName = "PageHeader"

export { PageHeader }
