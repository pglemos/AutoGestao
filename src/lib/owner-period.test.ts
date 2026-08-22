import { describe, expect, test } from 'bun:test'
import { computePeriodRange, ownerClosedMonthLabel, resolveOwnerPeriodRange } from './owner-period'

describe('Dono — intervalos do seletor de período', () => {
  const now = new Date(2026, 6, 22, 12, 0, 0)

  test('mês usa a competência fechada (M-1), não o calendário aberto', () => {
    expect(resolveOwnerPeriodRange('month', now)).toEqual({ start: '2026-06-01', end: '2026-06-30' })
  })

  test('trimestre e ano usam o início correto sem deslocamento UTC', () => {
    expect(resolveOwnerPeriodRange('quarter', now)).toEqual({ start: '2026-07-01', end: '2026-07-22' })
    expect(resolveOwnerPeriodRange('year', now)).toEqual({ start: '2026-01-01', end: '2026-07-22' })
  })

  test('período personalizado preserva exatamente as datas informadas', () => {
    expect(resolveOwnerPeriodRange('custom', now, '2026-07-05', '2026-07-10')).toEqual({
      start: '2026-07-05',
      end: '2026-07-10',
    })
  })

  test('intervalo personalizado inválido recua para competência fechada', () => {
    expect(resolveOwnerPeriodRange('custom', now, '2026-07-10', '2026-07-05')).toEqual({
      start: '2026-06-01',
      end: '2026-06-30',
    })
  })

  test('mantém a API de intervalo Date para o hook de dados legado', () => {
    const range = computePeriodRange('quarter', now)
    expect(range.start).toEqual(new Date(2026, 6, 1, 0, 0, 0))
    expect(range.end).toEqual(now)
  })

  test('normaliza o dia antes de recuar o mês no trimestre', () => {
    const range = computePeriodRange('quarter', new Date(2026, 4, 31, 12, 0, 0))
    expect(range.start).toEqual(new Date(2026, 3, 1, 0, 0, 0))
  })

  test('rótulo do mês é a competência fechada', () => {
    expect(ownerClosedMonthLabel(now)).toBe('Junho/2026')
  })
})
