import { describe, expect, test } from 'bun:test'
import {
  calculateIndicatorAttainment,
  isActualMonthClosed,
  resolveDefaultSelectedMonthIndex,
  seriesValuesForView,
} from './strategicUtils'

const agosto2026 = new Date('2026-08-22T15:00:00Z')

describe('competência da Visão do Dono', () => {
  test('abre no último mês encerrado, não no mês corrente', () => {
    expect(resolveDefaultSelectedMonthIndex(2026, agosto2026)).toBe(6)
    expect(isActualMonthClosed(6, 2026, agosto2026)).toBe(true)
    expect(isActualMonthClosed(7, 2026, agosto2026)).toBe(false)
  })

  test('cards e tabela leem a série da visão selecionada', () => {
    const series = {
      targetValues: [10],
      currentValues: [25],
      previousYearValues: [8],
    }
    expect(seriesValuesForView(series, 'meta')).toEqual([10])
    expect(seriesValuesForView(series, 'realizado')).toEqual([25])
    expect(seriesValuesForView(series, 'ano_anterior')).toEqual([8])
  })

  test('atingimento de Julho MX BH', () => {
    expect(calculateIndicatorAttainment(25, 21)).toBeCloseTo(119.047, 2)
  })
})
