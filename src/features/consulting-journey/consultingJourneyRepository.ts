import { supabase } from '@/lib/supabase'
import type {
  AnticipationStatus,
  ConsultingAnticipation,
  ConsultingDeliveryItem,
  ConsultingJourneyEvidence,
  ConsultingJourneyRepository,
  ConsultingJourneySnapshot,
  ConsultingJourneyVisit,
  ConsultingLesson,
  ConsultingLessonProgress,
  ConsultingMaterial,
  ConsultingParticipant,
  DeliveryItemStatus,
  EvidenceStatus,
  RegisterEvidenceInput,
  SaveLessonProgressInput,
  UploadEvidenceInput,
} from './consultingJourney.types'

type RpcError = { message?: string } | null
type RpcResult = { data: unknown; error: RpcError }
type StorageBucket = {
  upload(path: string, file: File, options?: Record<string, unknown>): Promise<{ data: { path?: string } | null; error: RpcError }>
  remove(paths: string[]): Promise<{ data: unknown; error: RpcError }>
}
type ConsultingClient = {
  rpc(name: string, args?: Record<string, unknown>): Promise<RpcResult>
  storage: { from(bucket: string): StorageBucket }
}

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? value as Record<string, unknown> : {}
)
const asString = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback
const asNullableString = (value: unknown): string | null => typeof value === 'string' && value ? value : null
const asNumber = (value: unknown, fallback = 0): number => Number.isFinite(Number(value)) ? Number(value) : fallback
const asBoolean = (value: unknown): boolean => value === true
const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : []

function throwRpc(error: RpcError, fallback: string): void {
  if (error) throw new Error(error.message || fallback)
}

function mapLesson(value: unknown): ConsultingLesson | null {
  if (!value || typeof value !== 'object') return null
  const row = asRecord(value)
  const id = asString(row.id)
  if (!id) return null
  return {
    id,
    title: asString(row.title, 'Aula'),
    type: asString(row.type, 'aula_gravada'),
    videoUrl: asNullableString(row.videoUrl ?? row.video_url),
    content: asNullableString(row.content ?? row.conteudo_md),
    metadata: asRecord(row.metadata),
  }
}

function mapLessonProgress(value: unknown): ConsultingLessonProgress | null {
  if (!value || typeof value !== 'object') return null
  const row = asRecord(value)
  return {
    positionSeconds: asNumber(row.positionSeconds ?? row.position_seconds),
    durationSeconds: asNumber(row.durationSeconds ?? row.duration_seconds),
    playedSeconds: asNumber(row.playedSeconds ?? row.played_seconds),
    percentage: asNumber(row.percentage),
    completedAt: asNullableString(row.completedAt ?? row.completed_at),
  }
}

function mapDeliveryItem(value: unknown): ConsultingDeliveryItem {
  const row = asRecord(value)
  return {
    id: asString(row.id),
    clientId: asNullableString(row.clientId ?? row.client_id),
    storeId: asNullableString(row.storeId ?? row.store_id),
    visitId: asString(row.visitId ?? row.visit_id),
    lessonId: asNullableString(row.lessonId ?? row.lesson_id),
    evidenceId: asNullableString(row.evidenceId ?? row.evidence_id),
    itemType: asString(row.itemType ?? row.item_type, 'task'),
    sourceKey: asString(row.sourceKey ?? row.source_key),
    title: asString(row.title, 'Item da Entrega'),
    description: asNullableString(row.description),
    required: row.required !== false,
    status: asString(row.status, 'pending') as DeliveryItemStatus,
    responsibleUserId: asNullableString(row.responsibleUserId ?? row.responsible_user_id),
    dueAt: asNullableString(row.dueAt ?? row.due_at),
    note: asNullableString(row.note),
    sortOrder: asNumber(row.sortOrder ?? row.sort_order),
    completedAt: asNullableString(row.completedAt ?? row.completed_at),
    completedBy: asNullableString(row.completedBy ?? row.completed_by),
  }
}

function mapParticipant(value: unknown): ConsultingParticipant {
  const row = asRecord(value)
  return {
    id: asString(row.id),
    visitId: asString(row.visitId ?? row.visit_id),
    participantKey: asString(row.participantKey ?? row.participant_key),
    userId: asNullableString(row.userId ?? row.user_id),
    name: asString(row.name, 'Participante'),
    roleLabel: asNullableString(row.roleLabel ?? row.role_label),
    required: row.required !== false,
    confirmed: asBoolean(row.confirmed),
    confirmedAt: asNullableString(row.confirmedAt ?? row.confirmed_at),
    confirmedBy: asNullableString(row.confirmedBy ?? row.confirmed_by),
    note: asNullableString(row.note),
  }
}

