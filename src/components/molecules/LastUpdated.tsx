import { Clock } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'

export interface LastUpdatedProps {
  value?: Date | string | number | null
  label?: string
  className?: string
}

function formatLastUpdated(value?: Date | string | number | null) {
  if (!value) return 'Ainda não atualizado nesta sessão'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Atualização sem horário disponível'
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function LastUpdated({ value, label = 'Última atualização', className }: LastUpdatedProps) {
  return (
    <div className={cn('inline-flex min-w-0 items-center gap-mx-xs rounded-mx-full border border-gray-200 bg-white px-mx-sm py-mx-xs text-muted-foreground shadow-sm', className)}>
      <Clock size={14} aria-hidden="true" className="shrink-0" />
      <Typography variant="tiny" className="truncate normal-case tracking-normal">
        {label}: {formatLastUpdated(value)}
      </Typography>
    </div>
  )
}
