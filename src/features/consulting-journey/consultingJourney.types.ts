import type { PlanningRole } from '@/features/planning-workspace/planningWorkspace.types'

export type ConsultingProgramKey = 'pmr' | 'pmr_plus' | 'ppa' | string
export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed'
export type DeliveryItemStatus = 'pending' | 'in_progress' | 'completed' | 'reopened'
export type EvidenceStatus = 'pending' | 'sent' | 'under_review' | 'approved' | 'returned' | 'replaced'
export type AnticipationStatus = 'draft' | 'under_review' | 'approved' | 'date_adjustment_requested' | 'rejected' | 'cancelled'

export type LessonProgressInput = {
  playedSeconds: number
  durationSeconds: number
  positionSeconds?: number
}

export type ConsultingLesson = {
  id: string
  title: string
  type: string
  videoUrl: string | null
  content: string | null
  metadata: Record<string, unknown>
}

export type ConsultingLessonProgress = {
  positionSeconds: number
  durationSeconds: number
  playedSeconds: number
  percentage: number
  completedAt: string | null
}

export type ConsultingMaterial = {
  id?: string
  title: string
  type?: string
  url?: string | null
  storagePath?: string | null
  [key: string]: unknown
}

export type ConsultingDeliveryItem = {
  id: string
  clientId: string | null
  storeId: string | null
  visitId: string
  lessonId: string | null
  evidenceId: string | null
  itemType: 'lesson' | 'participant' | 'document' | 'data' | 'material' | 'task' | 'evidence' | string
  sourceKey: string
  title: string
  description: string | null
  required: boolean
  status: DeliveryItemStatus
  responsibleUserId: string | null
  dueAt: string | null
  note: string | null
  sortOrder: number
  completedAt: string | null
  completedBy: string | null
}

export type ConsultingParticipant = {
  id: string
  visitId: string
  participantKey: string
  userId: string | null
  name: string
  roleLabel: string | null
  required: boolean
  confirmed: boolean
  confirmedAt: string | null
  confirmedBy?: string | null
  note: string | null
}

export type AnticipationEligibilityInput = {
  isNextVisit: boolean
  requiredLessonsComplete: boolean
  requiredDeliveryComplete: boolean
  requiredParticipantsConfirmed: boolean
  requiredEvidenceComplete: boolean
  hasActiveRequest: boolean
  internalOverride?: boolean
}

export type AnticipationEligibility = {
  eligible: boolean
  blockers: string[]
}

export type PpaVisibilityInput = {
  role: PlanningRole
  programKey: ConsultingProgramKey
  isAuthorizedPartner?: boolean
}

export type ConsultingJourneyEvidence = {
  id: string
  visitId: string
  type: string
  name: string | null
  storagePath: string | null
  externalUrl: string | null
  textContent: string | null
  status: EvidenceStatus
  feedback: string | null
  createdAt: string
  updatedAt: string | null
}

export type ConsultingAnticipation = {
  id: string
  visitId: string
  status: AnticipationStatus
  reason: string
  preferredDates: unknown[]
  eligibilitySnapshot: Record<string, unknown>
  requestedBy: string
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdAt: string
  updatedAt: string
}

export type ConsultingJourneyVisit = {
  id: string
  visitNumber: number
  scheduledAt: string | null
  status: string
  objective: string | null
  googleMeetLink: string | null
  materials: ConsultingMaterial[]
  lesson: ConsultingLesson | null
  lessonProgress: ConsultingLessonProgress | null
  deliveryItems: ConsultingDeliveryItem[]
  participants: ConsultingParticipant[]
  evidences: ConsultingJourneyEvidence[]
  anticipation: ConsultingAnticipation | null
}

export type ConsultingProgramRules = { label: string; description: string }

export type ConsultingJourneySnapshot = {
  clientId: string
  storeId: string
  programKey: ConsultingProgramKey
  programName: string
  programRules: ConsultingProgramRules
  confidentialityLevel: 'standard' | 'restricted' | string
  clientStatus: string
  visitsCompleted: number
  totalVisits: number
  nextVisitNumber: number | null
  nextStep: string
  visits: ConsultingJourneyVisit[]
  canViewStrategicContent: boolean
}

export type SaveLessonProgressInput = {
  storeId: string
  clientId: string
  visitId: string
  lessonId: string
  positionSeconds: number
  durationSeconds: number
  playedDeltaSeconds: number
}

export type RegisterEvidenceInput = {
  visitId: string
  type: string
  name?: string | null
  storagePath?: string | null
  externalUrl?: string | null
  textContent?: string | null
  note?: string | null
  previousId?: string | null
}

export type UploadEvidenceInput = {
  storeId: string
  clientId: string
  visitId: string
  file: File
  note?: string | null
  previousId?: string | null
}

export type ConsultingJourneyRepository = {
  load(storeId: string): Promise<ConsultingJourneySnapshot | null>
  saveLessonProgress(input: SaveLessonProgressInput): Promise<unknown>
  updateDeliveryItem(itemId: string, status: DeliveryItemStatus, note?: string | null): Promise<unknown>
  confirmParticipant(participantId: string, confirmed: boolean, note?: string | null): Promise<unknown>
  requestAnticipation(visitId: string, reason: string, preferredDates?: unknown[]): Promise<unknown>
  reviewAnticipation(requestId: string, status: Extract<AnticipationStatus, 'approved' | 'date_adjustment_requested' | 'rejected'>, note?: string | null): Promise<unknown>
  cancelAnticipation(requestId: string, note?: string | null): Promise<unknown>
  registerEvidence(input: RegisterEvidenceInput): Promise<unknown>
  uploadEvidence(input: UploadEvidenceInput): Promise<unknown>
  reviewEvidence(evidenceId: string, status: Extract<EvidenceStatus, 'under_review' | 'approved' | 'returned'>, feedback?: string | null): Promise<unknown>
}