function mapEvidence(value: unknown): ConsultingJourneyEvidence {
  const row = asRecord(value)
  const statusMap: Record<string, EvidenceStatus> = {
    pendente: 'pending', enviada: 'sent', em_analise: 'under_review', aprovada: 'approved', devolvida: 'returned', substituida: 'replaced',
  }
  return {
    id: asString(row.id),
    visitId: asString(row.visitId ?? row.visit_id ?? row.visita_id),
    type: asString(row.type ?? row.tipo, 'documento'),
    name: asNullableString(row.name ?? row.nome_arquivo),
    storagePath: asNullableString(row.storagePath ?? row.caminho_storage),
    externalUrl: asNullableString(row.externalUrl ?? row.url_externa),
    textContent: asNullableString(row.textContent ?? row.texto_conteudo),
    status: statusMap[asString(row.status)] || 'sent',
    feedback: asNullableString(row.feedback ?? row.devolutiva),
    createdAt: asString(row.createdAt ?? row.created_at),
    updatedAt: asNullableString(row.updatedAt ?? row.updated_at),
  }
}

function mapAnticipation(value: unknown): ConsultingAnticipation | null {
  if (!value || typeof value !== 'object') return null
  const row = asRecord(value)
  const id = asString(row.id)
  if (!id) return null
  return {
    id,
    visitId: asString(row.visitId ?? row.visit_id),
    status: asString(row.status, 'under_review') as AnticipationStatus,
    reason: asString(row.reason),
    preferredDates: asArray(row.preferredDates ?? row.preferred_dates),
    eligibilitySnapshot: asRecord(row.eligibilitySnapshot ?? row.eligibility_snapshot),
    requestedBy: asString(row.requestedBy ?? row.requested_by),
    reviewedBy: asNullableString(row.reviewedBy ?? row.reviewed_by),
    reviewedAt: asNullableString(row.reviewedAt ?? row.reviewed_at),
    reviewNote: asNullableString(row.reviewNote ?? row.review_note),
    createdAt: asString(row.createdAt ?? row.created_at),
    updatedAt: asString(row.updatedAt ?? row.updated_at),
  }
}

function mapVisit(value: unknown): ConsultingJourneyVisit {
  const row = asRecord(value)
  return {
    id: asString(row.id),
    visitNumber: asNumber(row.visitNumber ?? row.visit_number),
    scheduledAt: asNullableString(row.scheduledAt ?? row.scheduled_at),
    status: asString(row.status),
    objective: asNullableString(row.objective),
    googleMeetLink: asNullableString(row.googleMeetLink ?? row.google_meet_link),
    materials: asArray(row.materials ?? row.materiais).map(item => asRecord(item) as ConsultingMaterial),
    lesson: mapLesson(row.lesson),
    lessonProgress: mapLessonProgress(row.lessonProgress ?? row.lesson_progress),
    deliveryItems: asArray(row.deliveryItems ?? row.delivery_items).map(mapDeliveryItem),
    participants: asArray(row.participants).map(mapParticipant),
    evidences: asArray(row.evidences).map(mapEvidence),
    anticipation: mapAnticipation(row.anticipation),
  }
}

export function mapConsultingJourneySnapshot(value: unknown): ConsultingJourneySnapshot | null {
  if (!value || typeof value !== 'object') return null
  const row = asRecord(value)
  const clientId = asString(row.clientId ?? row.client_id)
  const storeId = asString(row.storeId ?? row.store_id)
  if (!clientId || !storeId) return null
  return {
    clientId,
    storeId,
    programKey: asString(row.programKey ?? row.program_key, 'pmr'),
    programName: asString(row.programName ?? row.program_name, 'Consultoria'),
    programRules: {
      label: asString(asRecord(row.programRules ?? row.program_rules).label, asString(row.programName ?? row.program_name, 'Consultoria')),
      description: asString(asRecord(row.programRules ?? row.program_rules).description, 'Jornada de Consultoria contratada.'),
    },
    confidentialityLevel: asString(row.confidentialityLevel ?? row.confidentiality_level, 'standard'),
    clientStatus: asString(row.clientStatus ?? row.client_status),
    visitsCompleted: asNumber(row.visitsCompleted ?? row.visits_completed),
    totalVisits: asNumber(row.totalVisits ?? row.total_visits),
    nextVisitNumber: row.nextVisitNumber == null && row.next_visit_number == null ? null : asNumber(row.nextVisitNumber ?? row.next_visit_number),
    nextStep: asString(row.nextStep ?? row.next_step, 'Acompanhar a jornada'),
    canViewStrategicContent: row.canViewStrategicContent !== false && row.can_view_strategic_content !== false,
    visits: asArray(row.visits).map(mapVisit),
  }
}

