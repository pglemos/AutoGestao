import { cn } from '@/lib/utils'
import type { RoutineNotice } from '../data/types'

type Props = { notice: RoutineNotice | null }

/**
 * Banner de status da rotina (success/warning/error/info) com timestamp.
 */
export function RotinaNoticeBar({ notice }: Props) {
  if (!notice) return null

  return (
    <div
      role="status"
      className={cn(
        'rounded-xl border px-mx-md py-mx-sm text-sm font-bold',
        notice.tone === 'success' &&
          'border-status-success/20 bg-status-success-surface text-status-success',
        notice.tone === 'warning' &&
          'border-status-warning/20 bg-status-warning-surface text-status-warning',
        notice.tone === 'error' &&
          'border-status-error/20 bg-status-error-surface text-status-error',
        notice.tone === 'info' &&
          'border-status-info/20 bg-status-info-surface text-status-info',
      )}
    >
      <div className="flex flex-col gap-mx-tiny sm:flex-row sm:items-center sm:justify-between">
        <span>{notice.message}</span>
        <span className="text-mx-tiny font-bold uppercase opacity-70">
          {notice.at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {notice.detail && <p className="mt-mx-tiny text-xs opacity-80">{notice.detail}</p>}
    </div>
  )
}

export default RotinaNoticeBar
