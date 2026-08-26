import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { buildCentralMxEngine, type CentralMxEngineInput } from './central-mx-engine'

/**
 * O cockpit do Dono exibia metas de negócio cravadas no código — margem-alvo de
 * 18%, estoque acima de 90 dias com alvo 0, custo fixo 25%, turnover 5% — como
 * se fossem a meta do plano estratégico dele. Pior: divergiam da metodologia,
 * que define `STOCK_MARGIN_RATE = 0.20` em `parametros_estrategicos_mx`.
 *
 * A regra passa a ser: meta de negócio vem do parâmetro da MX; sem parâmetro, o
 * indicador fica sem meta. Meta ausente é honesta, meta inventada não é.
 */
const baseInput: CentralMxEngineInput = {
  storeId: 'loja-1',
  storeName: 'Loja Teste',
  period: '2026-08',
  metrics: {
    totalSales: 10, totalLeads: 100, totalAgd: 30, totalVis: 20,
    attainment: 80, goalValue: 12, checkedInCount: 3, sellerCount: 4,
  },
  funnel: { leadToSchedule: 30, scheduleToVisit: 60, visitToSale: 50 },
  benchmarks: { leadToSchedule: 20, scheduleToVisit: 33, visitToSale: 40 },
}

function metaDe(result: ReturnType<typeof buildCentralMxEngine>, code: string) {
  return result.planningIndicators.find(item => item.code === code)?.meta ?? null
}

describe('metas do cockpit não são inventadas', () => {
  test('sem parâmetros da MX, os indicadores de negócio ficam sem meta', () => {
    const engine = buildCentralMxEngine(baseInput)
    for (const code of [
      'average_vehicle_margin',
      'gross_margin_pct',
      'inventory_over_90_days',
      'seller_ranking_spread',
      'digital_leads_share',
      'fixed_cost_ratio',
      'turnover_rate',
      'preparation_cycle_days',
    ]) {
      expect(metaDe(engine, code)).toBeNull()
    }
  })

  test('com os parâmetros da MX, a meta é a da metodologia', () => {
    const engine = buildCentralMxEngine({
      ...baseInput,
      strategicParameters: { STOCK_MARGIN_RATE: 0.2, OVER_90_STOCK_RATE: 0.15 },
    })
    // Parâmetro é fração; o cockpit exibe pontos percentuais.
    expect(metaDe(engine, 'average_vehicle_margin')).toBe(20)
    expect(metaDe(engine, 'gross_margin_pct')).toBe(20)
    expect(metaDe(engine, 'inventory_over_90_days')).toBe(15)
  })

  test('nenhuma meta de negócio volta a ser cravada no motor', () => {
    const src = readFileSync('src/lib/central-mx-engine.ts', 'utf8')
    const corpo = src.slice(src.indexOf('function getBaseValues'))
    // `meta: 100` é o topo da escala de score/conformidade, não alvo de negócio.
    const cravadas = [...corpo.matchAll(/meta:\s*(-?\d+(?:\.\d+)?)/g)]
      .map(m => Number(m[1]))
      .filter(valor => valor !== 100)
    expect(cravadas).toEqual([])
  })

  test('indicadores arquivados na metodologia não voltam ao catálogo', () => {
    const engine = buildCentralMxEngine(baseInput)
    const codes = engine.planningIndicators.map(item => item.code)
    expect(codes).not.toContain('cost_per_lead')
    expect(codes).not.toContain('training_completion_rate')
  })
})
