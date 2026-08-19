import { describe, expect, test } from 'bun:test'
import {
  blockedMonthsIn,
  getValidMonthsForView,
  isMonthBlocked,
  resolveLastClosedCompetence,
} from './competence'

// 15/07/2026 12:00 em São Paulo (UTC-3).
const emJulho = new Date('2026-07-15T15:00:00Z')
// 10/01/2026 em São Paulo.
const emJaneiro = new Date('2026-01-10T15:00:00Z')

describe('resolveLastClosedCompetence', () => {
  test('mês fechado é o anterior ao corrente', () => {
    const c = resolveLastClosedCompetence(2026, emJulho)
    expect(c.currentMonth).toBe(7)
    expect(c.lastClosedMonth).toBe(6)
    expect(c.lastClosedYear).toBe(2026)
    expect(c.targetActualMonth).toBe(6)
  })

  test('em janeiro o último fechado é dezembro do ano anterior', () => {
    const c = resolveLastClosedCompetence(2026, emJaneiro)
    expect(c.lastClosedMonth).toBe(12)
    expect(c.lastClosedYear).toBe(2025)
    expect(c.actualHasNoClosedMonth).toBe(true)
    expect(c.targetActualMonth).toBeNull()
  })

  test('plano de ano passado tem o ano inteiro fechado', () => {
    const c = resolveLastClosedCompetence(2025, emJulho)
    expect(c.isPlanPastYear).toBe(true)
    expect(c.targetActualMonth).toBe(12)
    expect(c.previousYearYear).toBe(2024)
  })

  test('plano de ano futuro não é corrente nem passado', () => {
    const c = resolveLastClosedCompetence(2027, emJulho)
    expect(c.isPlanCurrentYear).toBe(false)
    expect(c.isPlanPastYear).toBe(false)
    expect(c.targetActualMonth).toBeNull()
  })

  test('usa o fuso de São Paulo, não o do servidor', () => {
    // 01/03/2026 00:30 UTC ainda é 28/02 em São Paulo (UTC-3).
    const c = resolveLastClosedCompetence(2026, new Date('2026-03-01T00:30:00Z'))
    expect(c.currentMonth).toBe(2)
    expect(c.lastClosedMonth).toBe(1)
  })

  test('virada de ano no fuso local muda o ano corrente', () => {
    // 01/01/2027 01:00 UTC ainda é 31/12/2026 em São Paulo.
    const c = resolveLastClosedCompetence(2026, new Date('2027-01-01T01:00:00Z'))
    expect(c.currentYear).toBe(2026)
    expect(c.currentMonth).toBe(12)
    expect(c.isPlanCurrentYear).toBe(true)
  })
})

describe('getValidMonthsForView', () => {
  test('ano corrente libera até o mês anterior', () => {
    const c = resolveLastClosedCompetence(2026, emJulho)
    expect(getValidMonthsForView(2026, 'ACTUAL', c)).toEqual([1, 2, 3, 4, 5, 6])
  })

  test('ano passado libera os doze meses', () => {
    const c = resolveLastClosedCompetence(2025, emJulho)
    expect(getValidMonthsForView(2025, 'ACTUAL', c)).toHaveLength(12)
  })

  test('ano futuro não libera nada', () => {
    const c = resolveLastClosedCompetence(2027, emJulho)
    expect(getValidMonthsForView(2027, 'ACTUAL', c)).toEqual([])
  })

  test('em janeiro o realizado do ano não tem mês algum', () => {
    const c = resolveLastClosedCompetence(2026, emJaneiro)
    expect(getValidMonthsForView(2026, 'ACTUAL', c)).toEqual([])
  })

  test('em janeiro o comparativo do ano anterior ainda tem dezembro', () => {
    const c = resolveLastClosedCompetence(2026, emJaneiro)
    expect(getValidMonthsForView(2026, 'PREVIOUS_YEAR', c)).toEqual([12])
  })
})

describe('isMonthBlocked', () => {
  const c = resolveLastClosedCompetence(2026, emJulho)

  test('mês corrente está bloqueado — ainda não fechou', () => {
    expect(isMonthBlocked(7, 2026, 'ACTUAL', c)).toBe(true)
  })

  test('mês futuro está bloqueado', () => {
    expect(isMonthBlocked(12, 2026, 'ACTUAL', c)).toBe(true)
  })

  test('mês fechado está liberado', () => {
    expect(isMonthBlocked(6, 2026, 'ACTUAL', c)).toBe(false)
    expect(isMonthBlocked(1, 2026, 'ACTUAL', c)).toBe(false)
  })
})

describe('blockedMonthsIn', () => {
  test('aponta quais meses de um lote seriam recusados', () => {
    const c = resolveLastClosedCompetence(2026, emJulho)
    expect(blockedMonthsIn([5, 6, 7, 8], 2026, 'ACTUAL', c)).toEqual([7, 8])
  })

  test('lote inteiro dentro da competência não tem recusa', () => {
    const c = resolveLastClosedCompetence(2026, emJulho)
    expect(blockedMonthsIn([1, 2, 3], 2026, 'ACTUAL', c)).toEqual([])
  })
})
