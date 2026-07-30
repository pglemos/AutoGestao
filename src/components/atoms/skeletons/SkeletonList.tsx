import { Skeleton } from '@/components/atoms/Skeleton'
import { cn } from '@/lib/utils'

export interface SkeletonListProps {
  items?: number
  className?: string
  showAvatar?: boolean
}

/**
 * SkeletonList — Lista vertical de items (notificações, vendedores, etc).
 */
export function SkeletonList({ items = 5, className, showAvatar = true }: SkeletonListProps) {
  return (
    <div className={cn('w-full space-y-mx-xs', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-mx-sm rounded-2xl border border-gray-200/40 p-mx-sm">
          {showAvatar && <Skeleton variant="avatar" />}
          <div className="flex-1 space-y-mx-xs">
            <Skeleton variant="text" className="h-mx-sm w-3/4" />
            <Skeleton variant="text" className="h-mx-xs w-1/2" />
          </div>
          <Skeleton variant="rect" className="h-mx-10 w-mx-32 hidden sm:block" />
        </div>
      ))}
    </div>
  )
}
