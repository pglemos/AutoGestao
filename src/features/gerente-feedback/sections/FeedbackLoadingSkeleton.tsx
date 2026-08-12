import { Skeleton } from '@/components/atoms/Skeleton'
import { PageCanvas } from '@/design-system/page'

type Props = {
  ariaLabel?: string
  errorMessage?: string | null
}

export function FeedbackLoadingSkeleton({
  ariaLabel = 'Carregando devolutivas',
  errorMessage = null,
}: Props) {
  return (
    <PageCanvas
      as="div"
      width="dashboard"
      bottomClearance="navigation"
      className="flex min-h-0 flex-1 flex-col space-y-6"
      aria-busy="true"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border pb-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-2 w-48" />
        </div>
      </header>
      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-status-error/20 bg-status-error-surface px-4 py-3 text-sm font-bold text-status-error"
        >
          {errorMessage}
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </PageCanvas>
  )
}

export default FeedbackLoadingSkeleton
