import { describe, expect, it, mock } from 'bun:test'
import { getOwnerStrategicPlanViewModel } from './ownerStrategicPlanViewModel'
import * as planCycleRepo from './planCycleRepository'
import * as clientPlanningRepo from './clientPlanningRepository'

describe('getOwnerStrategicPlanViewModel', () => {
  it('retorna estrutura vazia quando não há ciclo no ano', async () => {
    mock.restore()
    mock.module('./planCycleRepository', () => ({
      fetchCurrentCycle: mock(() => Promise.resolve({ cycle: null, error: null })),
    }))

    const result = await getOwnerStrategicPlanViewModel({ clientId: 'c1', year: 2026 })
    expect(result.publishedCycle).toBeNull()
    expect(result.currentCycle).toBeNull()
    expect(result.indicators).toHaveLength(0)
    expect(Object.keys(result.metaValueMap)).toHaveLength(0)
  })

  it('retorna publishedCycle nulo e não expõe metas quando o ciclo está em rascunho', async () => {
    mock.restore()
    mock.module('./planCycleRepository', () => ({
      fetchCurrentCycle: mock(() => Promise.resolve({
        cycle: {
          id: 'cy1',
          client_id: 'c1',
          year: 2026,
          status: 'rascunho',
          version_number: 1,
          package_version_id: null,
          revised_from_id: null,
          published_at: null,
          published_by: null,
          created_at: '2026-08-19T00:00:00Z',
        },
        error: null,
      })),
    }))
    mock.module('./clientPlanningRepository', () => ({
      fetchClientUnits: mock(() => Promise.resolve({
        units: [{ id: 's1', name: 'Loja 1', isMatriz: true, active: true }],
        error: null,
      })),
    }))

    const result = await getOwnerStrategicPlanViewModel({ clientId: 'c1', year: 2026 })
    expect(result.publishedCycle).toBeNull()
    expect(result.currentCycle?.status).toBe('rascunho')
    expect(result.indicators).toHaveLength(0)
    expect(Object.keys(result.metaValueMap)).toHaveLength(0)
  })

  it('consolida metas do cliente quando o ciclo está publicado', async () => {
    mock.restore()
    mock.module('./planCycleRepository', () => ({
      fetchCurrentCycle: mock(() => Promise.resolve({
        cycle: {
          id: 'cy1',
          client_id: 'c1',
          year: 2026,
          status: 'publicado',
          version_number: 1,
          package_version_id: 'pkg-1',
          revised_from_id: null,
          published_at: '2026-08-19T00:00:00Z',
          published_by: 'user-1',
          created_at: '2026-08-19T00:00:00Z',
        },
        error: null,
      })),
    }))
    mock.module('./clientPlanningRepository', () => ({
      fetchClientUnits: mock(() => Promise.resolve({
        units: [
          { id: 's1', name: 'Matriz', isMatriz: true, active: true },
          { id: 's2', name: 'Filial', isMatriz: false, active: true },
        ],
        error: null,
      })),
      fetchClientProductPackage: mock(() => Promise.resolve({
        ok: true,
        resolution: {
          product: { program_key: 'p1', name: 'PMR', status: 'ativo', usa_plano_estrategico: true, indicator_package_version_id: 'pkg-1' },
          packageVersion: { id: 'pkg-1', nome: 'Pacote 1', status: 'publicada', versao: 1, total_indicadores: 1 },
          items: [
            { id: 'i1', version_id: 'pkg-1', metric_key: 'sales_door_flow', label_snapshot: 'Vendas da Porta', area_snapshot: 'comercial', input_mode_snapshot: 'manual', ordem_snapshot: 1, is_required: true, inclusion_reason: null },
          ],
          indicatorCodes: ['sales_door_flow'],
          manualCount: 1,
          calculatedCount: 0,
          departments: ['comercial'],
        },
      })),
      fetchUnitsPlanningValues: mock(() => Promise.resolve({
        rows: [
          { loja_id: 's1', indicator_code: 'sales_door_flow', year: 2026, month: 1, meta: 100, realizado: 80, ano_anterior: 70 },
          { loja_id: 's2', indicator_code: 'sales_door_flow', year: 2026, month: 1, meta: 50, realizado: 40, ano_anterior: 30 },
        ],
        error: null,
      })),
    }))

    const result = await getOwnerStrategicPlanViewModel({ clientId: 'c1', year: 2026, scopeType: 'ALL_STORES' })
    expect(result.publishedCycle).toBeTruthy()
    expect(result.publishedCycle?.status).toBe('publicado')
    expect(result.indicatorCodes).toEqual(['sales_door_flow'])
    // sales_door_flow é aditivo (SUM): 100 + 50 = 150
    expect(result.metaValueMap.sales_door_flow[1]).toBe(150)
    // 80 + 40 = 120
    expect(result.actualValueMap.sales_door_flow[1]).toBe(120)
    // 70 + 30 = 100
    expect(result.previousYearValueMap.sales_door_flow[1]).toBe(100)
  })
})
