import { useState } from 'react'
import { Calendar, Users, CheckCircle2, Clock, PlayCircle, XCircle, ChevronDown, ChevronUp, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgendaConsultant } from '@/hooks/agenda'
import { MiniCalendar } from './MiniCalendar'

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
    { key: 'agendada', label: 'Agendadas', count: metrics.agendadas, color: 'bg-emerald-600', icon: Clock },
    { key: 'em_andamento', label: 'Em Andamento', count: metrics.emAndamento, color: 'bg-status-warning', icon: PlayCircle },
    { key: 'concluida', label: 'Concluídas', count: metrics.concluidas, color: 'bg-status-success', icon: CheckCircle2 },
    { key: 'cancelada', label: 'Canceladas', count: metrics.canceladas, color: 'bg-status-error', icon: XCircle },
  ]

  if (isCollapsed) {
    return (
      <div className="hidden lg:flex flex-col items-center gap-3 w-10 shrink-0 py-1">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expandir painel lateral"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-2xs"
        >
          <PanelLeftOpen size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 w-full lg:w-56 shrink-0 transition-all">
      {/* Toggle Collapse Bar */}
      <div className="hidden lg:flex items-center justify-between px-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
          Painel Lateral
        </span>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Recolher painel lateral"
            className="flex h-6 w-6 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      {/* Interactive Mini Calendar */}
      <MiniCalendar
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        hasEventsOnDate={hasEventsOnDate}
      />

      {/* Status Filters - Compact */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-2xs">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
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
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-2 py-1 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                )}
              >
                <Icon size={12} className={isActive ? 'text-white' : 'text-gray-500'} />
                <span>{opt.label}</span>
                <span
                  className={cn(
                    'px-1 py-0.5 rounded-full text-[9px] font-mono font-semibold',
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-50 text-gray-500',
                  )}
                >
                  {opt.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Consultant Filter - Collapsible */}
      {canViewAllAgendas && consultants.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-2xs">
          <button
            type="button"
            onClick={() => setConsultantsExpanded(!consultantsExpanded)}
            className="flex w-full items-center justify-between mb-2"
          >
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Users size={12} /> Consultores
            </h4>
            {consultantsExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
          </button>

          {consultantsExpanded && (
            <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar">
              <button
                type="button"
                onClick={() => onConsultantChange('todos')}
                className={cn(
                  'flex w-full items-center px-2 py-1.5 rounded-xl text-[11px] font-medium transition-colors',
                  consultantFilter === 'todos'
                    ? 'bg-emerald-600/10 text-emerald-600 font-bold border border-brand-primary/20'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
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
                    className={cn(
                      'flex w-full items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-medium transition-colors text-left truncate',
                      isSelected
                        ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                        isSelected ? 'bg-white text-emerald-600' : 'bg-emerald-600/10 text-emerald-600',
                      )}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{c.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
