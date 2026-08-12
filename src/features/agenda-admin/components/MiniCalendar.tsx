import { useState } from 'react'
import { format, isSameDay, isToday, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MiniCalendarProps {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  hasEventsOnDate?: (date: Date) => boolean
}

export function MiniCalendar({ selectedDate, onDateSelect, hasEventsOnDate }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => selectedDate || new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm select-none">
      {/* Header Navigation */}
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-bold text-foreground capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="flex h-6 w-6 items-center justify-center rounded-xl text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="flex h-6 w-6 items-center justify-center rounded-xl text-muted-foreground hover:bg-gray-50 hover:text-foreground transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1 text-center">
        {weekDays.map((day) => (
          <span key={day} className="text-caption font-semibold text-muted-foreground uppercase">
            {day}
          </span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {days.map((day) => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
          const isCurrentM = isSameMonth(day, currentMonth)
          const isCurrentDay = isToday(day)
          const hasEvents = hasEventsOnDate ? hasEventsOnDate(day) : false

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDateSelect(day)}
              className={cn(
                'relative flex h-7 w-7 items-center justify-center mx-auto rounded-mx-full text-xs font-medium transition-all',
                !isCurrentM && 'text-muted-foreground/40',
                isCurrentM && !isSelected && !isCurrentDay && 'text-foreground hover:bg-gray-50',
                isCurrentDay && !isSelected && 'border border-brand-primary text-emerald-600 font-bold',
                isSelected && 'bg-emerald-600 text-white font-bold shadow-sm',
              )}
            >
              {format(day, 'd')}
              {hasEvents && !isSelected && (
                <span
                  className={cn(
                    'absolute bottom-0.5 h-1 w-1 rounded-full',
                    isCurrentDay ? 'bg-emerald-600' : 'bg-gray-900',
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
