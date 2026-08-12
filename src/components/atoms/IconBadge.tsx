import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const iconBadgeVariants = cva(
  'inline-flex items-center justify-center shrink-0 transition-colors',
  {
    variants: {
      variant: {
        emerald: 'bg-emerald-100 text-emerald-600 border border-emerald-200',
        emeraldSolid: 'bg-emerald-600 text-white shadow-sm',
        emeraldSubtle: 'bg-emerald-600/10 text-emerald-600',
        amber: 'bg-amber-100 text-amber-600 border border-amber-200',
        red: 'bg-red-100 text-red-600 border border-red-200',
        blue: 'bg-blue-100 text-blue-600 border border-blue-200',
        gray: 'bg-gray-100 text-muted-foreground border border-gray-200',
        ghost: 'bg-gray-50 text-muted-foreground border border-gray-100',
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
