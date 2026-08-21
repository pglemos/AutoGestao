import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { toast } from '@/lib/toast'
import { buildSaoPauloDateTime, type AgendaClient, type AgendaScheduleEvent, type AgendaVisit, type AgendaConsultant } from '@/hooks/agenda'
import { isPmrSchedulableVisitNumber, pmrVisitRangeMessage, resolveProgramTotalVisits } from '@/lib/consultoria/pmr-visit-rules'
import type { ScheduleForm } from '../modals/VisitaModal'
import type { EventForm } from '../modals/EventoModal'

type Deps = {
  visits: AgendaVisit[]
  clients: AgendaClient[]
  /** `program_key` → total de visitas contratadas, do repositório de eventos. */
  programTotalVisits: Record<string, number>
  consultants: AgendaConsultant[]
  canViewAllAgendas: boolean
  createVisit: (...args: any[]) => Promise<{ error?: string | null }>
  updateVisit: (...args: any[]) => Promise<{ error?: string | null }>
  updateVisitStatus: (id: string, status: string) => Promise<{ error?: string | null }>
  deleteVisit: (id: string) => Promise<{ error?: string | null }>
  createScheduleEvent: (...args: any[]) => Promise<{ error?: string | null }>
  updateScheduleEvent: (id: string, payload: any) => Promise<{ error?: string | null }>
  deleteScheduleEvent: (id: string) => Promise<{ error?: string | null }>
  getNextVisitNumber: (clientId: string) => number
}

const initialSchedule: ScheduleForm = {
  client_id: '', visit_number: '', status: 'agendada',
  scheduled_at: '', scheduled_time: '09:00', duration_hours: '3',
  modality: 'Presencial', consultant_id: '', auxiliary_consultant_id: '',
  visit_reason: '', target_audience: '', product_name: '', objective: '',
}

const initialEvent: EventForm = {
  event_type: 'aula', title: '', topic: '',
  starts_at: '', starts_time: '20:00', duration_hours: '2',
  modality: 'Online', location: 'Google Meet',
  target_audience: '', audience_goal: '',
  responsible_user_id: '', responsible_name: '',
  ticket_price_text: '', visit_reason: '', product_name: '',
  google_event_id: '', status: 'agendado',
}

const initialBlockEvent: EventForm = {
  ...initialEvent,
  event_type: 'bloqueio',
  title: 'Agenda bloqueada',
  starts_time: '08:00',
  duration_hours: '8',
  modality: 'Bloqueio',
  location: '',
  visit_reason: 'Agenda bloqueada',
}

/**
 * Encapsula state dos modais (Visita + Evento), handlers de submit/abrir/editar
 * e ações de status. Story 2.6 / ADR-0050.
 */
