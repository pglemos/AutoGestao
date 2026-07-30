import * as React from 'react'
import { cn } from '@/lib/utils'
import { classifyScore, scoreBandTokens, type ScoreBandSemantic } from '@/design-system/tokens/colors'

/**
 * ScoreBandBadge — badge canônico para faixas do MX Score (Elite/Excelente/Bom/Atenção/Crítico).
 *
 * Story: docs/stories/epics/epic-mx-01-design-system-2026-05-27.md (Story 1.6)
 * PRD:   §4.7 FR-SCORE-2 / .docx §244–§249
 *
 * NÃO confundir com `StatusBadge` (genérico para success/warning/error/info).
 * Este é específico para classificação 0–100 do MX Score.
 */

const bandLabels: Record<ScoreBandSemantic, string> = {
  elite: 'Elite',
  excellent: 'Excelente',
  good: 'Bom',
  attention: 'Atenção',
  critical: 'Crítico',
}

const bandRanges: Record<ScoreBandSemantic, string> = {
  elite: '90–100',
  excellent: '80–89',
  good: '70–79',
  attention: '60–69',
  critical: '<60',
}

export interface ScoreBandBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  score?: number
  band?: ScoreBandSemantic
  size?: 'sm' | 'md' | 'lg'
  showRange?: boolean
  showScore?: boolean
}

const sizeClasses: Record<NonNullable<ScoreBandBadgeProps['size']>, string> = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
}

const dotSize: Record<NonNullable<ScoreBandBadgeProps['size']>, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
}

export const ScoreBandBadge = React.forwardRef<HTMLSpanElement, ScoreBandBadgeProps>(
  ({ score, band, size = 'md', showRange = false, showScore = false, className, style, ...rest }, ref) => {
    const resolvedBand: ScoreBandSemantic = band ?? (score !== undefined ? classifyScore(score) : 'critical')
    const color = scoreBandTokens[resolvedBand]()
    const label = bandLabels[resolvedBand]
    const range = bandRanges[resolvedBand]

    const ariaLabel =
      score !== undefined
        ? `MX Score ${Math.round(score)} — faixa ${label}`
        : `MX Score faixa ${label}${showRange ? ` (${range})` : ''}`

    return (
      <span
        ref={ref}
        role="status"
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center rounded-full font-bold border border-gray-200 bg-white',
          sizeClasses[size],
          className
        )}
        style={{ color, ...style }}
        {...rest}
      >
        <span
          className={cn('rounded-full inline-block shrink-0', dotSize[size])}
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <span>
          {showScore && score !== undefined && <span className="mr-1">{Math.round(score)}</span>}
          <span>{label}</span>
          {showRange && <span className="ml-1 font-normal opacity-70">({range})</span>}
        </span>
      </span>
    )
  }
)

ScoreBandBadge.displayName = 'ScoreBandBadge'
