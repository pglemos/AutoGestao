import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { useMxSurfaceVisualMode } from '@/components/module/MxSurfaceVisualContext'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'

const badgeVariants = cva(
  'inline-flex items-center rounded-mx-md border px-3 py-1 font-semibold tracking-normal transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand-primary text-white shadow-mx-sm hover:opacity-90',
        brand: 'border-transparent bg-brand-primary text-white shadow-mx-md hover:bg-pure-black',
        secondary: 'border-transparent bg-brand-secondary text-white hover:bg-pure-black',
        success: 'border-transparent bg-status-success text-white shadow-mx-sm',
        warning: 'border-transparent bg-status-warning text-white shadow-mx-sm',
        info: 'border-transparent bg-status-info text-white shadow-mx-sm',
        danger: 'border-transparent bg-status-error text-white shadow-mx-sm',
        outline: 'border-border-strong bg-white text-text-primary hover:bg-surface-alt',
        ghost: 'border-transparent text-text-secondary hover:text-text-primary',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

const managerBadgeVariants = {
  default: 'border-transparent bg-emerald-600 text-white shadow-sm',
  brand: 'border-transparent bg-emerald-600 text-white shadow-sm',
  secondary: 'border-gray-200 bg-gray-50 text-gray-700',
  success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
  info: 'border-blue-100 bg-blue-50 text-blue-700',
  danger: 'border-red-100 bg-red-50 text-red-700',
  outline: 'border-gray-200 bg-white text-gray-700',
  ghost: 'border-transparent bg-transparent text-gray-500',
} as const

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, children, ...props }, ref) => {
    const manager = useMxSurfaceVisualMode() === 'manager'
    const resolvedVariant = variant ?? 'default'
    return (
      <div
        ref={ref}
        className={cn(
          manager
            ? 'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-normal transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20'
            : badgeVariants({ variant: resolvedVariant }),
          manager && managerBadgeVariants[resolvedVariant],
          className,
          manager && 'rounded-full font-semibold normal-case tracking-normal shadow-none',
        )}
        {...props}
      >
        {typeof children === 'string' ? (
          <Typography variant="caption" className="text-inherit tracking-inherit">
            {children}
          </Typography>
        ) : children}
      </div>
    )
  },
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
