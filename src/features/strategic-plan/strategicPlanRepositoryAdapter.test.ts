import { describe, expect, test } from 'bun:test'
import { createStrategicPlanRepositoryAdapter } from './strategicPlanRepositoryAdapter'

const series = {
  id: 'SP-001', code: 'SP-001', name: 'Vendas', area: 'Vendas', direction: 'increase',
  targetValues: Array(12).fill(10), currentValues: Array(12).fill(8), previousYearValues: Array(12).fill(7),
}

describe('strategicPlanRepositoryAdapter', () => {
  test('expõe leitura e mutações no mesmo contrato', async () => {
    const source = {
      load: async () => undefined,
      getOverviewData: () => [series],
      getIndicatorById: () => series,
      getIndicatorSeries: () => series,
      getActionItems: () => [],
      getTargetHistory: () => [],
      restoreHistoryVersion: async () => undefined,
      getPreferences: () => ({}),
      setPreferences: () => undefined,
      updateTargets: async () => undefined,
      createActionItem: async () => ({ id: 'action-1' }),
      exportIndicatorData: () => 'month,target,current\nJan,10,8',
      exportOverviewData: () => 'code,name\nSP-001,Vendas',
    }
    const adapter = createStrategicPlanRepositoryAdapter(source)
    expect(adapter.getOverviewData()[0].currentValues).toHaveLength(12)
    await expect(adapter.updateTargets('SP-001', 2026, Array(12).fill(12))).resolves.toBeUndefined()
    await expect(adapter.createActionItem({ indicatorId: 'SP-001', action: 'Recuperar vendas' })).resolves.toEqual({ id: 'action-1' })
    expect(adapter.exportIndicatorData('SP-001', 2026)).toContain('month,target,current')
  })

  test('serializa carregamentos para preservar a última loja', async () => {
    const order: string[] = []
    const source = {
      load: async ({ storeId }: { storeId: string | null }) => { order.push(`start:${storeId}`); await new Promise(resolve => setTimeout(resolve, storeId === 'A' ? 8 : 1)); order.push(`end:${storeId}`) },
      getOverviewData: () => [series], getIndicatorById: () => series, getIndicatorSeries: () => series,
      getActionItems: () => [], getTargetHistory: () => [], restoreHistoryVersion: async () => undefined,
      getPreferences: () => ({}), setPreferences: () => undefined, updateTargets: async () => undefined,
      createActionItem: async () => null, exportIndicatorData: () => '', exportOverviewData: () => '',
    }
    const adapter = createStrategicPlanRepositoryAdapter(source)
    await Promise.all([adapter.load({ storeId: 'A', year: 2026 }), adapter.load({ storeId: 'B', year: 2026 })])
    expect(order).toEqual(['start:A', 'end:A', 'start:B', 'end:B'])
  })
})
