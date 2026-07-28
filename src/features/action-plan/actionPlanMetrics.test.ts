import { describe, expect, test } from 'bun:test'
import { applyExecutiveCardFilter, calculateActionPlanMetrics, isActionLate } from './actionPlanMetrics'
import type { ActionPlanItem } from './actionPlan.types'

const action = (id: string, status: ActionPlanItem['status'], dueDate: string | null): ActionPlanItem => ({
  id,
  code: id,
  title: id,
  status,
  dueDate,
  progress: status === 'completed' ? 100 : 0,
  priority: 'medium',
  updatedAt: '2026-07-27T12:00:00-03:00',
})

describe('actionPlanMetrics', () => {
  test('calcula os cinco cards e ignora canceladas no total', () => {
    const metrics = calculateActionPlanMetrics([
      action('a', 'not_started', '28/07/2026'),
      action('b', 'in_progress', '26/07/2026'),
      action('c', 'completed', '20/07/2026'),
      action('d', 'cancelled', '20/07/2026'),
      action('legacy', 'late', '25/07/2026'),
    ], new Date('2026-07-27T12:00:00-03:00'))

    expect(metrics).toEqual({ total: 4, notStarted: 2, late: 2, inProgress: 1, completed: 1 })
  })

  test('atraso é derivado por data e exclui concluídas e canceladas', () => {
    const now = new Date('2026-07-27T12:00:00-03:00')
    expect(isActionLate(action('a', 'in_progress', '26/07/2026'), now)).toBe(true)
    expect(isActionLate(action('b', 'completed', '26/07/2026'), now)).toBe(false)
    expect(isActionLate(action('c', 'cancelled', '26/07/2026'), now)).toBe(false)
    expect(isActionLate(action('d', 'not_started', '27/07/2026'), now)).toBe(false)
  })

  test('card executivo funciona como filtro alternável', () => {
    expect(applyExecutiveCardFilter('late', null)).toEqual({
      activeCard: 'late',
      patch: { display: 'late', status: undefined },
    })
    expect(applyExecutiveCardFilter('late', 'late')).toEqual({
      activeCard: null,
      patch: { display: undefined, status: undefined },
    })
    expect(applyExecutiveCardFilter('total', null)).toEqual({
      activeCard: 'total',
      patch: { display: undefined, status: undefined },
    })
  })
})
