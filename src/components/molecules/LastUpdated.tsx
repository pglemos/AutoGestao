import { Clock } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'

export interface LastUpdatedProps {
  value?: Date | string | number | null
  label?: string
  emptyLabel?: string
  className?: string
}

function formatLastUpdated(value?: Date | string | number | null, emptyLabel = 'Ainda não atualizado nesta sessão') {
  if (!value) return emptyLabel
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Atualização sem horário disponível'
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function LastUpdated({ value, label = 'Última atualização', emptyLabel, className }: LastUpdatedProps) {
  const message = `${label}: ${formatLastUpdated(value, emptyLabel)}`

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      title={message}
      className={cn('inline-flex min-w-0 items-center gap-mx-xs rounded-mx-full border border-border bg-white px-mx-sm py-mx-xs text-muted-foreground shadow-sm', className)}
    >
      <Clock size={14} aria-hidden="true" className="shrink-0" />
      <Typography variant="tiny" className="min-w-0 whitespace-normal text-left leading-4 normal-case tracking-normal">
        {message}
      </Typography>
    </div>
  )
}
