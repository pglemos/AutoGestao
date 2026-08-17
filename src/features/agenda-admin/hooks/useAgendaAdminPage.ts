import { useState } from 'react'
import {
  useAgendaCRUD,
  useAgendaEvents,
  useAgendaFilters,
  useAgendaView,
  type CalendarMonth,
} from '@/hooks/agenda'

export function useAgendaAdminPage(viewMode?: 'day' | 'week' | 'month' | 'list') {
  const events = useAgendaEvents()

  const [calendarMonth, setCalendarMonth] = useState<CalendarMonth>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  // Shared with both filters (what gets fetched) and view (what gets drawn) —
  // prev/next navigation on Dia/Semana must move both in lockstep, or the
  // grid shows dates with no data (Story fix: navegar semana ficava vazio).
  const [dayAnchor, setDayAnchor] = useState<Date>(() => new Date())
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date())

  const navigateToDate = (date: Date) => {
    setDayAnchor(date)
    setWeekAnchor(date)
    setCalendarMonth({ year: date.getFullYear(), month: date.getMonth() })
  }

  const filters = useAgendaFilters({
    visits: events.visits,
    scheduleEvents: events.scheduleEvents,
    calendarMonth,
    setCalendarMonth,
    canViewAllAgendas: events.canViewAllAgendas,
    dayAnchor,
    weekAnchor,
  })

  const view = useAgendaView({
    filteredVisits: filters.filteredVisits,
    filteredScheduleEvents: filters.filteredScheduleEvents,
    dateFilter: filters.dateFilter,
    calendarMonth,
    setCalendarMonth,
    viewMode,
    dayAnchor,
    setDayAnchor,
    weekAnchor,
    setWeekAnchor,
  })

  const crud = useAgendaCRUD({
    visits: events.visits,
    refetch: events.refetch,
    canViewAllAgendas: events.canViewAllAgendas,
  })

  return {
    allVisits: events.visits,
    allScheduleEvents: events.scheduleEvents,
    visits: filters.filteredVisits,
    scheduleEvents: filters.filteredScheduleEvents,
    clients: events.clients,
    consultants: events.consultants,
    products: events.products,
    canViewAllAgendas: events.canViewAllAgendas,
    metrics: view.metrics,
    loading: events.loading,
    error: events.error,
    dateFilter: filters.dateFilter,
    setDateFilter: filters.setDateFilter,
    statusFilter: filters.statusFilter,
    setStatusFilter: filters.setStatusFilter,
    consultantFilter: filters.consultantFilter,
    setConsultantFilter: filters.setConsultantFilter,
    activeFilters: filters.activeFilters,
    clearFilters: filters.clearFilters,
    refetch: events.refetch,
    calendarMonth,
    calendarDays: view.calendarDays,
    visitsByDate: view.visitsByDate,
    goToPrevMonth: view.goToPrevMonth,
    goToNextMonth: view.goToNextMonth,
    goToToday: view.goToToday,
    navigateToDate,
    createVisit: crud.createVisit,
    updateVisit: crud.updateVisit,
    updateVisitStatus: crud.updateVisitStatus,
    deleteVisit: crud.deleteVisit,
    createScheduleEvent: crud.createScheduleEvent,
    updateScheduleEvent: crud.updateScheduleEvent,
    deleteScheduleEvent: crud.deleteScheduleEvent,
    getNextVisitNumber: crud.getNextVisitNumber,
  }
}

export type UseAgendaAdminPageReturn = ReturnType<typeof useAgendaAdminPage>
