import * as React from 'react'
import { cn } from '@/lib/utils'

export type SkeletonVariant = 'rect' | 'circle' | 'text' | 'avatar' | 'chart' | 'card' | 'table-row'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant
}

/** Aparência única — sem variação por perfil (§8.5). */
const variantClasses: Record<SkeletonVariant, string> = {
  rect: 'rounded-[var(--mx-card-radius)]',
  circle: 'rounded-[var(--mx-radius-full)]',
  text: 'h-4 rounded-[var(--mx-card-radius)]',
  avatar: 'h-14 w-14 rounded-[var(--mx-radius-full)]',
  chart: 'h-64 w-full rounded-[var(--mx-card-radius)]',
  card: 'h-48 w-full rounded-[var(--mx-card-radius)]',
  'table-row': 'h-16 w-full rounded-[var(--mx-card-radius)]',
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'rect', ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        'border border-border-subtle bg-gray-100 motion-safe:animate-pulse',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
)
Skeleton.displayName = 'Skeleton'

export { Skeleton }
