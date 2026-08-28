import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'

/** Aparência única — sem variação por perfil (§8.5). */
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-normal transition-colors focus:outline-none focus:ring-2 focus:ring-status-success/20',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand-primary text-white shadow-sm',
        brand: 'border-transparent bg-brand-primary text-white shadow-sm',
        secondary: 'border-border bg-surface-alt text-foreground',
        success: 'border-status-success/20 bg-status-success-surface text-status-success-text',
        warning: 'border-status-warning/20 bg-status-warning-surface text-status-warning-text',
        info: 'border-status-info/20 bg-status-info-surface text-status-info-text',
        danger: 'border-status-error/20 bg-status-error-surface text-status-error-text',
        outline: 'border-border bg-white text-foreground',
        ghost: 'border-transparent bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, children, ...props }, ref) => (
    <div ref={ref} className={cn(badgeVariants({ variant: variant ?? 'default' }), className)} {...props}>
      {typeof children === 'string' ? (
        <Typography variant="caption" className="text-[length:inherit] text-inherit tracking-inherit">
          {children}
        </Typography>
      ) : children}
    </div>
  ),
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
