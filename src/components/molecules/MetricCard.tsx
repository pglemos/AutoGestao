import * as React from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/atoms/Spinner'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'

export type TrendDirection = 'up' | 'down' | 'flat'

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  /** Já formatado em pt-BR pelo chamador (§31). */
  value: React.ReactNode
  icon?: React.ReactNode
  hint?: string
  trend?: {
    direction: TrendDirection
    /** Já formatado (ex.: “+12,5%”). */
    label: string
    /**
     * Se uma alta é boa. Queda de perdas é positiva; queda de vendas não —
     * a direção da seta sozinha não decide a cor.
     */
    isPositive?: boolean
  }
  loading?: boolean
}

const trendIcons: Record<TrendDirection, typeof ArrowUpRight> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
}

const trendDescriptions: Record<TrendDirection, string> = {
  up: 'em alta',
  down: 'em queda',
  flat: 'estável',
}

/** Card de métrica. Variação nunca é comunicada só por cor (§43.15). */
const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, label, value, icon, hint, trend, loading = false, ...props }, ref) => {
    const TrendIcon = trend ? trendIcons[trend.direction] : null
    const positive = trend?.isPositive ?? trend?.direction === 'up'

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-[var(--mx-space-2)] rounded-[var(--mx-card-radius)] p-[var(--mx-card-padding)]',
          'border border-[hsl(var(--mx-color-border))] bg-[hsl(var(--mx-color-surface))]',
          'shadow-[var(--mx-card-shadow)] transition-shadow duration-[var(--mx-duration-fast)]',
          'hover:shadow-[var(--mx-card-hover-shadow)]',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-[var(--mx-space-2)]">
          <p className="text-[length:var(--mx-font-size-xs)] font-medium uppercase tracking-wide text-[hsl(var(--mx-color-text-secondary))]">
            {label}
          </p>
          {icon ? (
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--mx-radius-md)] bg-[hsl(var(--mx-color-primary-subtle))] text-[hsl(var(--mx-color-primary))] [&_svg]:h-[16px] [&_svg]:w-[16px]"
            >
              {icon}
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="flex h-[28px] items-center">
            <Spinner size="sm" tone="muted" label={`Carregando ${label}`} />
          </div>
        ) : (
          <p className="text-[length:var(--mx-font-size-metric-lg)] font-bold leading-tight text-[hsl(var(--mx-color-text-primary))]">
            {value}
          </p>
        )}

        {trend && !loading ? (
          <p
            className={cn(
              'inline-flex items-center gap-1 text-[length:var(--mx-font-size-xs)] font-semibold',
              positive
                ? 'text-[hsl(var(--mx-color-success))]'
                : 'text-[hsl(var(--mx-color-danger))]',
            )}
          >
            {TrendIcon ? <TrendIcon aria-hidden className="h-3.5 w-3.5" /> : null}
            {trend.label}
            <VisuallyHidden>
              {` (${trendDescriptions[trend.direction]}, ${positive ? 'resultado positivo' : 'resultado negativo'})`}
            </VisuallyHidden>
          </p>
        ) : null}

        {hint ? (
          <p className="text-[length:var(--mx-font-size-xs)] text-[hsl(var(--mx-color-text-secondary))]">
            {hint}
          </p>
        ) : null}
      </div>
    )
  },
)
MetricCard.displayName = 'MetricCard'

export { MetricCard }
