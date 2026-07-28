import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePlanningRealtime, usePlanningWorkspace } from '@/features/planning-workspace'
import { createConsultingJourneyLoadCoordinator } from './consultingJourneyLoadCoordinator'
import { consultingJourneyRepository } from './consultingJourneyRepository'
import type {
  AnticipationStatus,
  ConsultingJourneyRepository,
  ConsultingJourneySnapshot,
  ConsultingJourneyVisit,
  DeliveryItemStatus,
  EvidenceStatus,
  RegisterEvidenceInput,
  SaveLessonProgressInput,
  UploadEvidenceInput,
} from './consultingJourney.types'

export type ConsultingJourneyController = {
  snapshot: ConsultingJourneySnapshot | null
  visits: ConsultingJourneyVisit[]
  selectedVisit: ConsultingJourneyVisit | null
  selectedVisitId: string | null
  dialogOpen: boolean
  loading: boolean
  mutating: boolean
  error: string | null
  realtimeStatus: 'connecting' | 'connected' | 'degraded'
  canReviewAnticipation: boolean
  canReviewEvidence: boolean
  openVisit(visitId: string): void
  closeVisit(): void
  reload(): Promise<void>
  saveLessonProgress(input: Omit<SaveLessonProgressInput, 'storeId' | 'clientId'>): Promise<unknown>
  updateDeliveryItem(itemId: string, status: DeliveryItemStatus, note?: string | null): Promise<unknown>
  confirmParticipant(participantId: string, confirmed: boolean, note?: string | null): Promise<unknown>
  requestAnticipation(visitId: string, reason: string, preferredDates?: unknown[]): Promise<unknown>
  reviewAnticipation(requestId: string, status: Extract<AnticipationStatus, 'approved' | 'date_adjustment_requested' | 'rejected'>, note?: string | null): Promise<unknown>
  cancelAnticipation(requestId: string, note?: string | null): Promise<unknown>
  registerEvidence(input: RegisterEvidenceInput): Promise<unknown>
  uploadEvidence(input: Omit<UploadEvidenceInput, 'storeId' | 'clientId'>): Promise<unknown>
  reviewEvidence(evidenceId: string, status: Extract<EvidenceStatus, 'under_review' | 'approved' | 'returned'>, feedback?: string | null): Promise<unknown>
}

export function useConsultingJourney(options: { repository?: ConsultingJourneyRepository } = {}): ConsultingJourneyController {
  const repository = options.repository ?? consultingJourneyRepository
  const workspace = usePlanningWorkspace()
  const [snapshot, setSnapshot] = useState<ConsultingJourneySnapshot | null>(null)
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('visit')
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(Boolean(workspace.storeId))
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const coordinator = useMemo(() => createConsultingJourneyLoadCoordinator(
    repository,
    next => { setSnapshot(next); setError(null) },
    cause => { setSnapshot(null); setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a Consultoria.') },
  ), [repository])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      await coordinator.load(workspace.storeId)
    } finally {
      setLoading(false)
    }
  }, [coordinator, workspace.storeId])

  useEffect(() => {
    void reload()
    return () => coordinator.invalidate()
  }, [coordinator, reload])

  const realtime = usePlanningRealtime({ scope: 'consulting', storeId: workspace.storeId, reload })
  const visits = snapshot?.visits ?? []
  const selectedVisit = visits.find(visit => visit.id === selectedVisitId) ?? null

  useEffect(() => {
    if (!selectedVisitId || selectedVisit) return
    setSelectedVisitId(null)
    setDialogOpen(false)
  }, [selectedVisit, selectedVisitId])

  const writeVisitParam = useCallback((visitId: string | null) => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (visitId) url.searchParams.set('visit', visitId)
    else url.searchParams.delete('visit')
    window.history.replaceState({}, '', url)
  }, [])

  const openVisit = useCallback((visitId: string) => {
    setSelectedVisitId(visitId)
    setDialogOpen(true)
    writeVisitParam(visitId)
  }, [writeVisitParam])

  const closeVisit = useCallback(() => {
    setDialogOpen(false)
    setSelectedVisitId(null)
    writeVisitParam(null)
  }, [writeVisitParam])

  useEffect(() => {
    if (selectedVisitId && selectedVisit) setDialogOpen(true)
  }, [selectedVisit, selectedVisitId])

  const perform = useCallback(async <T,>(operation: () => Promise<T>, reloadAfter = true): Promise<T> => {
    setMutating(true)
    try {
      const result = await operation()
      if (reloadAfter) await reload()
      return result
    } finally {
      setMutating(false)
    }
  }, [reload])

  const saveLessonProgress = useCallback((input: Omit<SaveLessonProgressInput, 'storeId' | 'clientId'>) => {
    if (!workspace.storeId || !snapshot?.clientId) return Promise.reject(new Error('Jornada sem loja ou cliente.'))
    return perform(() => repository.saveLessonProgress({ ...input, storeId: workspace.storeId!, clientId: snapshot.clientId }), false)
  }, [perform, repository, snapshot?.clientId, workspace.storeId])

  const updateDeliveryItem = useCallback((itemId: string, status: DeliveryItemStatus, note?: string | null) => (
    perform(() => repository.updateDeliveryItem(itemId, status, note))
  ), [perform, repository])
  const confirmParticipant = useCallback((participantId: string, confirmed: boolean, note?: string | null) => (
    perform(() => repository.confirmParticipant(participantId, confirmed, note))
  ), [perform, repository])
  const requestAnticipation = useCallback((visitId: string, reason: string, preferredDates?: unknown[]) => (
    perform(() => repository.requestAnticipation(visitId, reason, preferredDates))
  ), [perform, repository])
  const reviewAnticipation = useCallback((requestId: string, status: Extract<AnticipationStatus, 'approved' | 'date_adjustment_requested' | 'rejected'>, note?: string | null) => (
    perform(() => repository.reviewAnticipation(requestId, status, note))
  ), [perform, repository])
  const cancelAnticipation = useCallback((requestId: string, note?: string | null) => (
    perform(() => repository.cancelAnticipation(requestId, note))
  ), [perform, repository])
  const registerEvidence = useCallback((input: RegisterEvidenceInput) => perform(() => repository.registerEvidence(input)), [perform, repository])
  const uploadEvidence = useCallback((input: Omit<UploadEvidenceInput, 'storeId' | 'clientId'>) => {
    if (!workspace.storeId || !snapshot?.clientId) return Promise.reject(new Error('Jornada sem loja ou cliente.'))
    return perform(() => repository.uploadEvidence({ ...input, storeId: workspace.storeId!, clientId: snapshot.clientId }))
  }, [perform, repository, snapshot?.clientId, workspace.storeId])
  const reviewEvidence = useCallback((evidenceId: string, status: Extract<EvidenceStatus, 'under_review' | 'approved' | 'returned'>, feedback?: string | null) => (
    perform(() => repository.reviewEvidence(evidenceId, status, feedback))
  ), [perform, repository])

  return {
    snapshot,
    visits,
    selectedVisit,
    selectedVisitId,
    dialogOpen,
    loading,
    mutating,
    error,
    realtimeStatus: realtime.status,
    canReviewAnticipation: workspace.capabilities.canReviewAnticipation,
    canReviewEvidence: workspace.capabilities.canManageConsulting,
    openVisit,
    closeVisit,
    reload,
    saveLessonProgress,
    updateDeliveryItem,
    confirmParticipant,
    requestAnticipation,
    reviewAnticipation,
    cancelAnticipation,
    registerEvidence,
    uploadEvidence,
    reviewEvidence,
  }
}
