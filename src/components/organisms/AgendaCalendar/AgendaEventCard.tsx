import { format, parseISO } from 'date-fns'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'
import type { CalendarAgendaItem } from './types'

interface AgendaEventCardProps {
  item: CalendarAgendaItem
  getVisitDotColor: (status: string) => string
  compact?: boolean
  resizable?: boolean
  ghost?: boolean
  onPointerDownBody?: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerDownHandle?: (event: React.PointerEvent<HTMLDivElement>) => void
  onOpen?: (event: React.MouseEvent<HTMLDivElement>) => void
}

export function AgendaEventCard({
  item,
  getVisitDotColor,
  compact = false,
  resizable = false,
  ghost = false,
  onPointerDownBody,
  onPointerDownHandle,
  onOpen,
}: AgendaEventCardProps) {
  const start = parseISO(item.startsAt)
  const dotColor = item.kind === 'event' ? 'bg-status-info' : getVisitDotColor(item.status)

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDownBody}
      onClick={(event) => {
        event.stopPropagation()
        onOpen?.(event)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen?.(event as unknown as React.MouseEvent<HTMLDivElement>)
        }
      }}
      className={cn(
        'group/event relative min-w-0 overflow-hidden rounded-xl border px-2 py-1 text-left shadow-sm transition-shadow outline-none',
        item.kind === 'event'
          ? 'border-status-info/20 bg-status-info-surface text-status-info-text'
          : 'border-brand-primary/20 bg-brand-primary-subtle text-brand-secondary',
        compact ? 'min-h-mx-6' : 'h-full min-h-mx-8',
        !compact && 'cursor-grab hover:z-[var(--mx-z-sticky)] hover:shadow-sm active:cursor-grabbing',
        ghost && 'opacity-60 shadow-sm ring-2 ring-brand-primary/40',
        'focus-visible:ring-2 focus-visible:ring-brand-primary/50',
      )}
    >
      <div className="flex min-w-0 items-center gap-mx-xs">
        <span className={cn('h-mx-tiny w-mx-tiny shrink-0 rounded-mx-full', dotColor)} aria-hidden="true" />
        <span className={cn('min-w-0 truncate font-semibold leading-tight', compact ? 'text-caption' : 'text-xs')}>
          {item.title}
        </span>
      </div>
      {!compact && (
        <div className="mt-0.5 flex min-w-0 items-center gap-1 text-caption leading-none opacity-75">
          <Clock size={10} aria-hidden="true" />
          <span className="truncate">
            {format(start, 'HH:mm')}
            {item.subtitle ? ` · ${item.subtitle}` : ''}
          </span>
        </div>
      )}
      {!compact && resizable && (
        <div
          role="presentation"
          onPointerDown={(event) => {
            event.stopPropagation()
            onPointerDownHandle?.(event)
          }}
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize opacity-0 transition-opacity group-hover/event:opacity-100"
        >
          <div className="mx-auto mt-0.5 h-0.5 w-6 rounded-mx-full bg-current opacity-50" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}

export function AgendaEventCompactChip({
  item,
  getVisitDotColor,
  onOpen,
}: {
  item: CalendarAgendaItem
  getVisitDotColor: (status: string) => string
  onOpen?: (event: React.MouseEvent<HTMLDivElement>) => void
}) {
  const start = parseISO(item.startsAt)
  const dotColor = item.kind === 'event' ? 'bg-status-info' : getVisitDotColor(item.status)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation()
        onOpen?.(event)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen?.(event as unknown as React.MouseEvent<HTMLDivElement>)
        }
      }}
      className="flex min-w-0 items-center gap-1 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-surface-alt"
    >
      <span className={cn('h-mx-tiny w-mx-tiny shrink-0 rounded-mx-full', dotColor)} aria-hidden="true" />
      <Typography variant="tiny" className="shrink-0 text-caption font-semibold tabular-nums">
        {format(start, 'HH:mm')}
      </Typography>
      <Typography variant="tiny" className="min-w-0 flex-1 truncate text-caption font-medium">
        {item.title}
      </Typography>
    </div>
  )
}
