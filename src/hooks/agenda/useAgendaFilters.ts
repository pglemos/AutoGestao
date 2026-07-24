import { useCallback, useEffect, useMemo, useState } from 'react'
import { addWeeks, endOfDay, endOfMonth, endOfWeek, isWithinInterval, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import {
  AgendaScheduleEvent,
  AgendaVisit,
  CalendarMonth,
  DATE_FILTERS,
  DateFilter,
  UrlFilterKey,
} from './types'

export function getDateFilterInterval(
  dateFilter: DateFilter,
  calendarMonth: CalendarMonth,
  dayAnchor: Date,
  weekAnchor: Date,
) {
  switch (dateFilter) {
    case 'hoje':
      return { start: startOfDay(dayAnchor), end: endOfDay(dayAnchor) }
    case 'semana':
    case 'proxima_semana':
      // Both filters just seed weekAnchor's starting point (this week /
      // next week) — prev/next navigation moves weekAnchor from there, so
      // the fetched interval must follow the anchor, not a fixed "now".
      return {
        start: startOfWeek(weekAnchor, { weekStartsOn: 1 }),
        end: endOfWeek(weekAnchor, { weekStartsOn: 1 }),
      }
    case 'mes': {
      const visibleMonth = new Date(calendarMonth.year, calendarMonth.month, 1)
      return {
        start: startOfMonth(visibleMonth),
        end: endOfMonth(visibleMonth),
      }
    }
    default:
      return null
  }
}

function getInitialSearchParam(key: UrlFilterKey, fallback: string, allowedValues?: readonly string[]) {
  if (typeof window === 'undefined') return fallback
  const value = new URLSearchParams(window.location.search).get(key) || fallback
  return allowedValues && !allowedValues.includes(value) ? fallback : value
}

export type UseAgendaFiltersInput = {
  visits: AgendaVisit[]
  scheduleEvents: AgendaScheduleEvent[]
  calendarMonth: CalendarMonth
  setCalendarMonth: (next: CalendarMonth | ((prev: CalendarMonth) => CalendarMonth)) => void
  canViewAllAgendas: boolean
  dayAnchor: Date
  weekAnchor: Date
}

export type UseAgendaFiltersReturn = {
  dateFilter: DateFilter
  setDateFilter: (value: DateFilter) => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  consultantFilter: string
  setConsultantFilter: (value: string) => void
  activeFilters: number
  clearFilters: () => void
  filteredVisits: AgendaVisit[]
  filteredScheduleEvents: AgendaScheduleEvent[]
}

/**
 * Owns filter state (date range, status, consultant) with URL search-param sync.
 * Returns memoized filtered visits and schedule events.
 */
export function useAgendaFilters({
  visits,
  scheduleEvents,
  calendarMonth,
  setCalendarMonth,
  canViewAllAgendas,
  dayAnchor,
  weekAnchor,
}: UseAgendaFiltersInput): UseAgendaFiltersReturn {
  const [dateFilter, setDateFilterState] = useState<DateFilter>(() => getInitialSearchParam('range', 'semana', DATE_FILTERS) as DateFilter)
  const [statusFilter, setStatusFilterState] = useState<string>(() => getInitialSearchParam('status', 'todos'))
  const [consultantFilter, setConsultantFilterState] = useState<string>(() => getInitialSearchParam('consultant', 'todos'))

  const syncSearchParams = useCallback((updates: Partial<Record<UrlFilterKey, string>>) => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === 'todos') params.delete(key)
      else params.set(key, value)
    }
    const search = params.toString()
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', nextUrl)
  }, [])

  useEffect(() => {
    if (!canViewAllAgendas && consultantFilter !== 'todos') {
      setConsultantFilterState('todos')
      syncSearchParams({ consultant: 'todos' })
    }
  }, [canViewAllAgendas, consultantFilter, syncSearchParams])

  const setDateFilter = useCallback((value: DateFilter) => {
    if (value !== 'todos') {
      const base = value === 'proxima_semana' ? addWeeks(new Date(), 1) : new Date()
      setCalendarMonth({ year: base.getFullYear(), month: base.getMonth() })
    }
    setDateFilterState(value)
    syncSearchParams({ range: value })
  }, [syncSearchParams, setCalendarMonth])

  const setStatusFilter = useCallback((value: string) => {
    setStatusFilterState(value)
    syncSearchParams({ status: value })
  }, [syncSearchParams])

  const setConsultantFilter = useCallback((value: string) => {
    const nextValue = canViewAllAgendas ? value : 'todos'
    setConsultantFilterState(nextValue)
    syncSearchParams({ consultant: nextValue })
  }, [canViewAllAgendas, syncSearchParams])

  const clearFilters = useCallback(() => {
    setDateFilterState('todos')
    setStatusFilterState('todos')
    setConsultantFilterState('todos')
    syncSearchParams({ range: 'todos', status: 'todos', consultant: 'todos' })
  }, [syncSearchParams])

  const filteredVisits = useMemo(() => {
    let filtered = visits

    if (consultantFilter !== 'todos') {
      filtered = filtered.filter((v) => (
        v.consultant_id === consultantFilter ||
        v.auxiliary_consultant_id === consultantFilter
      ))
    }

    const dateInterval = getDateFilterInterval(dateFilter, calendarMonth, dayAnchor, weekAnchor)
    if (dateInterval) {
      filtered = filtered.filter((v) => {
        const d = new Date(v.scheduled_at)
        return isWithinInterval(d, dateInterval)
      })
    }

    if (statusFilter !== 'todos') {
      filtered = filtered.filter((v) => v.status === statusFilter)
    }

    return filtered
  }, [visits, consultantFilter, dateFilter, statusFilter, calendarMonth, dayAnchor, weekAnchor])

  const filteredScheduleEvents = useMemo(() => {
    let filtered = scheduleEvents

    if (consultantFilter !== 'todos') {
      filtered = filtered.filter((event) => event.responsible_user_id === consultantFilter)
    }

    const dateInterval = getDateFilterInterval(dateFilter, calendarMonth, dayAnchor, weekAnchor)
    if (dateInterval) {
      filtered = filtered.filter((event) => {
        const d = new Date(event.starts_at)
        return isWithinInterval(d, dateInterval)
      })
    }

    if (statusFilter !== 'todos') {
      if (statusFilter === 'em_andamento') return []
      const eventStatus = statusFilter === 'cancelada'
        ? 'cancelado'
        : statusFilter === 'concluida'
          ? 'concluido'
          : 'agendado'
      filtered = filtered.filter((event) => event.status === eventStatus)
    }

    return filtered
  }, [scheduleEvents, consultantFilter, dateFilter, statusFilter, calendarMonth, dayAnchor, weekAnchor])

  const activeFilters = useMemo(() => {
    return [
      consultantFilter !== 'todos',
      dateFilter !== 'todos',
      statusFilter !== 'todos',
    ].filter(Boolean).length
  }, [consultantFilter, dateFilter, statusFilter])

  return {
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    consultantFilter,
    setConsultantFilter,
    activeFilters,
    clearFilters,
    filteredVisits,
    filteredScheduleEvents,
  }
}
