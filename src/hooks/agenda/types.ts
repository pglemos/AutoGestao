import type { ConsultingVisit } from '@/features/consultoria/types'

export type CalendarSyncResult = {
  ok: boolean
  kind?: 'visit' | 'schedule_event'
  personalEventId: string | null
  centralEventId: string | null
  googleMeetLink?: string | null
  errors: { calendar: 'personal' | 'central'; message: string }[]
  userConnected: boolean
  centralConnected: boolean
}

export type AgendaVisit = ConsultingVisit & {
  client_name: string
  client_slug: string
  client_status: string
  client_modality: string | null
  source_visit_code?: string | null
  meet_artifact?: GoogleMeetArtifact | null
}

export type GoogleMeetArtifact = {
  id: string
  source_kind: 'visit' | 'schedule_event'
  source_id: string
  title: string | null
  meeting_code: string | null
  google_meet_link: string | null
  transcript_state: string | null
  transcript_text: string | null
  ata_text: string | null
  status: 'pending' | 'no_meet' | 'no_conference_record' | 'no_transcript' | 'transcript_not_ready' | 'processed' | 'failed'
  error_message: string | null
  processed_at: string | null
  updated_at: string
}

export type AgendaScheduleEvent = {
  id: string
  event_type: 'aula' | 'evento_online' | 'evento_presencial' | 'bloqueio'
  title: string
  topic: string | null
  starts_at: string
  duration_hours: number
  modality: string
  location: string | null
  target_audience: string | null
  audience_goal: number | null
  responsible_user_id: string | null
  responsible_name: string | null
  ticket_price_text: string | null
  visit_reason: string | null
  product_name: string | null
  google_event_id: string | null
  google_event_id_personal?: string | null
  google_meet_link?: string | null
  status: 'agendado' | 'cancelado' | 'concluido'
  source_sheet: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  responsible?: { name: string; email: string } | null
  meet_artifact?: GoogleMeetArtifact | null
}

export type AgendaClient = {
  id: string
  name: string
  status: string
  current_visit_step: number
  primary_store_id?: string | null
  program_template_key: string | null
}

export type AgendaConsultant = {
  id: string
  name: string
  email: string
}

export type AgendaProduct = {
  id: string
  name: string
  status?: string | null
  sort_order?: number | null
}

export type VisitCalendarRow = ConsultingVisit & {
  client?: {
    name?: string | null
    slug?: string | null
    status?: string | null
    modality?: string | null
  } | null
  consultant?: { email?: string | null } | null
}

export type ScheduleEventCalendarRow = AgendaScheduleEvent & {
  responsible?: { name?: string | null; email?: string | null } | null
}

export type CreateVisitInput = {
  client_id: string
  visit_number: number
  scheduled_at: string
  duration_hours: number
  modality: string
  consultant_id: string | null
  auxiliary_consultant_id: string | null
  objective: string | null
  visit_reason: string | null
  target_audience: string | null
  product_name: string | null
}

export type UpdateVisitInput = CreateVisitInput & {
  id: string
  status: string
}

export type ScheduleEventInput = {
  event_type: AgendaScheduleEvent['event_type']
  title: string
  topic: string | null
  starts_at: string
  duration_hours: number
  modality: string
  location: string | null
  target_audience: string | null
  audience_goal: number | null
  responsible_user_id: string | null
  responsible_name: string | null
  ticket_price_text: string | null
  visit_reason: string | null
  product_name: string | null
  google_event_id?: string | null
  status?: AgendaScheduleEvent['status']
}

export const DATE_FILTERS = ['hoje', 'semana', 'mes', 'proxima_semana', 'todos'] as const
export type DateFilter = typeof DATE_FILTERS[number]
export type UrlFilterKey = 'range' | 'status' | 'consultant'

export type CalendarMonth = { year: number; month: number }
