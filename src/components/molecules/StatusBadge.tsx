import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'

const statusBadgeVariants = cva(
  "inline-flex items-center gap-mx-xs rounded-mx-full border px-3 py-1 transition-colors",
  {
    variants: {
      status: {
        success: "border-status-success/20 bg-status-success-surface",
        warning: "border-status-warning/20 bg-status-warning-surface",
        error: "border-status-error/20 bg-status-error-surface",
        info: "border-status-info/20 bg-status-info-surface",
        neutral: "border-border bg-gray-50",
        pending: "border-status-warning/20 bg-status-warning-surface border-dashed",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  }
)

const dotVariants = cva(
  "size-mx-tiny rounded-mx-full shrink-0",
  {
    variants: {
      status: {
        success: "bg-status-success",
        warning: "bg-status-warning",
        error: "bg-status-error",
        info: "bg-status-info",
        neutral: "bg-text-tertiary",
        pending: "bg-status-warning animate-pulse",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  }
)

const labelVariants = cva(
  "font-bold uppercase tracking-widest",
  {
    variants: {
      status: {
        success: "text-status-success-text",
        warning: "text-status-warning-text",
        error: "text-status-error-text",
        info: "text-status-info-text",
        neutral: "text-muted-foreground",
        pending: "text-status-warning-text",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  label: string
  description?: string
}

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ className, status, label, description, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(statusBadgeVariants({ status }), className)} {...props}>
        <span className={cn(dotVariants({ status }))} aria-hidden="true" />
        <span className={cn(labelVariants({ status }))}>
          <Typography variant="tiny" className="text-inherit tracking-inherit">
            {label}
          </Typography>
        </span>
        {description && (
          <>
            <span className="text-muted-foreground" aria-hidden="true">&middot;</span>
            <Typography variant="tiny" tone="muted">{description}</Typography>
          </>
        )}
      </div>
    )
  }
)
StatusBadge.displayName = "StatusBadge"

export { StatusBadge, statusBadgeVariants }
