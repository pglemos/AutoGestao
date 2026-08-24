import { useState } from 'react'
import { Calendar, Users, CheckCircle2, Clock, PlayCircle, XCircle, ChevronDown, ChevronUp, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgendaConsultant } from '@/hooks/agenda'
import { MiniCalendar } from './MiniCalendar'
import { ScrollableRegion } from '@/design-system/page/ScrollableRegion'

type Metrics = {
  total: number
  agendadas: number
  emAndamento: number
  concluidas: number
  canceladas: number
}

interface AgendaSidebarProps {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  hasEventsOnDate?: (date: Date) => boolean
  consultants: AgendaConsultant[]
  consultantFilter: string
  onConsultantChange: (consultantId: string) => void
  statusFilter: string
  onStatusChange: (status: string) => void
  metrics: Metrics
  canViewAllAgendas: boolean
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function AgendaSidebar({
  selectedDate,
  onDateSelect,
  hasEventsOnDate,
  consultants,
  consultantFilter,
  onConsultantChange,
  statusFilter,
  onStatusChange,
  metrics,
  canViewAllAgendas,
  isCollapsed = false,
  onToggleCollapse,
}: AgendaSidebarProps) {
  const [consultantsExpanded, setConsultantsExpanded] = useState(true)

  const statusOptions = [
    { key: 'todos', label: 'Todas', count: metrics.total, color: 'bg-text-tertiary', icon: Calendar },
    { key: 'agendada', label: 'Agendadas', count: metrics.agendadas, color: 'bg-brand-primary', icon: Clock },
    { key: 'em_andamento', label: 'Em Andamento', count: metrics.emAndamento, color: 'bg-status-warning', icon: PlayCircle },
    { key: 'concluida', label: 'Concluídas', count: metrics.concluidas, color: 'bg-status-success', icon: CheckCircle2 },
    { key: 'cancelada', label: 'Canceladas', count: metrics.canceladas, color: 'bg-status-error', icon: XCircle },
  ]

  if (isCollapsed) {
    return (
      <div className="hidden lg:flex flex-col items-center gap-3 w-11 shrink-0 py-1">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expandir painel lateral"
          aria-label="Expandir painel lateral"
          className="flex min-h-[var(--mx-touch-target-min)] min-w-[var(--mx-touch-target-min)] h-11 w-11 items-center justify-center rounded-xl border border-border bg-mxsb-surface text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 shadow-2xs"
        >
          <PanelLeftOpen size={16} aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-full shrink-0 flex-col gap-3 lg:w-56">
      <div className="hidden items-center justify-between px-1 lg:flex">
        <span className="text-caption font-extrabold uppercase tracking-wider text-muted-foreground">
          Painel Lateral
        </span>
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Recolher painel lateral"
            aria-label="Recolher painel lateral"
            className="flex min-h-[var(--mx-touch-target-min)] min-w-[var(--mx-touch-target-min)] h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-success/30"
          >
            <PanelLeftClose size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <MiniCalendar
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        hasEventsOnDate={hasEventsOnDate}
      />

      <div className="rounded-2xl border border-border bg-mxsb-surface p-3 shadow-2xs">
        <h4 className="mb-2 text-caption font-bold uppercase tracking-wider text-muted-foreground">
          Status
        </h4>
        <div className="flex flex-wrap gap-1">
          {statusOptions.map((opt) => {
            const Icon = opt.icon
            const isActive = statusFilter === opt.key

            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onStatusChange(opt.key)}
                aria-pressed={isActive}
                className={cn(
                  'flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-2 text-caption font-medium transition-colors',
                  isActive
                    ? 'bg-brand-primary font-bold text-[hsl(var(--mx-neutral-0))] shadow-2xs'
                    : 'text-muted-foreground hover:bg-surface-alt hover:text-foreground',
                )}
              >
                <Icon
                  size={12}
                  aria-hidden="true"
                  className={isActive ? 'text-[hsl(var(--mx-neutral-0))]' : 'text-muted-foreground'}
                />
                <span>{opt.label}</span>
                <span
                  className={cn(
                    'rounded-full px-1 py-0.5 font-mono text-caption font-semibold',
                    isActive
                      ? 'bg-surface-overlay/20 text-[hsl(var(--mx-neutral-0))]'
                      : 'bg-surface-alt text-muted-foreground',
                  )}
                >
                  {opt.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {canViewAllAgendas && consultants.length > 0 ? (
        <div className="rounded-2xl border border-border bg-mxsb-surface p-3 shadow-2xs">
          <button
            type="button"
            onClick={() => setConsultantsExpanded(!consultantsExpanded)}
            aria-expanded={consultantsExpanded}
            className="mb-2 flex min-h-11 w-full items-center justify-between"
          >
            <h4 className="flex items-center gap-1.5 text-caption font-bold uppercase tracking-wider text-muted-foreground">
              <Users size={12} aria-hidden="true" /> Consultores
            </h4>
            {consultantsExpanded ? (
              <ChevronUp size={14} className="text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronDown size={14} className="text-muted-foreground" aria-hidden="true" />
            )}
          </button>

          {consultantsExpanded ? (
            <ScrollableRegion axis="vertical" label="Filtro de consultores" className="no-scrollbar max-h-40 space-y-1">
              <button
                type="button"
                onClick={() => onConsultantChange('todos')}
                className={cn(
                  'flex min-h-11 w-full items-center rounded-xl px-2 py-2 text-caption font-medium transition-colors',
                  consultantFilter === 'todos'
                    ? 'border border-brand-primary/20 bg-brand-primary/10 font-bold text-status-success-text'
                    : 'text-muted-foreground hover:bg-surface-alt hover:text-foreground',
                )}
              >
                Todos
              </button>

              {consultants.map((c) => {
                const isSelected = consultantFilter === c.id

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onConsultantChange(c.id)}
                    title={c.name}
                    className={cn(
                      'flex min-h-11 w-full items-center gap-1.5 truncate rounded-xl px-2 py-2 text-left text-caption font-medium transition-colors',
                      isSelected
                        ? 'bg-brand-primary font-bold text-[hsl(var(--mx-neutral-0))] shadow-2xs'
                        : 'text-muted-foreground hover:bg-surface-alt hover:text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-caption font-bold',
                        isSelected
                          ? 'bg-[hsl(var(--mx-neutral-0))] text-status-success-text'
                          : 'bg-brand-primary/10 text-status-success-text',
                      )}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{c.name}</span>
                  </button>
                )
              })}
            </ScrollableRegion>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
