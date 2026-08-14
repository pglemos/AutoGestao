import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title' | 'description'> {
  title: React.ReactNode
  description?: React.ReactNode
  breadcrumb?: React.ReactNode
  eyebrow?: React.ReactNode
  meta?: React.ReactNode
  icon?: LucideIcon
  actions?: React.ReactNode
  as?: 'div' | 'header'
  titleVariant?: 'h1' | 'h2' | 'h3' | 'h4'
  descriptionVariant?: 'caption' | 'p'
  titleClassName?: string
  descriptionClassName?: string
}

const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
  ({
    as: Element = 'header',
    className,
    title,
    description,
    breadcrumb,
    eyebrow,
    meta,
    icon: Icon,
    actions,
    titleVariant = 'h1',
    descriptionVariant = 'caption',
    titleClassName,
    descriptionClassName,
    ...props
  }, ref) => {
    const Root: React.ElementType = Element

    return (
      <Root
        ref={ref as React.Ref<HTMLDivElement>}
        data-mx-page-header=""
        className={cn(
          'flex min-h-16 w-full flex-col justify-center gap-3 rounded-[var(--mx-card-radius)] border border-border bg-white px-4 py-4 shadow-[var(--mx-card-shadow)] sm:px-6 lg:flex-row lg:items-center lg:justify-between',
          className,
        )}
        {...props}
      >
        {breadcrumb && <div className="w-full">{breadcrumb}</div>}
        <div className="flex min-w-0 items-center gap-3">
          {Icon && <Icon className="h-5 w-5 shrink-0 text-status-info-text" aria-hidden="true" />}
          <div className="min-w-0 flex-1">
            {eyebrow && <Typography variant="caption" className="mb-1 block font-semibold text-status-success-text">{eyebrow}</Typography>}
            <Typography as="h1" variant={titleVariant} className={cn('break-words', titleClassName)}>{title}</Typography>
            {description && (
              <Typography variant={descriptionVariant} tone="muted" className={descriptionClassName}>{description}</Typography>
            )}
            {meta && <div className="mt-1">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex w-full min-w-0 flex-wrap items-center gap-3 lg:w-auto lg:justify-end">{actions}</div>}
      </Root>
    )
  }
)
PageHeader.displayName = "PageHeader"

export { PageHeader }
