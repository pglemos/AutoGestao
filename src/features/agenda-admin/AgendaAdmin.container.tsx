import { useEffect, useMemo, useState } from 'react'
import { format, isSameDay, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { mergeAgendaOptionLabels, useAgendaOptions } from '@/hooks/useAgendaOptions'
import { GoogleCalendarStatus } from '@/features/agenda/components/GoogleCalendarStatus'
import { toast } from '@/lib/toast'
import type { CalendarAgendaItem } from '@/components/organisms/AgendaCalendar'
import { useAgendaAdminPage } from './hooks/useAgendaAdminPage'
import { useAgendaAdminForms } from './hooks/useAgendaAdminForms'
import { AgendaHeader } from './sections/AgendaHeader'
import { AgendaFiltersBar, type AdminCalendarViewMode } from './sections/AgendaFiltersBar'
import { AgendaCalendarView } from './sections/AgendaCalendarView'
import { AgendaListView } from './sections/AgendaListView'
import { AgendaSidebar } from './components/AgendaSidebar'
import { AgendaEventDrawer } from './components/AgendaEventDrawer'
import { VisitaModal } from './modals/VisitaModal'
import { EventoModal } from './modals/EventoModal'
import { AgendaErrorBoundary } from './components/AgendaErrorBoundary'
import { getRelativeDateLabel } from './data/agendaHelpers'
import { PageTemplate } from '@/components/templates/PageTemplate'

export function AgendaAdmin() {
  const [calendarViewMode, setCalendarViewMode] = useState<AdminCalendarViewMode>('week')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const {
    visitReasonOptions: agendaVisitReasonOptions,
    targetAudienceOptions: agendaTargetAudienceOptions,
  } = useAgendaOptions()

  const page = useAgendaAdminPage(calendarViewMode)
  const {
    visits, clients, consultants, products, scheduleEvents,
    metrics, loading, error,
    dateFilter, setDateFilter, statusFilter, setStatusFilter,
    consultantFilter, setConsultantFilter,
    activeFilters, clearFilters, refetch,
    calendarMonth, calendarDays, visitsByDate,
    goToPrevMonth, goToNextMonth, goToToday,
    createVisit, updateVisit, updateVisitStatus, deleteVisit,
    createScheduleEvent, updateScheduleEvent, deleteScheduleEvent,
    getNextVisitNumber, canViewAllAgendas,
  } = page

  const forms = useAgendaAdminForms({
    visits, consultants, canViewAllAgendas,
    createVisit, updateVisit, updateVisitStatus, deleteVisit,
    createScheduleEvent, updateScheduleEvent, deleteScheduleEvent,
    getNextVisitNumber,
  })

  // Synchronize view mode with date filter updates
  useEffect(() => {
    setCalendarViewMode(
      dateFilter === 'hoje'
        ? 'day'
        : dateFilter === 'semana' || dateFilter === 'proxima_semana'
          ? 'week'
          : dateFilter === 'mes'
            ? 'month'
            : 'list',
    )
  }, [dateFilter])

  // Global Keyboard Shortcuts (T: Today, D: Day, W: Week, M: Month, L: List)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return
      }

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        goToToday()
        setDateFilter('hoje')
        setCalendarViewMode('day')
        setSelectedDate(new Date())
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        setCalendarViewMode('day')
        setDateFilter('hoje')
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        setCalendarViewMode('week')
        setDateFilter('semana')
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        setCalendarViewMode('month')
        setDateFilter('mes')
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        setCalendarViewMode('list')
        setDateFilter('todos')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToToday, setDateFilter])

  // Label for current month / range
  const monthLabel = useMemo(() => {
    if (calendarViewMode === 'day' || dateFilter === 'hoje') {
      const day = calendarDays[0]?.date ?? new Date()
      const prefix = isToday(day) ? 'Hoje' : format(day, 'EEEE', { locale: ptBR })
      return `${prefix} · ${format(day, "dd 'de' MMMM", { locale: ptBR })}`
    }
    if (calendarViewMode === 'week' || dateFilter === 'semana' || dateFilter === 'proxima_semana') {
      const start = calendarDays[0]?.date ?? new Date()
      const end = calendarDays[calendarDays.length - 1]?.date ?? new Date()
      return `Semana · ${format(start, 'dd/MM')} a ${format(end, 'dd/MM')}`
    }
    return format(new Date(calendarMonth.year, calendarMonth.month, 1), "MMMM 'de' yyyy", { locale: ptBR })
  }, [calendarDays, calendarMonth, dateFilter, calendarViewMode])

  useEffect(() => {
    setSelectedDate(dateFilter === 'hoje' ? new Date() : null)
  }, [dateFilter])

  // Search filter
  const searchFilteredVisits = useMemo(() => {
    if (!searchQuery.trim()) return visits
    const q = searchQuery.toLowerCase().trim()
    return visits.filter(
      (v) =>
        v.client_name?.toLowerCase().includes(q) ||
        v.consultant?.name?.toLowerCase().includes(q) ||
        v.objective?.toLowerCase().includes(q) ||
        v.visit_reason?.toLowerCase().includes(q) ||
        v.product_name?.toLowerCase().includes(q) ||
        String(v.visit_number).includes(q),
    )
  }, [visits, searchQuery])

  const searchFilteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return scheduleEvents
    const q = searchQuery.toLowerCase().trim()
    return scheduleEvents.filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        e.responsible_name?.toLowerCase().includes(q) ||
        e.topic?.toLowerCase().includes(q) ||
        e.product_name?.toLowerCase().includes(q),
    )
  }, [scheduleEvents, searchQuery])

  const selectedDayVisits = useMemo(
    () => (!selectedDate ? [] : searchFilteredVisits.filter((v) => isSameDay(parseISO(v.scheduled_at), selectedDate))),
    [selectedDate, searchFilteredVisits],
  )
  const selectedDayEvents = useMemo(
    () => (!selectedDate ? [] : searchFilteredEvents.filter((e) => isSameDay(parseISO(e.starts_at), selectedDate))),
    [selectedDate, searchFilteredEvents],
  )

  const hasEventsOnDate = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd')
    return Boolean(visitsByDate[key] && visitsByDate[key].length > 0)
  }

  const productSelectOptions = useMemo(() => {
    const names = new Set(products.map((p) => p.name).filter(Boolean))
    if (forms.scheduleForm.product_name) names.add(forms.scheduleForm.product_name)
    if (forms.eventForm.product_name) names.add(forms.eventForm.product_name)
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [forms.eventForm.product_name, products, forms.scheduleForm.product_name])

  const visitReasonSelectOptions = useMemo(
    () => mergeAgendaOptionLabels(agendaVisitReasonOptions, forms.scheduleForm.visit_reason, forms.eventForm.visit_reason),
    [agendaVisitReasonOptions, forms.eventForm.visit_reason, forms.scheduleForm.visit_reason],
  )
  const targetAudienceSelectOptions = useMemo(
    () => mergeAgendaOptionLabels(agendaTargetAudienceOptions, forms.scheduleForm.target_audience, forms.eventForm.target_audience),
    [agendaTargetAudienceOptions, forms.eventForm.target_audience, forms.scheduleForm.target_audience],
  )

  const groupedVisits = useMemo(() => {
    const groups: Record<string, { date: Date; label: string; visits: typeof searchFilteredVisits; events: typeof searchFilteredEvents }> = {}
    for (const visit of searchFilteredVisits) {
      const date = parseISO(visit.scheduled_at)
      const key = format(date, 'yyyy-MM-dd')
      if (!groups[key]) groups[key] = { date, label: getRelativeDateLabel(date), visits: [], events: [] }
      groups[key].visits.push(visit)
    }
    for (const event of searchFilteredEvents) {
      const date = parseISO(event.starts_at)
      const key = format(date, 'yyyy-MM-dd')
      if (!groups[key]) groups[key] = { date, label: getRelativeDateLabel(date), visits: [], events: [] }
      groups[key].events.push(event)
    }
    return Object.values(groups).sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [searchFilteredVisits, searchFilteredEvents])

  const handleSlotClick = (date: Date, hour: number, minute: number) => {
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    forms.handleOpenSchedule(date, time)
  }

  const handleReschedule = async (item: CalendarAgendaItem, newStartsAtISO: string) => {
    if (item.kind === 'visit') {
      const visit = visits.find((v) => v.id === item.id)
      if (!visit) return
      const { error: rescheduleError } = await updateVisit({
        id: visit.id,
        client_id: visit.client_id,
        visit_number: visit.visit_number,
        scheduled_at: newStartsAtISO,
        duration_hours: visit.duration_hours,
        modality: visit.modality,
        consultant_id: visit.consultant_id,
        auxiliary_consultant_id: visit.auxiliary_consultant_id,
        objective: visit.objective,
        visit_reason: visit.visit_reason ?? null,
        target_audience: visit.target_audience ?? null,
        product_name: visit.product_name ?? null,
        status: visit.status,
      })
      if (rescheduleError) toast.error(rescheduleError)
      else toast.success(`Visita ${visit.visit_number} reagendada.`)
      return
    }

    const eventItem = scheduleEvents.find((e) => e.id === item.id)
    if (!eventItem) return
    const { error: rescheduleError } = await updateScheduleEvent(eventItem.id, {
      event_type: eventItem.event_type,
      title: eventItem.title,
      topic: eventItem.topic,
      starts_at: newStartsAtISO,
      duration_hours: eventItem.duration_hours,
      modality: eventItem.modality,
      location: eventItem.location,
      target_audience: eventItem.target_audience,
      audience_goal: eventItem.audience_goal,
      responsible_user_id: eventItem.responsible_user_id,
      responsible_name: eventItem.responsible_name,
      ticket_price_text: eventItem.ticket_price_text,
      visit_reason: eventItem.visit_reason,
      product_name: eventItem.product_name,
      google_event_id: eventItem.google_event_id,
      status: eventItem.status,
    })
    if (rescheduleError) toast.error(rescheduleError)
    else toast.success('Evento reagendado.')
  }

  const handleResizeItem = async (item: CalendarAgendaItem, newDurationHours: number) => {
    if (item.kind === 'visit') {
      const visit = visits.find((v) => v.id === item.id)
      if (!visit) return
      const { error: resizeError } = await updateVisit({
        id: visit.id,
        client_id: visit.client_id,
        visit_number: visit.visit_number,
        scheduled_at: visit.scheduled_at,
        duration_hours: newDurationHours,
        modality: visit.modality,
        consultant_id: visit.consultant_id,
        auxiliary_consultant_id: visit.auxiliary_consultant_id,
        objective: visit.objective,
        visit_reason: visit.visit_reason ?? null,
        target_audience: visit.target_audience ?? null,
        product_name: visit.product_name ?? null,
        status: visit.status,
      })
      if (resizeError) toast.error(resizeError)
      return
    }

    const eventItem = scheduleEvents.find((e) => e.id === item.id)
    if (!eventItem) return
    const { error: resizeError } = await updateScheduleEvent(eventItem.id, {
      event_type: eventItem.event_type,
      title: eventItem.title,
      topic: eventItem.topic,
      starts_at: eventItem.starts_at,
      duration_hours: newDurationHours,
      modality: eventItem.modality,
      location: eventItem.location,
      target_audience: eventItem.target_audience,
      audience_goal: eventItem.audience_goal,
      responsible_user_id: eventItem.responsible_user_id,
      responsible_name: eventItem.responsible_name,
      ticket_price_text: eventItem.ticket_price_text,
      visit_reason: eventItem.visit_reason,
      product_name: eventItem.product_name,
      google_event_id: eventItem.google_event_id,
      status: eventItem.status,
    })
    if (resizeError) toast.error(resizeError)
  }

  const handleQuickEdit = (item: CalendarAgendaItem) => {
    if (item.kind === 'visit') {
      forms.handleOpenEditVisit(item.id)
      return
    }
    const eventItem = scheduleEvents.find((e) => e.id === item.id)
    if (eventItem) forms.handleOpenEditEvent(eventItem)
  }

  const handleQuickStatusChange = async (item: CalendarAgendaItem, status: string) => {
    if (item.kind !== 'visit') return
    const { error: statusError } = await updateVisitStatus(item.id, status)
    if (statusError) toast.error(statusError)
  }

  const handleQuickDelete = (item: CalendarAgendaItem) => {
    if (item.kind === 'visit') forms.handleDeleteVisit(item.id)
    else forms.handleDeleteEvent(item.id)
  }

  const quickActions = {
    onEdit: handleQuickEdit,
    onStatusChange: handleQuickStatusChange,
    onDelete: handleQuickDelete,
  }

  return (
    <PageTemplate as="div" width="wide" surface="plain" className="flex h-full w-full flex-col">
      {/* Unified Top Header */}
      <AgendaErrorBoundary sectionName="header">
        <AgendaHeader
          monthLabel={monthLabel}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
          onTodayClick={() => { goToToday(); setDateFilter('hoje'); setCalendarViewMode('day') }}
          calendarViewMode={calendarViewMode}
          setCalendarViewMode={setCalendarViewMode}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={() => refetch()}
          onCreateVisit={() => forms.handleOpenSchedule()}
          onCreateEvent={() => forms.handleOpenEvent()}
          onCreateBlock={() => forms.handleOpenBlock()}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          consultantFilter={consultantFilter}
          setConsultantFilter={setConsultantFilter}
          activeFilters={activeFilters}
          clearFilters={clearFilters}
          consultants={consultants}
          canViewAllAgendas={canViewAllAgendas}
        />
      </AgendaErrorBoundary>

      {/* Active Filters Banner if active */}
      <AgendaErrorBoundary sectionName="filters">
        <AgendaFiltersBar
          activeFilters={activeFilters}
          clearFilters={clearFilters}
        />
      </AgendaErrorBoundary>

      {/* Error Notice */}
      {error && (
        <Card className="my-2 p-4 bg-status-error-surface border border-status-error/20">
          <Typography variant="p" tone="error">Falha ao carregar agenda: {error}</Typography>
        </Card>
      )}

      {/* Main Workspace Layout (Sidebar + Calendar Canvas) */}
      <div className="mt-3 flex flex-col lg:flex-row gap-6 lg:flex-1 lg:min-h-0">
        {/* Left Sidebar Navigation */}
        <AgendaSidebar
          selectedDate={selectedDate}
          onDateSelect={(date) => setSelectedDate(date)}
          hasEventsOnDate={hasEventsOnDate}
          consultants={consultants}
          consultantFilter={consultantFilter}
          onConsultantChange={setConsultantFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          metrics={metrics}
          canViewAllAgendas={canViewAllAgendas}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Center Main Calendar View */}
        <div className="flex flex-col min-w-0 lg:flex-1 lg:min-h-0">
          <div className="flex flex-col lg:flex-1 lg:min-h-0">
            {calendarViewMode === 'list' ? (
              <AgendaErrorBoundary sectionName="list">
                <AgendaListView
                  loading={loading} groupedVisits={groupedVisits}
                  onStartVisit={forms.handleStartVisit}
                  onCancelVisit={forms.handleCancelVisit}
                  onDeleteVisit={forms.handleDeleteVisit}
                  onEditVisit={forms.handleOpenEditVisit}
                  onEditEvent={forms.handleOpenEditEvent}
                  onDeleteEvent={forms.handleDeleteEvent}
                />
              </AgendaErrorBoundary>
            ) : (
              <AgendaErrorBoundary sectionName="calendar">
                <AgendaCalendarView
                  calendarDays={calendarDays} visitsByDate={visitsByDate}
                  selectedDate={selectedDate} onDateSelect={setSelectedDate}
                  monthLabel={monthLabel}
                  onPrevMonth={goToPrevMonth} onNextMonth={goToNextMonth}
                  onTodayClick={() => { goToToday(); setDateFilter('hoje'); setCalendarViewMode('day') }}
                  calendarViewMode={calendarViewMode} dateFilter={dateFilter}
                  onSlotClick={handleSlotClick}
                  onReschedule={handleReschedule}
                  onResize={handleResizeItem}
                  onEventClick={handleQuickEdit}
                  quickActions={quickActions}
                />
              </AgendaErrorBoundary>
            )}
          </div>

          {/* Sync Footer Badge */}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 shrink-0">
            <GoogleCalendarStatus compact />
            <span className="text-caption text-muted-foreground font-mono hidden md:inline">
              Atalhos: [T] Hoje • [D] Dia • [W] Semana • [M] Mês • [L] Lista • [/] Buscar
            </span>
          </div>
        </div>
      </div>

      {/* Slide-over Detail Drawer */}
      <AgendaEventDrawer
        selectedDate={selectedDate}
        selectedDayVisits={selectedDayVisits}
        selectedDayEvents={selectedDayEvents}
        onClose={() => setSelectedDate(null)}
        onScheduleVisit={forms.handleOpenSchedule}
        onBlockDate={forms.handleOpenBlock}
        onEditVisit={forms.handleOpenEditVisit}
        onEditEvent={forms.handleOpenEditEvent}
        onStartVisit={forms.handleStartVisit}
        onCancelVisit={forms.handleCancelVisit}
        onDeleteVisit={forms.handleDeleteVisit}
        onDeleteEvent={forms.handleDeleteEvent}
      />

      {/* Modals */}
      <VisitaModal
        open={forms.showScheduleModal} onClose={forms.closeScheduleModal}
        editingVisitId={forms.editingVisitId}
        scheduleForm={forms.scheduleForm} setScheduleForm={forms.setScheduleForm}
        submitting={forms.submitting} onSubmit={forms.handleSubmitSchedule}
        clients={clients} consultants={consultants}
        visitReasonSelectOptions={visitReasonSelectOptions}
        targetAudienceSelectOptions={targetAudienceSelectOptions}
        productSelectOptions={productSelectOptions}
        getNextVisitNumber={getNextVisitNumber}
      />

      <EventoModal
        open={forms.showEventModal} onClose={forms.closeEventModal}
        editingEventId={forms.editingEventId}
        eventForm={forms.eventForm} setEventForm={forms.setEventForm}
        submitting={forms.submitting} onSubmit={forms.handleSubmitEvent}
        consultants={consultants}
        visitReasonSelectOptions={visitReasonSelectOptions}
        targetAudienceSelectOptions={targetAudienceSelectOptions}
        productSelectOptions={productSelectOptions}
      />
    </PageTemplate>
  )
}

export default AgendaAdmin
