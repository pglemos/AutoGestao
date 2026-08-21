import { describe, expect, test } from 'bun:test'
import {
  getPmrVisitDisplayLabel,
  isPmrFollowUpVisitNumber,
  isPmrMainCycleVisitNumber,
  isPmrSchedulableVisitNumber,
  nextPmrVisitNumber,
  pmrVisitRangeMessage,
  resolveProgramTotalVisits,
  PMR_FOLLOW_UP_VISIT,
  PMR_MAIN_VISITS_MAX,
} from './pmr-visit-rules'

describe('pmr visit rules', () => {
  test('keeps the main PMR cycle limited to visits 1 to 7', () => {
    expect(PMR_MAIN_VISITS_MAX).toBe(7)
    expect(isPmrMainCycleVisitNumber(1)).toBe(true)
    expect(isPmrMainCycleVisitNumber(7)).toBe(true)
    expect(isPmrMainCycleVisitNumber(8)).toBe(false)
  })

  test('allows visit 8 only as monthly follow-up', () => {
    expect(PMR_FOLLOW_UP_VISIT).toBe(8)
    expect(isPmrFollowUpVisitNumber(8)).toBe(true)
    expect(isPmrSchedulableVisitNumber(8)).toBe(true)
    expect(isPmrSchedulableVisitNumber(9)).toBe(false)
  })

  test('preserves visits 8 and 9 in an explicit PMR 9 journey', () => {
    expect(isPmrMainCycleVisitNumber(8, 9)).toBe(true)
    expect(isPmrSchedulableVisitNumber(9, 9)).toBe(true)
    expect(isPmrFollowUpVisitNumber(8, 9)).toBe(false)
    expect(getPmrVisitDisplayLabel(8, 9)).toBe('Visita 8/9')
    expect(getPmrVisitDisplayLabel(9, 9)).toBe('Visita 9/9')
  })

  test('labels follow-up without showing 8/7', () => {
    expect(getPmrVisitDisplayLabel(3)).toBe('Visita 3/7')
    expect(getPmrVisitDisplayLabel(8)).toBe('Acompanhamento Mensal')
  })

  test('resolves the contracted program total', () => {
    const totals = { pmr_9: 9, pmr_hibrido: 12 }
    expect(resolveProgramTotalVisits('pmr_9', totals)).toBe(9)
    expect(resolveProgramTotalVisits('pmr_hibrido', totals)).toBe(12)
    expect(resolveProgramTotalVisits('unknown', totals)).toBeUndefined()
  })

  test('suggests every contracted visit before monthly follow-up', () => {
    expect(nextPmrVisitNumber(7, 9)).toBe(8)
    expect(nextPmrVisitNumber(8, 9)).toBe(9)
    expect(nextPmrVisitNumber(9, 9)).toBe(10)
    expect(isPmrFollowUpVisitNumber(10, 9)).toBe(true)
    expect(getPmrVisitDisplayLabel(10, 9)).toBe('Acompanhamento Mensal')
    expect(nextPmrVisitNumber(11, 12)).toBe(12)
  })

  test('describes the real validation range', () => {
    expect(pmrVisitRangeMessage(12)).toContain('1 a 12')
    expect(pmrVisitRangeMessage()).toContain('1 a 7')
  })
})
