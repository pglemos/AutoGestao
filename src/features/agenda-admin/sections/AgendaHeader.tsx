import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Popover from '@radix-ui/react-popover'
import {
  Ban, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  Filter, List, Plus, RefreshCw, Users,
} from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { Typography } from '@/components/atoms/Typography'
import { InternalMxTemplateHeader } from '@/components/module/InternalMxTemplateSlots'
import { cn } from '@/lib/utils'
import type { AgendaConsultant, DateFilter } from '@/hooks/agenda'
import { statusFilters } from '../data/agendaFilters'
import { AgendaSearchBar } from '../components/AgendaSearchBar'
import type { AdminCalendarViewMode } from './AgendaFiltersBar'

interface AgendaHeaderProps {
  monthLabel?: string
  onPrevMonth?: () => void
  onNextMonth?: () => void
  onTodayClick?: () => void
  calendarViewMode?: AdminCalendarViewMode
  setCalendarViewMode?: (mode: AdminCalendarViewMode) => void
  dateFilter?: DateFilter
  setDateFilter?: (filter: DateFilter) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  onRefresh?: () => void
  onCreateVisit?: () => void
  onCreateEvent?: () => void
  onCreateBlock?: () => void
  statusFilter?: string
  setStatusFilter?: (status: string) => void
  consultantFilter?: string
  setConsultantFilter?: (consultantId: string) => void
  activeFilters?: number
  clearFilters?: () => void
  consultants?: AgendaConsultant[]
  canViewAllAgendas?: boolean
}

const VIEW_OPTIONS: { key: AdminCalendarViewMode; label: string }[] = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'list', label: 'Lista' },
]

export function AgendaHeader({
  monthLabel = '',
  onPrevMonth = () => {},
  onNextMonth = () => {},
  onTodayClick = () => {},
  calendarViewMode = 'week',
  setCalendarViewMode = () => {},
  dateFilter = 'semana',
  setDateFilter = () => {},
  searchQuery = '',
  onSearchChange = () => {},
  onRefresh = () => {},
  onCreateVisit = () => {},
  onCreateEvent = () => {},
  onCreateBlock = () => {},
  statusFilter = 'todos',
  setStatusFilter = () => {},
  consultantFilter = 'todos',
  setConsultantFilter = () => {},
  activeFilters = 0,
  clearFilters = () => {},
  consultants = [],
  canViewAllAgendas = false,
}: AgendaHeaderProps) {

  const handleViewModeChange = (mode: AdminCalendarViewMode) => {
    setCalendarViewMode(mode)
    if (mode === 'day') setDateFilter('hoje')
    else if (mode === 'week') setDateFilter('semana')
    else if (mode === 'month') setDateFilter('mes')
    else if (mode === 'list') setDateFilter('todos')
  }

  return (
    <InternalMxTemplateHeader className="flex shrink-0 flex-col gap-3 rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevMonth}
              aria-label="Anterior"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={onTodayClick}
              className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-bold text-foreground hover:bg-surface-alt transition-colors"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              aria-label="Próximo"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="min-w-0">
            <p className="text-caption font-semibold uppercase tracking-wide text-status-success-text">Consultoria</p>
            <h1 className="text-lg font-bold text-foreground">Agenda MX</h1>
            <h2 className={cn('text-sm text-muted-foreground capitalize', 'font-semibold')}>
              {monthLabel}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AgendaSearchBar searchQuery={searchQuery} onSearchChange={onSearchChange} />

          <div className="flex rounded-xl border border-border bg-surface-alt/60 p-0.5 shrink-0">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleViewModeChange(option.key)}
                aria-pressed={calendarViewMode === option.key}
                className={cn(
                  'flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all',
                  calendarViewMode === option.key
                    ? 'bg-brand-primary text-white shadow-2xs'
                    : 'text-muted-foreground hover:bg-surface-alt hover:text-foreground',
                )}
              >
                {option.key === 'list' && <List size={13} />}
                {option.label}
              </button>
            ))}
          </div>

          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                type="button"
                aria-label="Filtros"
                className={cn(
                  'relative flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition-colors',
                  activeFilters > 0
                    ? 'border-brand-primary bg-brand-primary/10 text-status-success-text'
                    : 'border-border bg-white text-muted-foreground hover:bg-surface-alt hover:text-foreground',
                )}
              >
                <Filter size={14} />
                <span className="hidden sm:inline">Filtros</span>
                {activeFilters > 0 && (
                  <Badge variant="brand" className="h-4 min-w-4 rounded-full p-0 text-caption items-center justify-center">
                    {activeFilters}
                  </Badge>
                )}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                side="bottom"
                align="end"
                sideOffset={8}
                className="z-[90] w-72 rounded-2xl border border-border bg-white p-4 shadow-xl animate-in fade-in-80"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Filtros
                    </span>
                    {activeFilters > 0 && (
                      <button type="button" onClick={clearFilters} className="text-xs text-status-success-text font-semibold hover:underline">
                        Limpar
                      </button>
                    )}
                  </div>

                  {canViewAllAgendas && (
                    <div>
                      <label htmlFor="agenda-consultant-select" className="block text-xs font-semibold text-muted-foreground mb-1">
                        Consultor
                      </label>
                      <Select
                        id="agenda-consultant-select"
                        value={consultantFilter}
                        onChange={(event) => setConsultantFilter(event.target.value)}
                        className="!h-8 !rounded-xl text-xs"
                      >
                        <option value="todos">Todos os consultores</option>
                        {consultants.map((consultant) => (
                          <option key={consultant.id} value={consultant.id}>{consultant.name}</option>
                        ))}
                      </Select>
                    </div>
                  )}

                  <div>
                    <span className="block text-xs font-semibold text-muted-foreground mb-1">
                      Status
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {statusFilters.map((filter) => (
                        <button
                          key={filter.key}
                          type="button"
                          onClick={() => setStatusFilter(filter.key)}
                          className={cn(
                            'rounded-xl px-2.5 py-1 text-xs font-medium transition-colors',
                            statusFilter === filter.key
                              ? 'bg-brand-primary text-white font-bold'
                              : 'border border-border bg-white text-muted-foreground hover:bg-surface-alt',
                          )}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            aria-label="Atualizar"
            className="h-8 w-8 shrink-0 bg-white"
          >
            <RefreshCw size={14} />
          </Button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button className="h-8 px-3 font-bold text-xs text-white shadow-xs hover:bg-brand-primary/90">
                <Plus size={15} className="mr-1" />
                Criar
                <ChevronDown size={13} className="ml-1 opacity-80" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-[90] w-52 rounded-2xl border border-border bg-white p-1.5 shadow-xl animate-in fade-in-80"
              >
                <DropdownMenu.Item
                  onSelect={onCreateVisit}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-foreground outline-none transition-colors hover:bg-surface-alt"
                >
                  <CalendarDays size={15} className="text-status-success-text" /> Agendar Visita
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={onCreateEvent}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-foreground outline-none transition-colors hover:bg-surface-alt"
                >
                  <Users size={15} className="text-status-info-text" /> Evento / Aula
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border-default" />
                <DropdownMenu.Item
                  onSelect={onCreateBlock}
                  className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-foreground outline-none transition-colors hover:bg-surface-alt text-status-error-text"
                >
                  <Ban size={15} /> Bloquear Agenda
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </InternalMxTemplateHeader>
  )
}
