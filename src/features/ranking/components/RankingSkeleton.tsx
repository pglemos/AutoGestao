import { Skeleton } from '@/components/atoms/Skeleton'
import { SkeletonStats, SkeletonList } from '@/components/atoms/skeletons'

type Props = {
  ariaLabel: string
  variant?: 'global' | 'store'
}

/**
 * Loading skeleton compartilhado para Ranking Global e por Loja.
 * Preserva markup original (Story 3.14 já padronizou skeletons).
 */
export function RankingSkeleton({ ariaLabel, variant = 'global' }: Props) {
  return (
    <main
      className="w-full h-full flex flex-col gap-mx-lg p-mx-md md:p-mx-lg bg-gray-50 animate-in fade-in duration-500"
      aria-busy="true"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-mx-lg border-b border-gray-200 pb-10">
        <div className="space-y-mx-xs">
          <Skeleton className="h-mx-10 w-mx-64" />
          <Skeleton className="h-mx-xs w-mx-48" />
        </div>
        {variant === 'global' ? (
          <div className="flex gap-mx-sm">
            <Skeleton className="h-mx-14 w-mx-14 rounded-2xl" />
            <Skeleton className="h-mx-14 w-mx-48 rounded-2xl" />
          </div>
        ) : (
          <Skeleton className="h-mx-14 w-mx-48 rounded-2xl" />
        )}
      </header>
      <SkeletonStats count={4} />
      <SkeletonList items={variant === 'global' ? 6 : 5} showAvatar />
    </main>
  )
}

export default RankingSkeleton
