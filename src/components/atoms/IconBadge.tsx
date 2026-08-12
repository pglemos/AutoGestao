import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const iconBadgeVariants = cva(
  'inline-flex items-center justify-center shrink-0 transition-colors',
  {
    variants: {
      variant: {
        emerald: 'bg-status-success-surface text-status-success-text border border-status-success/30',
        emeraldSolid: 'bg-brand-primary text-white shadow-sm',
        emeraldSubtle: 'bg-brand-primary/10 text-status-success-text',
        amber: 'bg-status-warning-surface text-status-warning-text border border-status-warning/30',
        red: 'bg-status-error-surface text-status-error-text border border-status-error/30',
        blue: 'bg-status-info-surface text-status-info-text border border-status-info/30',
        gray: 'bg-gray-100 text-muted-foreground border border-border',
        ghost: 'bg-gray-50 text-muted-foreground border border-border-subtle',
      },
      size: {
        sm: 'w-8 h-8 rounded-xl',
        md: 'w-10 h-10 rounded-2xl',
        lg: 'w-12 h-12 rounded-2xl',
        xl: 'w-14 h-14 rounded-2xl',
      },
    },
    defaultVariants: {
      variant: 'emerald',
      size: 'md',
    },
  },
)

export interface IconBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconBadgeVariants> {
  children: React.ReactNode
}

export const IconBadge = React.forwardRef<HTMLDivElement, IconBadgeProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(iconBadgeVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </div>
    )
  },
)

IconBadge.displayName = 'IconBadge'
