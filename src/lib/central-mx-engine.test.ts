import { describe, expect, test } from 'bun:test'
import {
  CENTRAL_MX_ENGINE_VERSION,
  CENTRAL_MX_PLANNING_INDICATORS,
  buildCentralMxEngine,
} from './central-mx-engine'
import { matchCanonicalIndicator } from '@/features/admin-mx/indicadores/canonicalBase44Catalog'

const baseInput = {
  storeId: 'store-1',
  storeName: 'MX Consultoria',
  period: '2026-05',
  metrics: {
    totalSales: 32,
    totalLeads: 240,
    totalAgd: 35,
    totalVis: 18,
    attainment: 64,
    goalValue: 50,
    checkedInCount: 2,
    sellerCount: 4,
  },
  funnel: {
    leadToSchedule: 14.5,
    scheduleToVisit: 51.4,
    visitToSale: 22.2,
  },
  benchmarks: {
    leadToSchedule: 20,
    scheduleToVisit: 60,
    visitToSale: 33,
  },
  financial: {
    grossProfit: 220000,
    grossMarginPct: 16,
    netProfit: 35000,
    costPerSale: 1200,
  },
  ranking: [
    { userId: 'seller-1', name: 'Vendedor 1', attainment: 80, sales: 8, goal: 10, checkedIn: true },
    { userId: 'seller-2', name: 'Vendedor 2', attainment: 40, sales: 4, goal: 10, checkedIn: false },
  ],
}

describe('central MX engine', () => {
  // O cockpit lista exatamente os 45 indicadores da metodologia. Antes tinha
  // catálogo próprio, com 41 códigos que não existiam em lugar nenhum.
  test('keeps the planning catalog grouped by the six departments', () => {
    expect(CENTRAL_MX_PLANNING_INDICATORS).toHaveLength(45)
    expect(new Set(CENTRAL_MX_PLANNING_INDICATORS.map(item => item.code)).size).toBe(45)
    expect(new Set(CENTRAL_MX_PLANNING_INDICATORS.map(item => item.department))).toEqual(new Set([
      'comercial',
      'marketing',
      'produto',
      'financeiro',
      'rh',
      'operacional',
    ]))
  })

  test('builds one integrated Central MX result for planning, departments, score, alerts and action plan', () => {
    const engine = buildCentralMxEngine(baseInput)

    expect(engine.planningIndicators).toHaveLength(45)
    expect(engine.departments.map(department => department.code)).toEqual([
      'comercial',
      'marketing',
      'produto',
      'financeiro',
      'rh',
      'operacional',
    ])
    expect(engine.departments.every(department => department.checklist.length >= 4)).toBe(true)
    expect(engine.departments.every(department => department.playbook.length >= 3)).toBe(true)
    expect(engine.scores.store.calculationVersion).toBe(CENTRAL_MX_ENGINE_VERSION)
    expect(engine.scores.departments).toHaveLength(6)
    // 'rotina' saiu com o vocabulário paralelo: sobram funil e financeiro.
    expect(engine.scores.processes).toHaveLength(2)
    expect(engine.scores.individuals).toHaveLength(2)
    expect(engine.alerts.length).toBeGreaterThan(0)
    expect(engine.alerts.every(alert => alert.problem && alert.impact && alert.recommendation && alert.quickActionLabel)).toBe(true)
    expect(engine.actionPlanItems).toHaveLength(engine.alerts.length)
    expect(engine.actionPlanItems.every(item => item.department && item.indicator && item.problem && item.action && item.how && item.origin && item.priority)).toBe(true)
  })

  test('does not invent missing strategic values but still exposes every row for the annual table', () => {
    const engine = buildCentralMxEngine({ ...baseInput, financial: null, previousYear: {} })
    // Indicador do catálogo sem fonte no cockpit: aparece na tabela, vazio.
    const estoque = engine.planningIndicators.find(item => item.code === 'stock_total')
    // Indicador com fonte: o fechamento diário alimenta as vendas.
    const vendas = engine.planningIndicators.find(item => item.code === 'sales_total')

    expect(estoque).toMatchObject({
      meta: null,
      realizado: null,
      anoAnterior: null,
      status: 'pendente',
    })
    expect(vendas?.realizado).toBe(baseInput.metrics.totalSales)
    expect(engine.planningIndicators).toHaveLength(45)
  })

  // O catálogo do cockpit é o da metodologia: todo código exibido ao Dono
  // precisa existir em `catalogo_metricas_consultoria`. A lista canônica dos 45
  // é a mesma que o Admin usa em /plano-estrategico.
  test('todo indicador do cockpit existe no catálogo canônico da metodologia', () => {
    // `matchCanonicalIndicator` é a mesma ponte que o Admin usa entre a chave
    // do banco e o código canônico Base44.
    const forasteiros = CENTRAL_MX_PLANNING_INDICATORS
      .map(item => item.code)
      .filter(code => !matchCanonicalIndicator(code))
    expect(forasteiros).toEqual([])
  })
})
