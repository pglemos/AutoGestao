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
    expect(result[0].dataQuality).toBeUndefined()
  })

  test('preserva zero confirmado e separa ausência de leitura de configuração', async () => {
    const explicitPayload = {
      period: payload.period,
      stores: [
        {
          ...payload.stores[0],
          id: 'store-zero',
          name: 'Loja Zero',
          sales: 0,
          goal: 15,
          projectedSales: 0,
          disciplinePct: 80,
          actions: { total: 0, completed: 0, overdue: 0, blocked: 0, awaitingValidation: 0 },
          dataQuality: { operational: true, goal: true, discipline: true },
        },
        {
          ...payload.stores[0],
          id: 'store-empty',
          name: 'Loja Sem Leitura',
          sales: 0,
          goal: 0,
          projectedSales: 0,
          sellerCount: 2,
          disciplinePct: 0,
          dataQuality: { operational: false, goal: false, discipline: false },
        },
        {
          ...payload.stores[0],
          id: 'store-unknown',
          name: 'Loja Não Confirmada',
          dataQuality: { operational: 'indisponivel', goal: 'indisponivel', discipline: 'indisponivel' },
        },
      ],
    }
    const repository = createNetworkCockpitRepository({ rpc: async () => ({ data: explicitPayload, error: null }) })
    const result = await repository.load({ start: '2026-07-01', end: '2026-07-31' })

    expect(result[0]).toMatchObject({
      dataQuality: { operational: 'available', goal: 'configured', discipline: 'available' },
      sales: 0,
    })
    expect(result[0].riskReasons).not.toContain('Sem dados operacionais no período')
    expect(result[1]).toMatchObject({
      dataQuality: { operational: 'no_data', goal: 'not_configured', discipline: 'no_data' },
      sales: 0,
    })
    expect(result[1].riskReasons).toEqual(expect.arrayContaining([
      'Meta mensal não configurada',
      'Sem dados operacionais no período',
    ]))
    expect(result[2].dataQuality).toEqual({ operational: 'unknown', goal: 'unknown', discipline: 'unknown' })
  })
})
