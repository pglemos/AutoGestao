import { describe, expect, test } from 'bun:test'
import {
  buildAdminStrategicPlanHref,
  openCurrentStrategicPlanHref,
  resolveAdminEditableCycleId,
} from './adminStrategicPlanHref'

describe('adminStrategicPlanHref', () => {
  test('build inclui clientId, cycleId e year', () => {
    const href = buildAdminStrategicPlanHref({
      clientId: 'c1',
      clientSlug: 'ag-automoveis',
      cycleId: 'cycle-1',
      year: 2026,
      storeId: 'store-1',
    })
    expect(href).toContain('/clientes/ag-automoveis/plano-estrategico/2026?')
    expect(href).toContain('clientId=c1')
    expect(href).toContain('cycleId=cycle-1')
    expect(href).toContain('year=2026')
  })

  test('openCurrentStrategicPlanHref é o mesmo builder canônico', () => {
    const input = { clientId: 'c1', cycleId: 'x', year: 2026 }
    expect(openCurrentStrategicPlanHref(input)).toBe(buildAdminStrategicPlanHref(input))
  })

  test('resolveAdminEditableCycleId prefere rascunho em revisão', () => {
    expect(resolveAdminEditableCycleId({
      cycle: { id: 'published' },
      draftCycle: { id: 'draft' },
      revisionInProgress: true,
    })).toBe('draft')
    expect(resolveAdminEditableCycleId({
      cycle: { id: 'published' },
      draftCycle: { id: 'draft' },
      revisionInProgress: false,
    })).toBe('published')
    expect(resolveAdminEditableCycleId(null)).toBeNull()
  })
})
