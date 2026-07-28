import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const source = readFileSync('src/features/action-plan/useActionPlanController.ts', 'utf8')

describe('useActionPlanController contract', () => {
  test('usa contexto compartilhado e Realtime do escopo action', () => {
    expect(source).toContain('usePlanningWorkspace')
    expect(source).toContain("scope: 'action'")
    expect(source).toContain('createActionPlanLoadCoordinator')
  })

  test('expõe métricas, foco, filtros e modo padrão compartilhados', () => {
    expect(source).toContain('calculateActionPlanMetrics')
    expect(source).toContain('buildFocusSections')
    expect(source).toContain('resolveInitialActionPlanMode')
    expect(source).toContain('applyExecutiveCardFilter')
  })

  test('não usa confirmação nativa irreversível', () => {
    expect(source).not.toContain('window.confirm')
  })
})
