import * as React from 'react'
import { cn } from '@/lib/utils'

export type SkeletonVariant = 'rect' | 'circle' | 'text' | 'avatar' | 'chart' | 'card' | 'table-row'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant
}

/** Aparência única — sem variação por perfil (§8.5). */
const variantClasses: Record<SkeletonVariant, string> = {
  rect: 'rounded-xl',
  circle: 'rounded-full',
  text: 'h-4 rounded-md',
  avatar: 'h-14 w-14 rounded-full',
  chart: 'h-64 w-full rounded-2xl',
  card: 'h-48 w-full rounded-2xl',
  'table-row': 'h-16 w-full rounded-xl',
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'rect', ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        'border border-gray-100 bg-gray-100 motion-safe:animate-pulse',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
)
Skeleton.displayName = 'Skeleton'

export { Skeleton }
