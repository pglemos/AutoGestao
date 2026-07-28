import { expect, test } from 'bun:test'
import { createStrategicPlanLiveSource } from './strategicPlanRepositoryAdapter'

function queryResult(data: unknown) {
  const result = { data, error: null }
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    order: () => query,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(result)),
  }
  return query
}

test('traduz o ID visual SP para o código canônico do catálogo', async () => {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = []
  const history = [{ id: 'h1', indicator_code: 'sales_volume', year: 2026, previous_values: [], new_values: [], note: null, changed_by: null, created_at: '2026-01-01' }]
  const client = {
    from(table: string) { return queryResult(table.includes('historico') ? history : []) },
    async rpc(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args })
      return { data: {}, error: null }
    },
  }
  const series = {
    id: 'SP-001', code: 'SP-001', metricCode: 'sales_volume', name: 'Vendas', area: 'Vendas',
    direction: 'increase', targetValues: Array(12).fill(null), currentValues: Array(12).fill(null), previousYearValues: Array(12).fill(null),
  }
  const legacy = {
    async load() {}, getOverviewData: () => [series], getPreferences: () => ({}), setPreferences() {},
    getActionItems: () => [],
  }
  const source = createStrategicPlanLiveSource({ client: client as never, legacyRepository: legacy })
  await source.load({ storeId: 'store-1', year: 2026 })
  expect(source.getTargetHistory('SP-001', 2026)).toHaveLength(1)
  await source.updateTargets('SP-001', 2026, Array(12).fill(10))
  expect(rpcCalls[0].args.p_indicator_code).toBe('sales_volume')
})
