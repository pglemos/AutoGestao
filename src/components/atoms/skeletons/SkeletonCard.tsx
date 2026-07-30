import { Skeleton } from '@/components/atoms/Skeleton'
import { cn } from '@/lib/utils'

export interface SkeletonCardProps {
  className?: string
  showAvatar?: boolean
  lines?: number
}

/**
 * SkeletonCard — Card placeholder (header + body + footer).
 */
export function SkeletonCard({ className, showAvatar = false, lines = 3 }: SkeletonCardProps) {
  return (
    <div className={cn('rounded-2xl border border-gray-200/50 bg-surface-base p-mx-md space-y-mx-sm', className)}>
      <div className="flex items-center gap-mx-sm">
        {showAvatar && <Skeleton variant="avatar" />}
        <div className="flex-1 space-y-mx-xs">
          <Skeleton variant="text" className="h-mx-sm w-2/3" />
          <Skeleton variant="text" className="h-mx-xs w-1/3" />
        </div>
      </div>
      <div className="space-y-mx-xs pt-mx-xs">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} variant="text" className={cn('h-mx-xs', i === lines - 1 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    </div>
  )
}
