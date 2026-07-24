import * as React from 'react'
import { useMxSurfaceVisualMode } from '@/components/module/MxSurfaceVisualContext'
import { cn } from '@/lib/utils'

export type SkeletonVariant = 'rect' | 'circle' | 'text' | 'avatar' | 'chart' | 'card' | 'table-row'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant
}

const legacyVariantClasses: Record<SkeletonVariant, string> = {
  rect: 'rounded-mx-xl',
  circle: 'rounded-mx-full',
  text: 'h-4 rounded-sm',
  avatar: 'rounded-mx-full w-mx-14 h-mx-14',
  chart: 'h-mx-64 w-full rounded-mx-2xl',
  card: 'h-mx-48 w-full rounded-mx-2xl',
  'table-row': 'h-mx-14 w-full rounded-mx-xl',
}

const managerVariantClasses: Record<SkeletonVariant, string> = {
  rect: 'rounded-xl',
  circle: 'rounded-full',
  text: 'h-4 rounded-md',
  avatar: 'h-14 w-14 rounded-full',
  chart: 'h-64 w-full rounded-2xl',
  card: 'h-48 w-full rounded-2xl',
  'table-row': 'h-16 w-full rounded-xl',
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'rect', ...props }, ref) => {
    const manager = useMxSurfaceVisualMode() === 'manager'
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn(
          manager
            ? 'border border-gray-100 bg-gray-100 motion-safe:animate-pulse'
            : 'motion-safe:animate-[pulse_1200ms_ease-in-out_infinite] border border-mx-border/60 bg-mx-bg',
          manager ? managerVariantClasses[variant] : legacyVariantClasses[variant],
          className,
        )}
        {...props}
      />
    )
  },
)
Skeleton.displayName = 'Skeleton'

export { Skeleton }
