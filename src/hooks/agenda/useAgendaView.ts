import { useCallback, useEffect, useMemo } from 'react'
import { addDays, addWeeks, format, startOfWeek } from 'date-fns'
import type {
  AgendaScheduleEvent,
  AgendaVisit,
  CalendarMonth,
  DateFilter,
} from './types'
import type { CalendarAgendaItem } from '@/components/organisms/AgendaCalendar'

export type UseAgendaViewInput = {
  filteredVisits: AgendaVisit[]
  filteredScheduleEvents: AgendaScheduleEvent[]
  dateFilter: DateFilter
  calendarMonth: CalendarMonth
  setCalendarMonth: (next: CalendarMonth | ((prev: CalendarMonth) => CalendarMonth)) => void
  viewMode?: 'day' | 'week' | 'month' | 'list'
  dayAnchor: Date
  setDayAnchor: (next: Date | ((prev: Date) => Date)) => void
  weekAnchor: Date
  setWeekAnchor: (next: Date | ((prev: Date) => Date)) => void
}

export type UseAgendaViewReturn = {
  calendarDays: { date: Date; day: number; isCurrentMonth: boolean }[]
  visitsByDate: Record<string, CalendarAgendaItem[]>
  metrics: {
    total: number
    agendadas: number
    emAndamento: number
    concluidas: number
    canceladas: number
  }
  goToPrevMonth: () => void
  goToNextMonth: () => void
  goToToday: () => void
}

/**
 * Derives the calendar grid, per-date aggregation map and aggregate metrics
 * from the already-filtered visits/events lists. `calendarMonth` is provided
 * by the caller so it can be shared with `useAgendaFilters` (which needs to
 * move the visible month when the date range changes).
 */
export function useAgendaView({
  filteredVisits,
  filteredScheduleEvents,
  dateFilter,
  calendarMonth,
  setCalendarMonth,
  viewMode,
  dayAnchor,
  setDayAnchor,
  weekAnchor,
  setWeekAnchor,
}: UseAgendaViewInput): UseAgendaViewReturn {

  // Anchors let the prev/next arrows step through arbitrary days/weeks —
  // dateFilter only seeds the starting point (today / next week / etc).
  // Owned by the caller (shared with useAgendaFilters) so navigation also
  // moves which dates are fetched, not just which dates are drawn.
  useEffect(() => {
    if (dateFilter === 'hoje') setDayAnchor(new Date())
    else if (dateFilter === 'semana') setWeekAnchor(new Date())
    else if (dateFilter === 'proxima_semana') setWeekAnchor(addWeeks(new Date(), 1))
  }, [dateFilter])

  const calendarDays = useMemo(() => {
    // Explicit viewMode takes precedence if provided, falling back to dateFilter
    const effectiveView = viewMode ?? (dateFilter === 'hoje' ? 'day' : dateFilter === 'semana' || dateFilter === 'proxima_semana' ? 'week' : 'month')

    if (effectiveView === 'day') {
      return [{ date: dayAnchor, day: dayAnchor.getDate(), isCurrentMonth: true }]
    }

    if (effectiveView === 'week') {
      const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 })
      return Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index)
        return { date, day: date.getDate(), isCurrentMonth: true }
      })
    }

    // Month view (effectiveView === 'month' or 'list')
    const { year, month } = calendarMonth
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDow = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const days: { date: Date; day: number; isCurrentMonth: boolean }[] = []
    const prevMonthLast = new Date(year, month, 0).getDate()
    for (let i = startDow - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthLast - i), day: prevMonthLast - i, isCurrentMonth: false })
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push({ date: new Date(year, month, d), day: d, isCurrentMonth: true })
    }
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      days.push({ date: new Date(year, month + 1, d), day: d, isCurrentMonth: false })
    }
    return days
  }, [calendarMonth, dateFilter, dayAnchor, weekAnchor, viewMode])

  const visitsByDate = useMemo(() => {
    const map: Record<string, CalendarAgendaItem[]> = {}
    for (const v of filteredVisits) {
      const key = format(new Date(v.scheduled_at), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push({
        id: v.id,
        status: v.status,
        title: v.client_name,
        startsAt: v.scheduled_at,
        durationHours: v.duration_hours,
        kind: 'visit',
        subtitle: `Visita ${v.visit_number}`,
      })
    }
    for (const event of filteredScheduleEvents) {
      const key = format(new Date(event.starts_at), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push({
        id: event.id,
        status: event.status === 'cancelado' ? 'cancelada' : event.status === 'concluido' ? 'concluida' : 'agendada',
        title: event.title,
        startsAt: event.starts_at,
        durationHours: event.duration_hours,
        kind: 'event',
        subtitle: event.responsible_name || event.topic,
      })
    }
    return map
  }, [filteredVisits, filteredScheduleEvents])

  const metrics = useMemo(() => {
    const total = filteredVisits.length + filteredScheduleEvents.length
    const agendadas = filteredVisits.filter((v) => v.status === 'agendada').length + filteredScheduleEvents.filter((e) => e.status === 'agendado').length
    const emAndamento = filteredVisits.filter((v) => v.status === 'em_andamento').length
    const concluidas = filteredVisits.filter((v) => v.status === 'concluida').length + filteredScheduleEvents.filter((e) => e.status === 'concluido').length
    const canceladas = filteredVisits.filter((v) => v.status === 'cancelada').length + filteredScheduleEvents.filter((e) => e.status === 'cancelado').length
    return { total, agendadas, emAndamento, concluidas, canceladas }
  }, [filteredVisits, filteredScheduleEvents])

  const goToPrevMonth = useCallback(() => {
    const effectiveView = viewMode ?? (dateFilter === 'hoje' ? 'day' : dateFilter === 'semana' || dateFilter === 'proxima_semana' ? 'week' : 'month')
    if (effectiveView === 'day') { setDayAnchor((prev) => addDays(prev, -1)); return }
    if (effectiveView === 'week') { setWeekAnchor((prev) => addWeeks(prev, -1)); return }
    setCalendarMonth((prev) => {
      const m = prev.month === 0 ? 11 : prev.month - 1
      const y = prev.month === 0 ? prev.year - 1 : prev.year
      return { year: y, month: m }
    })
  }, [dateFilter, viewMode, setCalendarMonth])

  const goToNextMonth = useCallback(() => {
    const effectiveView = viewMode ?? (dateFilter === 'hoje' ? 'day' : dateFilter === 'semana' || dateFilter === 'proxima_semana' ? 'week' : 'month')
    if (effectiveView === 'day') { setDayAnchor((prev) => addDays(prev, 1)); return }
    if (effectiveView === 'week') { setWeekAnchor((prev) => addWeeks(prev, 1)); return }
    setCalendarMonth((prev) => {
      const m = prev.month === 11 ? 0 : prev.month + 1
      const y = prev.month === 11 ? prev.year + 1 : prev.year
      return { year: y, month: m }
    })
  }, [dateFilter, viewMode, setCalendarMonth])

  const goToToday = useCallback(() => {
    const now = new Date()
    setDayAnchor(now)
    setWeekAnchor(now)
    setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() })
  }, [setCalendarMonth])

  return {
    calendarDays,
    visitsByDate,
    metrics,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
  }
}
