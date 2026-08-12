import { ChevronLeft, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { TimeGrid } from './TimeGrid'
import { MonthGrid } from './MonthGrid'
import type { AgendaQuickActions, CalendarAgendaItem, CalendarDay, CalendarViewMode } from './types'

export type { CalendarAgendaItem, CalendarDay, CalendarViewMode, AgendaQuickActions } from './types'

export interface AgendaCalendarProps {
  calendarDays: CalendarDay[]
  visitsByDate: Record<string, CalendarAgendaItem[]>
  selectedDate: Date | null
  onDateSelect: (date: Date | null) => void
  onDateClick?: (date: Date) => void
  monthLabel: string
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  getVisitDotColor: (status: string) => string
  viewMode?: CalendarViewMode
  showNavigation?: boolean
  showTodayButton?: boolean
  className?: string
  /** Click on an empty time-grid slot (day/week view only). */
  onSlotClick?: (date: Date, hour: number, minute: number) => void
  /** Drag a card to a new day/time (mouse only, time-grid view only). */
  onReschedule?: (item: CalendarAgendaItem, newStartsAtISO: string) => void
  /** Drag a card's bottom edge to change its duration (mouse only, time-grid view only). */
  onResize?: (item: CalendarAgendaItem, newDurationHours: number) => void
  /** Click on a month-view chip; time-grid cards open their own popover. */
  onEventClick?: (item: CalendarAgendaItem) => void
  /** Quick actions surfaced in the event popover (Editar/Iniciar/Concluir/Cancelar/Excluir). */
  quickActions?: AgendaQuickActions
}

export function AgendaCalendar({
  calendarDays,
  visitsByDate,
  selectedDate,
  onDateSelect,
  onDateClick,
  monthLabel,
  onPrevMonth,
  onNextMonth,
  onToday,
  getVisitDotColor,
  viewMode = 'month',
  showNavigation = true,
  showTodayButton = true,
  className,
  onSlotClick,
  onReschedule,
  onResize,
  onEventClick,
  quickActions = {},
}: AgendaCalendarProps) {
  const isTimeGrid = viewMode === 'day' || viewMode === 'week'

  return (
    <Card className={cn('border border-border shadow-none bg-white overflow-hidden rounded-xl flex flex-col', className)}>
      {showNavigation && (
        <div className="flex items-center justify-between gap-mx-xs p-mx-sm sm:p-mx-md border-b border-border bg-white">
          <button
            type="button"
            onClick={onPrevMonth}
            aria-label={viewMode === 'day' ? 'Dia anterior' : viewMode === 'week' ? 'Semana anterior' : 'Mês anterior'}
            className="flex h-mx-10 w-mx-10 items-center justify-center rounded-mx-full bg-white text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex min-w-0 items-center justify-center gap-mx-xs sm:gap-mx-sm px-mx-xs">
            <Typography variant="h3" className="truncate text-lg font-semibold normal-case tracking-normal sm:text-xl">
              {monthLabel}
            </Typography>
            {showTodayButton && (
              <button
                type="button"
                onClick={onToday}
                className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground"
              >
                Hoje
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onNextMonth}
            aria-label={viewMode === 'day' ? 'Próximo dia' : viewMode === 'week' ? 'Próxima semana' : 'Próximo mês'}
            className="flex h-mx-10 w-mx-10 items-center justify-center rounded-mx-full bg-white text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>
      )}

      <div className="overflow-y-auto lg:flex-1 lg:min-h-0">
        {isTimeGrid ? (
          <TimeGrid
            days={calendarDays}
            visitsByDate={visitsByDate}
            getVisitDotColor={getVisitDotColor}
            selectedDate={selectedDate}
            onDateSelect={(date) => {
              onDateSelect(date)
              onDateClick?.(date)
            }}
            onSlotClick={onSlotClick}
            onReschedule={onReschedule}
            onResize={onResize}
            quickActions={quickActions}
          />
        ) : (
          <MonthGrid
            days={calendarDays}
            visitsByDate={visitsByDate}
            getVisitDotColor={getVisitDotColor}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            onDateClick={onDateClick}
            onEventClick={onEventClick}
          />
        )}
      </div>
    </Card>
  )
}
