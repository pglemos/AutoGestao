import { describe, expect, test } from 'bun:test'
import { createNetworkCockpitRepository } from './networkCockpitRepository'

const payload = { period: { start: '2026-07-01', end: '2026-07-31' }, stores: [{
  id: 'store-1', name: 'Loja 1', sales: 8, leads: 20, agd: 10, vis: 6, goal: 10, projectedSales: 12,
  sellerCount: 2, checkedInToday: 1, pendingClosures: 1, disciplinePct: 60,
  actions: { total: 4, completed: 1, overdue: 2, blocked: 1, awaitingValidation: 1 },
  strategic: { completed: 20, total: 45 },
  consulting: { completed: 2, total: 7, deliveryCompleted: 3, deliveryTotal: 5, evidencePending: 1, participantsPending: 1 },
  sellersEvolution: [], managersEvolution: [], ownerEvolution: null,
  sources: { operational: 'get_resumo_rede_periodo' },
}] }

describe('networkCockpitRepository', () => {
  test('mapeia diagnóstico, progresso e riscos rastreáveis', async () => {
    const repository = createNetworkCockpitRepository({ rpc: async () => ({ data: payload, error: null }) })
    const result = await repository.load({ start: '2026-07-01', end: '2026-07-31' })
    expect(result[0]).toMatchObject({ id: 'store-1', gap: 2, proj: 12, ritmo: 120, efficiency: 50, pendingClosures: 1 })
    expect(result[0].strategicProgress).toMatchObject({ value: 20, universe: 45, percentage: 44 })
    expect(result[0].riskReasons).toContain('2 ações atrasadas')
  })
})
