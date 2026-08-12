import { addDays, format, isSameDay, isToday, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'
import { AgendaEventCompactChip } from './AgendaEventCard'
import type { CalendarAgendaItem, CalendarDay } from './types'

const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 })
const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, index) =>
  format(addDays(weekStart, index), 'EEE', { locale: ptBR }).toUpperCase(),
)

interface MonthGridProps {
  days: CalendarDay[]
  visitsByDate: Record<string, CalendarAgendaItem[]>
  getVisitDotColor: (status: string) => string
  selectedDate: Date | null
  onDateSelect: (date: Date | null) => void
  onDateClick?: (date: Date) => void
  onEventClick?: (item: CalendarAgendaItem) => void
}

export function MonthGrid({
  days,
  visitsByDate,
  getVisitDotColor,
  selectedDate,
  onDateSelect,
  onDateClick,
  onEventClick,
}: MonthGridProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-2xs">
      {/* Weekday Labels Header */}
      <div className="grid grid-cols-7 border-b border-border bg-gray-50/40 select-none">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="border-r border-border py-1.5 text-center last:border-r-0">
            <Typography variant="tiny" tone="muted" className="text-caption font-bold tracking-wider">{label}</Typography>
          </div>
        ))}
      </div>

      {/* 6-Week Month Day Grid */}
      <div className="grid grid-cols-7 auto-rows-fr">
        {days.map((dayInfo) => {
          const dateKey = format(dayInfo.date, 'yyyy-MM-dd')
          const dayVisits = [...(visitsByDate[dateKey] || [])].sort(
            (a, b) => parseISO(a.startsAt).getTime() - parseISO(b.startsAt).getTime(),
          )
          const hasVisits = dayVisits.length > 0
          const isSelected = selectedDate ? isSameDay(dayInfo.date, selectedDate) : false
          const isTodayDate = isToday(dayInfo.date)

          return (
            <div
              key={dateKey}
              role="button"
              tabIndex={0}
              onClick={() => {
                onDateSelect(dayInfo.isCurrentMonth ? dayInfo.date : null)
                if (dayInfo.isCurrentMonth) onDateClick?.(dayInfo.date)
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                onDateSelect(dayInfo.isCurrentMonth ? dayInfo.date : null)
                if (dayInfo.isCurrentMonth) onDateClick?.(dayInfo.date)
              }}
              className={cn(
                'relative flex min-h-[88px] md:min-h-[104px] flex-col items-start gap-1 border-b border-r border-border-subtle p-1.5 text-left transition-colors',
                !dayInfo.isCurrentMonth && 'bg-gray-50/40 text-muted-foreground',
                dayInfo.isCurrentMonth && 'hover:bg-gray-50/50',
                isSelected && 'bg-brand-primary/10 ring-1 ring-brand-primary ring-inset',
                isTodayDate && !isSelected && 'bg-brand-primary/5',
              )}
            >
              {/* Day Number Badge */}
              <span className={cn(
                'flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-bold transition-all',
                isTodayDate && 'bg-brand-primary text-white shadow-2xs',
                !isTodayDate && dayInfo.isCurrentMonth && 'text-foreground',
                !dayInfo.isCurrentMonth && 'text-muted-foreground',
              )}>
                {dayInfo.day}
              </span>

              {/* Day Events List */}
              {hasVisits && (
                <div className="flex w-full flex-col gap-0.5 overflow-hidden">
                  {dayVisits.slice(0, 3).map((item) => (
                    <AgendaEventCompactChip
                      key={`${item.kind}-${item.id}`}
                      item={item}
                      getVisitDotColor={getVisitDotColor}
                      onOpen={() => onEventClick?.(item)}
                    />
                  ))}
                  {dayVisits.length > 3 && (
                    <Typography variant="tiny" className="px-1 text-caption font-bold leading-none hover:underline">
                      +{dayVisits.length - 3} mais
                    </Typography>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
