import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'

/** Aparência única — sem variação por perfil (§8.5). */
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-normal transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-emerald-600 text-white shadow-sm',
        brand: 'border-transparent bg-emerald-600 text-white shadow-sm',
        secondary: 'border-gray-200 bg-gray-50 text-foreground',
        success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
        warning: 'border-amber-100 bg-amber-50 text-amber-700',
        info: 'border-blue-100 bg-blue-50 text-blue-700',
        danger: 'border-red-100 bg-red-50 text-red-700',
        outline: 'border-gray-200 bg-white text-foreground',
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
        <Typography variant="caption" className="text-inherit tracking-inherit">
          {children}
        </Typography>
      ) : children}
    </div>
  ),
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
