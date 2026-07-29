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
    <header className="flex shrink-0 flex-col gap-3 border-b border-border-strong pb-3 bg-white">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onPrevMonth}
              aria-label="Anterior"
              className="flex h-8 w-8 items-center justify-center rounded-mx-lg text-text-secondary hover:bg-surface-alt hover:text-text-primary transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={onTodayClick}
              className="rounded-mx-lg border border-border-strong bg-white px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-surface-alt transition-colors"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              aria-label="Próximo"
              className="flex h-8 w-8 items-center justify-center rounded-mx-lg text-text-secondary hover:bg-surface-alt hover:text-text-primary transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <h1 className={cn('text-lg text-text-primary capitalize', 'font-semibold')}>
            {monthLabel}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AgendaSearchBar searchQuery={searchQuery} onSearchChange={onSearchChange} />

          <div className="flex rounded-mx-lg border border-border-strong bg-surface-alt/60 p-0.5 shrink-0">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleViewModeChange(option.key)}
                aria-pressed={calendarViewMode === option.key}
                className={cn(
                  'flex items-center gap-1 rounded-mx-md px-2.5 py-1.5 text-xs font-bold transition-all',
                  calendarViewMode === option.key
                    ? 'bg-brand-primary text-white shadow-2xs'
                    : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary',
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
                  'relative flex h-8 items-center gap-1.5 rounded-mx-lg border px-2.5 text-xs font-bold transition-colors',
                  activeFilters > 0
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-border-strong bg-white text-text-secondary hover:bg-surface-alt hover:text-text-primary',
                )}
              >
                <Filter size={14} />
                <span className="hidden sm:inline">Filtros</span>
                {activeFilters > 0 && (
                  <Badge variant="brand" className="h-4 min-w-4 rounded-full p-0 text-[10px] items-center justify-center">
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
                className="z-[90] w-72 rounded-mx-xl border border-border-strong bg-white p-4 shadow-xl animate-in fade-in-80"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
                      Filtros
                    </span>
                    {activeFilters > 0 && (
                      <button type="button" onClick={clearFilters} className="text-xs text-brand-primary font-semibold hover:underline">
                        Limpar
                      </button>
                    )}
                  </div>

                  {canViewAllAgendas && (
                    <div>
                      <label htmlFor="agenda-consultant-select" className="block text-xs font-semibold text-text-secondary mb-1">
                        Consultor
                      </label>
                      <Select
                        id="agenda-consultant-select"
                        value={consultantFilter}
                        onChange={(event) => setConsultantFilter(event.target.value)}
                        className="!h-8 !rounded-mx-lg text-xs"
                      >
                        <option value="todos">Todos os consultores</option>
                        {consultants.map((consultant) => (
                          <option key={consultant.id} value={consultant.id}>{consultant.name}</option>
                        ))}
                      </Select>
                    </div>
                  )}

                  <div>
                    <span className="block text-xs font-semibold text-text-secondary mb-1">
                      Status
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {statusFilters.map((filter) => (
                        <button
                          key={filter.key}
                          type="button"
                          onClick={() => setStatusFilter(filter.key)}
                          className={cn(
                            'rounded-mx-md px-2.5 py-1 text-xs font-medium transition-colors',
                            statusFilter === filter.key
                              ? 'bg-brand-primary text-white font-bold'
                              : 'border border-border-strong bg-white text-text-secondary hover:bg-surface-alt',
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
            className="h-8 w-8 shrink-0 rounded-mx-lg bg-white border-border-strong"
          >
            <RefreshCw size={14} />
          </Button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button className="h-8 rounded-mx-lg bg-brand-primary px-3 font-bold text-xs text-white shadow-xs hover:bg-brand-primary/90">
                <Plus size={15} className="mr-1" />
                Criar
                <ChevronDown size={13} className="ml-1 opacity-80" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-[90] w-52 rounded-mx-xl border border-border-strong bg-white p-1.5 shadow-xl animate-in fade-in-80"
              >
                <DropdownMenu.Item
                  onSelect={onCreateVisit}
                  className="flex cursor-pointer items-center gap-2 rounded-mx-lg px-3 py-2 text-xs font-bold text-text-primary outline-none transition-colors hover:bg-surface-alt"
                >
                  <CalendarDays size={15} className="text-brand-primary" /> Agendar Visita
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={onCreateEvent}
                  className="flex cursor-pointer items-center gap-2 rounded-mx-lg px-3 py-2 text-xs font-bold text-text-primary outline-none transition-colors hover:bg-surface-alt"
                >
                  <Users size={15} className="text-status-info" /> Evento / Aula
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border-default" />
                <DropdownMenu.Item
                  onSelect={onCreateBlock}
                  className="flex cursor-pointer items-center gap-2 rounded-mx-lg px-3 py-2 text-xs font-bold text-text-primary outline-none transition-colors hover:bg-surface-alt text-status-error"
                >
                  <Ban size={15} /> Bloquear Agenda
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  )
}