export function useAgendaAdminForms(deps: Deps) {
  const {
    visits, clients, programTotalVisits, consultants, canViewAllAgendas,
    createVisit, updateVisit, updateVisitStatus, deleteVisit,
    createScheduleEvent, updateScheduleEvent, deleteScheduleEvent,
    getNextVisitNumber,
  } = deps

  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(initialSchedule)
  const [eventForm, setEventForm] = useState<EventForm>(initialEvent)

  const handleOpenSchedule = (presetDate?: Date, presetTime?: string) => {
    const dateStr = presetDate ? format(presetDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    setEditingVisitId(null)
    setScheduleForm({
      ...initialSchedule,
      scheduled_at: dateStr,
      scheduled_time: presetTime || initialSchedule.scheduled_time,
      consultant_id: canViewAllAgendas ? '' : consultants[0]?.id || '',
    })
    setShowScheduleModal(true)
  }

  const handleOpenEditVisit = (visitId: string) => {
    const visit = visits.find((item) => item.id === visitId)
    if (!visit) return
    const scheduled = parseISO(visit.scheduled_at)
    setEditingVisitId(visit.id)
    setScheduleForm({
      client_id: visit.client_id,
      visit_number: String(visit.visit_number),
      status: visit.status,
      scheduled_at: format(scheduled, 'yyyy-MM-dd'),
      scheduled_time: format(scheduled, 'HH:mm'),
      duration_hours: String(visit.duration_hours || 3),
      modality: visit.modality || 'Presencial',
      consultant_id: visit.consultant_id || '',
      auxiliary_consultant_id: visit.auxiliary_consultant_id || '',
      visit_reason: visit.visit_reason || '',
      target_audience: visit.target_audience || '',
      product_name: visit.product_name || '',
      objective: visit.objective || '',
    })
    setShowScheduleModal(true)
  }

  const handleOpenEvent = (presetDate?: Date) => {
    const dateStr = presetDate ? format(presetDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    setEditingEventId(null)
    setEventForm({
      ...initialEvent,
      starts_at: dateStr,
      responsible_user_id: canViewAllAgendas ? '' : consultants[0]?.id || '',
      responsible_name: canViewAllAgendas ? '' : consultants[0]?.name || '',
    })
    setShowEventModal(true)
  }

  const handleOpenBlock = (presetDate?: Date) => {
    const dateStr = presetDate ? format(presetDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    setEditingEventId(null)
    setEventForm({
      ...initialBlockEvent,
      starts_at: dateStr,
      responsible_user_id: canViewAllAgendas ? '' : consultants[0]?.id || '',
      responsible_name: canViewAllAgendas ? '' : consultants[0]?.name || '',
    })
    setShowEventModal(true)
  }

  const handleOpenEditEvent = (event: AgendaScheduleEvent) => {
    const startsAt = parseISO(event.starts_at)
    setEditingEventId(event.id)
    setEventForm({
      event_type: event.event_type,
      title: event.title,
      topic: event.topic || '',
      starts_at: format(startsAt, 'yyyy-MM-dd'),
      starts_time: format(startsAt, 'HH:mm'),
      duration_hours: String(event.duration_hours || 1),
      modality: event.modality || 'Online',
      location: event.location || '',
      target_audience: event.target_audience || '',
      audience_goal: event.audience_goal ? String(event.audience_goal) : '',
      responsible_user_id: event.responsible_user_id || '',
      responsible_name: event.responsible_name || '',
      ticket_price_text: event.ticket_price_text || '',
      visit_reason: event.visit_reason || '',
      product_name: event.product_name || '',
      google_event_id: event.google_event_id || '',
      status: event.status || 'agendado',
    })
    setShowEventModal(true)
  }

  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleForm.client_id) { toast.error('Selecione um cliente da consultoria.'); return }
    if (!scheduleForm.scheduled_at || !scheduleForm.scheduled_time) { toast.error('Informe data e horário.'); return }
    const visitNumber = editingVisitId
      ? Number(scheduleForm.visit_number) || 0
      : getNextVisitNumber(scheduleForm.client_id)
    const client = clients.find((c) => c.id === scheduleForm.client_id)
    const totalVisits = resolveProgramTotalVisits(client?.program_template_key, programTotalVisits)
    if (!isPmrSchedulableVisitNumber(visitNumber, totalVisits)) {
      toast.error(pmrVisitRangeMessage(totalVisits))
      return
    }
    const scheduledAt = buildSaoPauloDateTime(scheduleForm.scheduled_at, scheduleForm.scheduled_time)
    setSubmitting(true)
    const payload = {
      client_id: scheduleForm.client_id,
      visit_number: visitNumber,
      scheduled_at: scheduledAt,
      duration_hours: Number(scheduleForm.duration_hours) || 3,
      modality: scheduleForm.modality,
      consultant_id: scheduleForm.consultant_id || null,
      auxiliary_consultant_id: scheduleForm.auxiliary_consultant_id || null,
      visit_reason: scheduleForm.visit_reason || null,
      target_audience: scheduleForm.target_audience || null,
      product_name: scheduleForm.product_name || null,
      objective: scheduleForm.objective || null,
    }
    const { error: createError } = editingVisitId
      ? await updateVisit({ ...payload, id: editingVisitId, status: scheduleForm.status })
      : await createVisit(payload)
    setSubmitting(false)
    if (createError) { toast.error(createError); return }
    toast.success(editingVisitId ? `Visita ${visitNumber} atualizada.` : `Visita ${visitNumber} agendada com sucesso!`)
    setShowScheduleModal(false)
    setEditingVisitId(null)
  }

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    const isBlock = eventForm.event_type === 'bloqueio'
    if (!eventForm.title.trim()) { toast.error(isBlock ? 'Informe o motivo do bloqueio.' : 'Informe o nome do evento ou aula.'); return }
    if (!eventForm.starts_at || !eventForm.starts_time) { toast.error('Informe data e horario.'); return }
    if (isBlock && !eventForm.responsible_user_id) {
      toast.error('Selecione o consultor MX responsável pelo bloqueio.')
      return
    }
    const responsible = consultants.find((item) => item.id === eventForm.responsible_user_id)
    const payload = {
      event_type: eventForm.event_type,
      title: eventForm.title.trim(),
      topic: eventForm.topic.trim() || null,
      starts_at: buildSaoPauloDateTime(eventForm.starts_at, eventForm.starts_time),
      duration_hours: Number(eventForm.duration_hours) || 1,
      modality: eventForm.modality || (isBlock ? 'Bloqueio' : 'Online'),
      location: eventForm.location.trim() || null,
      target_audience: isBlock ? null : eventForm.target_audience.trim() || null,
      audience_goal: isBlock ? null : eventForm.audience_goal ? Number(eventForm.audience_goal) : null,
      responsible_user_id: eventForm.responsible_user_id || null,
      responsible_name: responsible?.name || eventForm.responsible_name.trim() || null,
      ticket_price_text: isBlock ? null : eventForm.ticket_price_text.trim() || null,
      visit_reason: isBlock ? 'Agenda bloqueada' : eventForm.visit_reason || null,
      product_name: isBlock ? null : eventForm.product_name || null,
      google_event_id: isBlock ? null : eventForm.google_event_id.trim() || null,
      status: eventForm.status,
    }
    setSubmitting(true)
    const { error: eventError } = editingEventId
      ? await updateScheduleEvent(editingEventId, payload)
      : await createScheduleEvent(payload)
    setSubmitting(false)
    if (eventError) { toast.error(eventError); return }
    toast.success(isBlock
      ? editingEventId ? 'Bloqueio atualizado.' : 'Agenda bloqueada.'
      : editingEventId ? 'Evento/aula atualizado.' : 'Evento/aula criado.')
    setShowEventModal(false)
    setEditingEventId(null)
  }

  const handleCancelVisit = async (visitId: string) => {
    const { error } = await updateVisitStatus(visitId, 'cancelada')
    if (error) { toast.error(error); return }
    toast.success('Visita cancelada.')
  }
  const handleStartVisit = async (visitId: string) => {
    const { error } = await updateVisitStatus(visitId, 'em_andamento')
    if (error) { toast.error(error); return }
    toast.success('Visita iniciada.')
  }
  const handleDeleteVisit = async (visitId: string) => {
    const { error } = await deleteVisit(visitId)
    if (error) { toast.error(error); return }
    toast.success('Visita removida.')
  }
  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await deleteScheduleEvent(eventId)
    if (error) { toast.error(error); return }
    toast.success('Evento/aula removido.')
  }

  const closeScheduleModal = () => { setShowScheduleModal(false); setEditingVisitId(null) }
  const closeEventModal = () => { setShowEventModal(false); setEditingEventId(null) }

  return {
    showScheduleModal, showEventModal, submitting,
    editingVisitId, editingEventId,
    scheduleForm, setScheduleForm,
    eventForm, setEventForm,
    handleOpenSchedule, handleOpenEditVisit, handleOpenEvent, handleOpenBlock, handleOpenEditEvent,
    handleSubmitSchedule, handleSubmitEvent,
    handleCancelVisit, handleStartVisit, handleDeleteVisit, handleDeleteEvent,
    closeScheduleModal, closeEventModal,
  }
}