function sanitizeFilename(name: string): string {
  const normalized = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  return normalized.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'evidencia'
}

function evidenceTypeForFile(file: File): string {
  if (file.type.startsWith('image/')) return 'foto'
  if (file.type === 'application/pdf') return 'pdf'
  if (file.name.toLocaleLowerCase('pt-BR').endsWith('.xlsx') || file.name.toLocaleLowerCase('pt-BR').endsWith('.xls')) return 'planilha'
  return 'documento'
}

export function createConsultingJourneyRepository(client: ConsultingClient = supabase as unknown as ConsultingClient): ConsultingJourneyRepository {
  const rpc = async (name: string, args: Record<string, unknown>, fallback: string): Promise<unknown> => {
    const { data, error } = await client.rpc(name, args)
    throwRpc(error, fallback)
    return data
  }

  const registerEvidence = (input: RegisterEvidenceInput) => rpc('registrar_evidencia_consultoria', {
    p_visit_id: input.visitId,
    p_type: input.type,
    p_name: input.name ?? null,
    p_storage_path: input.storagePath ?? null,
    p_external_url: input.externalUrl ?? null,
    p_text_content: input.textContent ?? null,
    p_note: input.note ?? null,
    p_previous_id: input.previousId ?? null,
  }, 'Não foi possível registrar a evidência.')

  return {
    async load(storeId) {
      const data = await rpc('get_consultoria_jornada_loja', { p_store_id: storeId }, 'Não foi possível carregar a Consultoria.')
      return mapConsultingJourneySnapshot(data)
    },
    saveLessonProgress(input: SaveLessonProgressInput) {
      return rpc('salvar_progresso_aula_consultoria', {
        p_store_id: input.storeId,
        p_client_id: input.clientId,
        p_visit_id: input.visitId,
        p_lesson_id: input.lessonId,
        p_position_seconds: Math.max(0, Math.round(input.positionSeconds)),
        p_duration_seconds: Math.max(0, Math.round(input.durationSeconds)),
        p_played_delta_seconds: Math.max(0, Math.round(input.playedDeltaSeconds)),
      }, 'Não foi possível salvar o progresso da aula.')
    },
    updateDeliveryItem(itemId, status, note = null) {
      const dbStatus = { pending: 'pending', in_progress: 'in_progress', completed: 'completed', reopened: 'reopened' }[status]
      return rpc('atualizar_item_entrega_consultoria', { p_item_id: itemId, p_status: dbStatus, p_note: note }, 'Não foi possível atualizar a Entrega.')
    },
    confirmParticipant(participantId, confirmed, note = null) {
      return rpc('confirmar_participante_consultoria', { p_participant_id: participantId, p_confirmed: confirmed, p_note: note }, 'Não foi possível confirmar o participante.')
    },
    requestAnticipation(visitId, reason, preferredDates = []) {
      return rpc('solicitar_antecipacao_consultoria', { p_visit_id: visitId, p_reason: reason, p_preferred_dates: preferredDates }, 'Não foi possível solicitar a antecipação.')
    },
    reviewAnticipation(requestId, status, note = null) {
      return rpc('revisar_antecipacao_consultoria', { p_request_id: requestId, p_status: status, p_note: note }, 'Não foi possível revisar a antecipação.')
    },
    cancelAnticipation(requestId, note = null) {
      return rpc('cancelar_antecipacao_consultoria', { p_request_id: requestId, p_note: note }, 'Não foi possível cancelar a antecipação.')
    },
    registerEvidence,
    async uploadEvidence(input: UploadEvidenceInput) {
      const path = `${input.storeId}/${input.clientId}/${input.visitId}/${crypto.randomUUID()}-${sanitizeFilename(input.file.name)}`
      const bucket = client.storage.from('evidencias-consultoria')
      const uploaded = await bucket.upload(path, input.file, { contentType: input.file.type || 'application/octet-stream', upsert: false })
      throwRpc(uploaded.error, 'Não foi possível enviar a evidência.')
      const storedPath = uploaded.data?.path || path
      try {
        return await registerEvidence({
          visitId: input.visitId,
          type: evidenceTypeForFile(input.file),
          name: input.file.name,
          storagePath: storedPath,
          note: input.note,
          previousId: input.previousId,
        })
      } catch (cause) {
        await bucket.remove([storedPath])
        throw cause
      }
    },
    reviewEvidence(evidenceId, status, feedback = null) {
      const dbStatus = { under_review: 'em_analise', approved: 'aprovada', returned: 'devolvida' }[status]
      return rpc('revisar_evidencia_consultoria', { p_evidence_id: evidenceId, p_status: dbStatus, p_feedback: feedback }, 'Não foi possível revisar a evidência.')
    },
  }
}

export const consultingJourneyRepository = createConsultingJourneyRepository()
