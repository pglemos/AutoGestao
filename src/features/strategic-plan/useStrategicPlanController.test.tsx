import '@happy-dom/global-registrator/register'
import { describe, expect, test } from 'bun:test'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { PlanningWorkspaceProvider } from '@/features/planning-workspace'
import type { StrategicPlanRepository, StrategicSeries } from './strategicPlan.types'
import { useStrategicPlanController } from './useStrategicPlanController'

const actor = { id: 'admin-1', name: 'Admin MX', email: null, role: 'administrador_mx' as const }
const noRealtime = () => ({ status: 'connected' as const })

describe('useStrategicPlanController', () => {
  test('não consulta sem loja selecionada', async () => {
    const repository = fakeRepository()
    const { result } = renderStrategicController({ storeId: null, repository })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(repository.loadCalls).toEqual([])
    expect(result.current.series).toEqual([])
  })

  test('carrega a loja do workspace e preserva 45 indicadores', async () => {
    const repository = fakeRepository(45)
    const { result } = renderStrategicController({ storeId: 'store-1', repository })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(repository.loadCalls).toEqual([{ storeId: 'store-1', year: 2026 }])
    expect(result.current.series).toHaveLength(45)
  })
})

function renderStrategicController({ storeId, repository }: {
  storeId: string | null
  repository: ReturnType<typeof fakeRepository>
}) {
  const wrapper = ({ children }: PropsWithChildren) => (
    <PlanningWorkspaceProvider shell="internal" storeId={storeId} actor={actor}>
      {children}
    </PlanningWorkspaceProvider>
  )
  return renderHook(() => useStrategicPlanController({
    repository,
    year: 2026,
    useRealtime: noRealtime,
  }), { wrapper })
}

function fakeRepository(count = 1): StrategicPlanRepository & {
  loadCalls: Array<{ storeId: string | null; year: number }>
} {
  const rows: StrategicSeries[] = Array.from({ length: count }, (_, index) => ({
    id: `SP-${String(index + 1).padStart(3, '0')}`,
    code: `SP-${String(index + 1).padStart(3, '0')}`,
    name: `Indicador ${index + 1}`,
    area: 'Vendas',
    direction: 'increase',
    targetValues: Array(12).fill(10),
    currentValues: Array(12).fill(8),
    previousYearValues: Array(12).fill(7),
  }))
  const loadCalls: Array<{ storeId: string | null; year: number }> = []
  return {
    loadCalls,
    async load(input) { loadCalls.push(input) },
    getOverviewData: () => rows,
    getIndicatorById: id => rows.find(item => item.id === id) || null,
    getIndicatorSeries: id => rows.find(item => item.id === id) || null,
    getActionItems: () => [],
    getTargetHistory: () => [],
    restoreHistoryVersion: async () => undefined,
    getPreferences: () => ({}),
    setPreferences: () => undefined,
    updateTargets: async () => undefined,
    createActionItem: async () => null,
    exportIndicatorData: () => '',
    exportOverviewData: () => '',
  }
}
