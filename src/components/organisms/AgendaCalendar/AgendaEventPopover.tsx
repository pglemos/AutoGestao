import type { ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Ban, CheckCircle2, PlayCircle, Trash2, X } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'
import { safeDurationHours } from './layout'
import type { AgendaQuickActions, CalendarAgendaItem } from './types'

interface AgendaEventPopoverProps {
  item: CalendarAgendaItem
  getVisitDotColor: (status: string) => string
  children: ReactNode
  quickActions: AgendaQuickActions
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AgendaEventPopover({
  item,
  getVisitDotColor,
  children,
  quickActions,
  open,
  onOpenChange,
}: AgendaEventPopoverProps) {
  const start = parseISO(item.startsAt)
  const end = new Date(start.getTime() + safeDurationHours(item.durationHours) * 3_600_000)
  const dotColor = item.kind === 'event' ? 'bg-status-info' : getVisitDotColor(item.status)
  const isVisit = item.kind === 'visit'

  const runAndClose = (action?: (item: CalendarAgendaItem) => void) => {
    action?.(item)
    onOpenChange(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-[90] w-72 rounded-xl border border-border bg-white p-mx-md shadow-sm outline-none"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex items-start justify-between gap-mx-sm">
            <div className="flex min-w-0 items-center gap-mx-xs">
              <span className={cn('h-mx-sm w-mx-sm shrink-0 rounded-mx-full', dotColor)} aria-hidden="true" />
              <Typography variant="caption" className="min-w-0 truncate font-bold">{item.title}</Typography>
            </div>
            <Popover.Close asChild>
              <button type="button" aria-label="Fechar" className="shrink-0 rounded-xl p-1 text-muted-foreground transition-colors hover:bg-gray-50 hover:text-foreground">
                <X size={14} />
              </button>
            </Popover.Close>
          </div>

          <Typography variant="tiny" tone="muted" className="mt-1 block">
            {format(start, "EEEE, dd 'de' MMMM", { locale: ptBR })} · {format(start, 'HH:mm')}–{format(end, 'HH:mm')}
          </Typography>
          {item.subtitle && (
            <Typography variant="tiny" tone="muted" className="mt-0.5 block">{item.subtitle}</Typography>
          )}

          <div className="mt-mx-sm flex flex-wrap gap-mx-xs border-t border-border pt-mx-sm">
            <Button size="xs" variant="outline" onClick={() => runAndClose(quickActions.onEdit)}>
              Editar
            </Button>
            {isVisit && item.status === 'agendada' && (
              <Button size="xs" variant="info" onClick={() => { quickActions.onStatusChange?.(item, 'em_andamento'); onOpenChange(false) }}>
                <PlayCircle size={12} className="mr-1" /> Iniciar
              </Button>
            )}
            {isVisit && item.status === 'em_andamento' && (
              <Button size="xs" variant="success" onClick={() => { quickActions.onStatusChange?.(item, 'concluida'); onOpenChange(false) }}>
                <CheckCircle2 size={12} className="mr-1" /> Concluir
              </Button>
            )}
            {isVisit && item.status !== 'concluida' && item.status !== 'cancelada' && (
              <Button size="xs" variant="outline" onClick={() => { quickActions.onStatusChange?.(item, 'cancelada'); onOpenChange(false) }}>
                <Ban size={12} className="mr-1" /> Cancelar
              </Button>
            )}
            <Button size="xs" variant="danger" onClick={() => runAndClose(quickActions.onDelete)} className="ml-auto">
              <Trash2 size={12} className="mr-1" /> Excluir
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
