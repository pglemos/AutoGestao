import { Filter, X } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import type { CalendarViewMode } from '@/components/organisms/AgendaCalendar'

export type AdminCalendarViewMode = CalendarViewMode | 'list'

interface AgendaFiltersBarProps {
  activeFilters: number
  clearFilters: () => void
}

export function AgendaFiltersBar({
  activeFilters,
  clearFilters,
}: AgendaFiltersBarProps) {
  if (activeFilters === 0) return null

  return (
    <div className="flex items-center justify-between py-1 px-1 bg-emerald-600/5 rounded-xl border border-brand-primary/10 my-1">
      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
        <Filter size={13} />
        <span>{activeFilters} filtro{activeFilters > 1 ? 's' : ''} ativo{activeFilters > 1 ? 's' : ''}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={clearFilters}
        className="h-6 text-xs font-semibold hover:bg-emerald-600/10"
      >
        <X size={12} className="mr-1" /> Limpar filtros
      </Button>
    </div>
  )
}
