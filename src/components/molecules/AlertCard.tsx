import * as React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AlertSemantic } from '@/design-system/tokens/colors'

/**
 * AlertCard — componente canônico de alerta MX Performance.
 *
 * Story: docs/stories/story-MX-01-20260527-alert-card.md
 * PRD: §4.6 FR-ALERT-1 (4 tipos) + FR-ALERT-2 (estrutura obrigatória)
 * Fonte: `.docx` §223–§234
 *
 * Cobre os 4 tipos canônicos: critical | warning | positive | consultive.
 * Estrutura obrigatória do PRD: problema, impacto, recomendação, ação rápida.
 */

export interface AlertCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tipo do alerta — define cor, ícone e semântica ARIA */
  type: AlertSemantic
  /** Problema identificado (linha 1, obrigatório) */
  problem: string
  /** Impacto observado (linha 2, obrigatório) */
  impact: string
  /** Recomendação consultiva (linha 3, obrigatório) */
  recommendation: string
  /** Texto da CTA "Ação rápida" (opcional) */
  quickActionLabel?: string
  /** Callback da CTA (opcional — se ausente e label presente, CTA é renderizada como span informativo) */
  onQuickAction?: () => void
}

const typeConfig: Record<
  AlertSemantic,
  {
    Icon: typeof AlertCircle
    iconColor: string
    border: string
    bgSurface: string
    title: string
    ariaRole: 'alert' | 'status'
    ariaLive: 'assertive' | 'polite'
  }
> = {
  critical: {
    Icon: AlertCircle,
    iconColor: 'text-status-error',
    border: 'border-l-status-error',
    bgSurface: 'bg-status-error-surface',
    title: 'Crítico',
    ariaRole: 'alert',
    ariaLive: 'assertive',
  },
  warning: {
    Icon: AlertTriangle,
    iconColor: 'text-status-warning',
    border: 'border-l-status-warning',
    bgSurface: 'bg-status-warning-surface',
    title: 'Atenção',
    ariaRole: 'status',
    ariaLive: 'polite',
  },
  positive: {
    Icon: CheckCircle2,
    iconColor: 'text-status-success',
    border: 'border-l-status-success',
    bgSurface: 'bg-status-success-surface',
    title: 'Positivo',
    ariaRole: 'status',
    ariaLive: 'polite',
  },
  consultive: {
    Icon: Lightbulb,
    iconColor: 'text-alert-consultive',
    border: 'border-l-alert-consultive',
    bgSurface: 'bg-alert-consultive-surface',
    title: 'Consultivo',
    ariaRole: 'status',
    ariaLive: 'polite',
  },
}

export const AlertCard = React.forwardRef<HTMLDivElement, AlertCardProps>(
  ({ type, problem, impact, recommendation, quickActionLabel, onQuickAction, className, ...rest }, ref) => {
    const cfg = typeConfig[type]
    const Icon = cfg.Icon

    return (
      <div
        ref={ref}
        role={cfg.ariaRole}
        aria-live={cfg.ariaLive}
        className={cn(
          'rounded-2xl border border-gray-200 border-l-4 bg-white shadow-sm p-mx-lg transition-shadow hover:shadow-sm',
          cfg.border,
          cfg.bgSurface,
          className
        )}
        {...rest}
      >
        <div className="flex items-start gap-3">
          <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', cfg.iconColor)} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className={cn('text-caption font-bold mb-2', cfg.iconColor)}>{cfg.title}</p>
            <dl className="space-y-1.5 text-sm">
              <div>
                <dt className="sr-only">Problema</dt>
                <dd className="font-semibold text-gray-800">{problem}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-caption font-bold">Impacto</dt>
                <dd className="text-gray-500">{impact}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-caption font-bold">Recomendação</dt>
                <dd className="text-gray-500">{recommendation}</dd>
              </div>
            </dl>
            {quickActionLabel && (
              <div className="mt-3">
                {onQuickAction ? (
                  <button
                    type="button"
                    onClick={onQuickAction}
                    className={cn(
                      'inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl transition-colors',
                      'bg-white border border-gray-200 hover:bg-gray-50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                      type === 'critical' && 'focus-visible:ring-status-error',
                      type === 'warning' && 'focus-visible:ring-status-warning',
                      type === 'positive' && 'focus-visible:ring-status-success',
                      type === 'consultive' && 'focus-visible:ring-alert-consultive'
                    )}
                  >
                    {quickActionLabel} <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <span
                    role="button"
                    aria-disabled="true"
                    tabIndex={-1}
                    className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 text-sm font-bold text-gray-500"
                  >
                    {quickActionLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
)

AlertCard.displayName = 'AlertCard'
