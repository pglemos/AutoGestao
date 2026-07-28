import { describe, expect, test } from 'bun:test'
import { buildFocusSections } from './actionPlanFocus'
import type { ActionPlanItem } from './actionPlan.types'

const base = (id: string, overrides: Partial<ActionPlanItem>): ActionPlanItem => ({
  id,
  code: id,
  title: id,
  status: 'not_started',
  dueDate: '31/07/2026',
  progress: 0,
  priority: 'medium',
  updatedAt: '2026-07-27T12:00:00-03:00',
  ...overrides,
})

describe('buildFocusSections', () => {
  test('classifica as cinco seções sem duplicar ação entre seções prioritárias', () => {
    const sections = buildFocusSections([
      base('decision', { status: 'awaiting_decision', requiresOwnerDecision: true }),
      base('late', { status: 'in_progress', dueDate: '25/07/2026', progress: 30 }),
      base('running', { status: 'in_progress', progress: 40 }),
      base('validation', { status: 'awaiting_validation', progress: 100 }),
      base('done', { status: 'completed', completedAt: '2026-07-26T12:00:00-03:00', progress: 100 }),
    ], new Date('2026-07-27T12:00:00-03:00'))

    expect(sections.needsYou.map(item => item.id)).toEqual(['decision'])
    expect(sections.atRisk.map(item => item.id)).toEqual(['late'])
    expect(sections.inExecution.map(item => item.id)).toEqual(['running'])
    expect(sections.awaitingValidation.map(item => item.id)).toEqual(['validation'])
    expect(sections.recentlyCompleted.map(item => item.id)).toEqual(['done'])
  })

  test('considera bloqueio, estagnação, prazo próximo e prioridade crítica como risco', () => {
    const sections = buildFocusSections([
      base('blocked', { status: 'blocked' }),
      base('stale', { status: 'in_progress', updatedAt: '2026-07-18T12:00:00-03:00', progress: 70 }),
      base('soon', { status: 'in_progress', dueDate: '29/07/2026', progress: 20 }),
      base('critical', { status: 'not_started', priority: 'critical' }),
    ], new Date('2026-07-27T12:00:00-03:00'))

    expect(sections.atRisk.map(item => item.id).sort()).toEqual(['blocked', 'critical', 'soon', 'stale'])
  })

  test('limita concluídas recentes a quatro e ordena da mais recente', () => {
    const actions = Array.from({ length: 6 }, (_, index) => base(`done-${index}`, {
      status: 'completed',
      completedAt: `2026-07-${String(20 + index).padStart(2, '0')}T12:00:00-03:00`,
      progress: 100,
    }))
    const sections = buildFocusSections(actions, new Date('2026-07-27T12:00:00-03:00'))
    expect(sections.recentlyCompleted.map(item => item.id)).toEqual(['done-5', 'done-4', 'done-3', 'done-2'])
  })
})
