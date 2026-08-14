import type { ReactNode } from 'react'
import { Card } from './Card'
import { Typography } from '../atoms/Typography'

export type StatTone = 'green' | 'red' | 'orange' | 'blue' | 'brand'

// Tons semânticos via opacity sobre tokens base (evita depender de surface tokens ausentes).
const TONE_CHIP: Record<StatTone, string> = {
  green: 'bg-status-success/10 text-status-success',
  red: 'bg-status-error/10 text-status-error',
  orange: 'bg-status-warning/10 text-status-warning',
  blue: 'bg-status-info/10 text-status-info',
  brand: 'bg-brand-primary/10 text-status-success-text',
}

type StatCardProps = {
  icon?: ReactNode
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: StatTone
  /** Ação opcional no canto superior direito (ex.: link "Ver detalhes"). */
  action?: ReactNode
  /** Conteúdo extra opcional abaixo de detail (ex.: mini progresso). */
  children?: ReactNode
}

/**
 * Card de KPI/estatística padrão do sistema: icon-chip tintado + label + valor.
 * Unifica o visual entre telas (vendedor/gerente/admin) — substitui cards bare/flat.
 */
export function StatCard({ icon, label, value, detail, tone = 'brand', action, children }: StatCardProps) {
  return (
    <Card className="border bg-white p-[var(--mx-card-padding)]">
      {(icon || action) && (
        <div className="flex items-start justify-between gap-mx-sm">
          {icon ? (
            <span className={`grid h-mx-12 w-mx-12 shrink-0 place-items-center rounded-[var(--mx-radius-2xl)] ${TONE_CHIP[tone]}`}>
              {icon}
            </span>
          ) : <span />}
          {action}
        </div>
      )}
      <Typography variant="caption" tone="muted" className="mt-mx-md block break-words">
        {label}
      </Typography>
      <Typography variant="h2" className="mt-mx-xs tabular-nums leading-tight">
        {value}
      </Typography>
      {detail && (
        <Typography variant="p" tone="muted" className="mt-mx-xs block">
          {detail}
        </Typography>
      )}
      {children && <div className="mt-mx-md">{children}</div>}
    </Card>
  )
}
