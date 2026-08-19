import { describe, expect, test } from 'bun:test'
import {
  formatVisitAnalysisPeriodLabel,
  getVisitAnalysisPeriodFromPreset,
  isValidVisitAnalysisPeriod,
} from './visit-analysis-period'

describe('visit analysis period', () => {
  const referenceDate = new Date('2026-05-15T12:00:00-03:00')

  test('builds current and previous month presets', () => {
    expect(getVisitAnalysisPeriodFromPreset('current_month', referenceDate)).toEqual({
      start: '2026-05-01',
      end: '2026-05-31',
    })
    expect(getVisitAnalysisPeriodFromPreset('previous_month', referenceDate)).toEqual({
      start: '2026-04-01',
      end: '2026-04-30',
    })
  })

  test('builds quarter presets', () => {
    expect(getVisitAnalysisPeriodFromPreset('current_quarter', referenceDate)).toEqual({
      start: '2026-04-01',
      end: '2026-06-30',
    })
    expect(getVisitAnalysisPeriodFromPreset('previous_quarter', referenceDate)).toEqual({
      start: '2026-01-01',
      end: '2026-03-31',
    })
  })

  test('validates custom periods', () => {
    expect(isValidVisitAnalysisPeriod('2026-04-01', '2026-04-30')).toBe(true)
    expect(isValidVisitAnalysisPeriod('2026-04-30', '2026-04-01')).toBe(false)
    expect(isValidVisitAnalysisPeriod('', '')).toBe(true)
  })

  test('formats report fallback and selected period', () => {
    expect(formatVisitAnalysisPeriodLabel({})).toBe('Período não informado')
    expect(formatVisitAnalysisPeriodLabel({
      preset: 'previous_month',
      start: '2026-04-01',
      end: '2026-04-30',
    })).toBe('Mês anterior: 2026-04-01 a 2026-04-30')
  })
})
