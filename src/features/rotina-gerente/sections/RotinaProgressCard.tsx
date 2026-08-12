import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'
import type { RoutineProgress } from '../data/types'

type Props = { routineProgress: RoutineProgress }

/**
 * Card de "Progresso da rotina" — barra percentual + chips das 3 etapas.
 */
export function RotinaProgressCard({ routineProgress }: Props) {
  return (
    <Card className="border bg-white p-mx-md">
      <div className="flex flex-col gap-mx-md lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Typography variant="h3" className="tracking-tight">
            Progresso da rotina
          </Typography>
          <Typography variant="p" tone="muted" className="mt-mx-tiny text-sm">
            {routineProgress.doneCount}/{routineProgress.total} etapas concluídas antes do
            Matinal.
          </Typography>
        </div>
        <div className="flex min-w-mx-48 items-center gap-mx-sm">
          <div className="h-mx-xs flex-1 overflow-hidden rounded-mx-full bg-gray-50">
            <div
              className="h-full rounded-mx-full bg-emerald-600 transition-all"
              style={{ width: `${routineProgress.percent}%` }}
            />
          </div>
          <Typography variant="h3" className="tabular-nums">
            {routineProgress.percent}%
          </Typography>
        </div>
      </div>
      <div className="mt-mx-md grid grid-cols-1 gap-mx-xs sm:grid-cols-3">
        {routineProgress.steps.map((step) => (
          <div
            key={step.label}
            className={cn(
              'rounded-xl border px-mx-md py-mx-sm text-sm font-bold uppercase',
              step.done
                ? 'border-status-success/20 bg-status-success-surface text-status-success'
                : 'border-border-subtle bg-gray-50 text-muted-foreground',
            )}
          >
            {step.label}
          </div>
        ))}
      </div>
    </Card>
  )
}

export default RotinaProgressCard
