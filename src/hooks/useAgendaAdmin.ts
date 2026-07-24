/**
 * @deprecated Será removido em Sprint 3. Migre para os sub-hooks específicos em
 * `@/hooks/agenda`:
 *   - `useAgendaEvents`  — fetch + cache de visitas/eventos/clientes/consultores
 *   - `useAgendaFilters` — filtros de data/status/consultor + URL sync
 *   - `useAgendaView`    — calendário (mês/semana/dia) + métricas + visitsByDate
 *   - `useAgendaCRUD`    — create/update/delete + Google Calendar sync
 *
 * Pattern: `docs/adr/0051-god-hook-split-pattern.md`.
 * Mapa de consumers: `docs/migrations/usage-useAgendaAdmin.md`.
 */
import { useState } from 'react'
import { useAgendaCRUD } from './agenda/useAgendaCRUD'
import { useAgendaEvents } from './agenda/useAgendaEvents'
import { useAgendaFilters } from './agenda/useAgendaFilters'
import { useAgendaView } from './agenda/useAgendaView'
import type { CalendarMonth } from './agenda/types'

export {
  buildSaoPauloDateTime,
  getCentralSyncError,
  syncVisitToGoogle,
} from './agenda/googleSync'

export type {
  AgendaClient,
  AgendaConsultant,
  AgendaProduct,
  AgendaScheduleEvent,
  AgendaVisit,
  CreateVisitInput,
  ScheduleEventInput,
  UpdateVisitInput,
} from './agenda/types'

/**
 * @deprecated Use os sub-hooks em `@/hooks/agenda`. Esta função agrega os 4
 * sub-hooks (`useAgendaEvents`, `useAgendaFilters`, `useAgendaView`,
 * `useAgendaCRUD`) preservando a API pública original (Story 2.7, ADR-0051).
 */
export function useAgendaAdmin() {
  const events = useAgendaEvents()

  const [calendarMonth, setCalendarMonth] = useState<CalendarMonth>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [dayAnchor, setDayAnchor] = useState<Date>(() => new Date())
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date())

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
    visits: filters.filteredVisits,
    allVisits: events.visits,
    scheduleEvents: filters.filteredScheduleEvents,
    allScheduleEvents: events.scheduleEvents,
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
