import { describe, expect, test } from 'bun:test'
import {
  calculateDeliveryProgress,
  calculateEffectivePlayedDelta,
  calculateLessonProgress,
  canReviewAnticipation,
  canViewPpaContent,
  getAnticipationEligibility,
} from './consultingJourneyRules'

describe('consultingJourneyRules', () => {
  test('conclui aula apenas com 90% efetivamente reproduzidos', () => {
    expect(calculateLessonProgress({ playedSeconds: 540, durationSeconds: 600 })).toEqual({ percentage: 90, completed: true })
    expect(calculateLessonProgress({ playedSeconds: 539, durationSeconds: 600 }).completed).toBe(false)
    expect(calculateLessonProgress({ playedSeconds: 30, durationSeconds: 600, positionSeconds: 590 }).completed).toBe(false)
  })

  test('não contabiliza salto de seek como tempo assistido', () => {
    expect(calculateEffectivePlayedDelta({ previousPosition: 10, currentPosition: 12, elapsedSeconds: 2, playing: true })).toBe(2)
    expect(calculateEffectivePlayedDelta({ previousPosition: 10, currentPosition: 590, elapsedSeconds: 2, playing: true })).toBe(0)
    expect(calculateEffectivePlayedDelta({ previousPosition: 10, currentPosition: 12, elapsedSeconds: 2, playing: false })).toBe(0)
  })

  test('calcula Entrega somente com itens obrigatórios', () => {
    expect(calculateDeliveryProgress([
      { required: true, status: 'completed' },
      { required: true, status: 'pending' },
      { required: false, status: 'pending' },
    ])).toEqual({ completedRequired: 1, totalRequired: 2, percentage: 50 })
  })

  test('antecipação lista pendências objetivas', () => {
    expect(getAnticipationEligibility({
      isNextVisit: true,
      requiredLessonsComplete: false,
      requiredDeliveryComplete: true,
      requiredParticipantsConfirmed: false,
      requiredEvidenceComplete: false,
      hasActiveRequest: false,
    })).toEqual({
      eligible: false,
      blockers: ['Aula obrigatória pendente', 'Participantes obrigatórios sem confirmação', 'Evidência obrigatória pendente'],
    })
  })

  test('somente perfis internos revisam antecipação', () => {
    expect(canReviewAnticipation('consultor_mx')).toBe(true)
    expect(canReviewAnticipation('dono')).toBe(false)
  })

  test('PPA completo não vaza para gerente ou vendedor delegado', () => {
    expect(canViewPpaContent({ role: 'dono', programKey: 'ppa', isAuthorizedPartner: false })).toBe(true)
    expect(canViewPpaContent({ role: 'gerente', programKey: 'ppa', isAuthorizedPartner: true })).toBe(false)
    expect(canViewPpaContent({ role: 'vendedor', programKey: 'ppa', isAuthorizedPartner: true })).toBe(false)
    expect(canViewPpaContent({ role: 'consultor_mx', programKey: 'ppa', isAuthorizedPartner: false })).toBe(true)
  })
})
