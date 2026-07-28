import type {
  AnticipationEligibility,
  AnticipationEligibilityInput,
  ConsultingDeliveryItem,
  LessonProgressInput,
  PpaVisibilityInput,
} from './consultingJourney.types'
import type { PlanningRole } from '@/features/planning-workspace/planningWorkspace.types'

export function calculateLessonProgress({ playedSeconds, durationSeconds }: LessonProgressInput): {
  percentage: number
  completed: boolean
} {
  const safeDuration = Math.max(0, Number(durationSeconds) || 0)
  const safePlayed = Math.max(0, Math.min(Number(playedSeconds) || 0, safeDuration || Number.MAX_SAFE_INTEGER))
  const ratio = safeDuration > 0 ? safePlayed / safeDuration : 0
  const percentage = Math.min(100, Math.round(ratio * 100))
  return { percentage, completed: safeDuration > 0 && ratio >= 0.9 }
}

export function calculateEffectivePlayedDelta({
  previousPosition,
  currentPosition,
  elapsedSeconds,
  playing,
}: {
  previousPosition: number
  currentPosition: number
  elapsedSeconds: number
  playing: boolean
}): number {
  if (!playing) return 0
  const elapsed = Math.max(0, Number(elapsedSeconds) || 0)
  const positionDelta = Number(currentPosition) - Number(previousPosition)
  if (positionDelta < -1 || positionDelta > elapsed + 2) return 0
  return Math.max(0, Math.min(elapsed, positionDelta + 0.5))
}

export function calculateDeliveryProgress(items: Array<Pick<ConsultingDeliveryItem, 'required' | 'status'>>): {
  completedRequired: number
  totalRequired: number
  percentage: number
} {
  const required = items.filter(item => item.required)
  const completedRequired = required.filter(item => item.status === 'completed').length
  return {
    completedRequired,
    totalRequired: required.length,
    percentage: required.length ? Math.round((completedRequired / required.length) * 100) : 100,
  }
}

export function getAnticipationEligibility(input: AnticipationEligibilityInput): AnticipationEligibility {
  if (input.internalOverride) return { eligible: true, blockers: [] }
  const blockers: string[] = []
  if (!input.isNextVisit) blockers.push('Somente o próximo encontro pode ser antecipado')
  if (!input.requiredLessonsComplete) blockers.push('Aula obrigatória pendente')
  if (!input.requiredDeliveryComplete) blockers.push('Item obrigatório da Entrega pendente')
  if (!input.requiredParticipantsConfirmed) blockers.push('Participantes obrigatórios sem confirmação')
  if (!input.requiredEvidenceComplete) blockers.push('Evidência obrigatória pendente')
  if (input.hasActiveRequest) blockers.push('Já existe uma solicitação em análise')
  return { eligible: blockers.length === 0, blockers }
}

export function canReviewAnticipation(role: PlanningRole): boolean {
  return role === 'administrador_geral' || role === 'administrador_mx' || role === 'consultor_mx'
}

export function canViewPpaContent({ role, programKey }: PpaVisibilityInput): boolean {
  if (String(programKey).toLocaleLowerCase('pt-BR') !== 'ppa') return true
  return role === 'dono' || role === 'administrador_geral' || role === 'administrador_mx' || role === 'consultor_mx'
}
