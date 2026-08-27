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
      'avg_margin',
      'stock_over_90_rate',
      'active_stock',
      'trade_in_to_sales_rate',
      'financed_sales_percentage',
      'after_sales_percentage',
    ]) {
      expect(metaDe(engine, code)).toBeNull()
    }
  })

  test('com os parâmetros da MX, a meta é a da metodologia', () => {
    const engine = buildCentralMxEngine({
      ...baseInput,
      strategicParameters: { STOCK_MARGIN_RATE: 0.2, OVER_90_STOCK_RATE: 0.15, TRADE_SALES_RATE: 0.5 },
    })
    // Parâmetro é fração; o cockpit exibe pontos percentuais.
    expect(metaDe(engine, 'avg_margin')).toBe(20)
    expect(metaDe(engine, 'stock_over_90_rate')).toBe(15)
    expect(metaDe(engine, 'trade_in_to_sales_rate')).toBe(50)
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
    // O vocabulário paralelo inteiro saiu junto.
    expect(codes).not.toContain('channel_mix_score')
    expect(codes).not.toContain('behavioral_fit_score')
  })
})

/**
 * Ao trocar o catálogo do cockpit pelos 45 da metodologia, três alertas
 * passaram a procurar códigos que não existiam mais. O pior era o do DRE:
 * `indicators.find(...)` devolvia `undefined`, `undefined == null` é `true`, e o
 * alerta disparava sempre — inclusive com o DRE em dia.
 */
describe('alertas apontam para indicadores que existem', () => {
  const comDre = {
    ...baseInput,
    financial: { netProfit: 5000, grossMarginPct: 17 },
  }

  test('o alerta de DRE some quando o financeiro existe', () => {
    const semFinanceiro = buildCentralMxEngine({ ...baseInput, financial: null })
    const comFinanceiro = buildCentralMxEngine(comDre)
    const temAlertaDre = (r: ReturnType<typeof buildCentralMxEngine>) =>
      r.alerts.some(a => /DRE/i.test(a.problem))
    expect(temAlertaDre(semFinanceiro)).toBe(true)
    expect(temAlertaDre(comFinanceiro)).toBe(false)
  })

  test('todo alerta aponta para um indicador do catálogo', () => {
    const engine = buildCentralMxEngine(comDre)
    const codigos = new Set(engine.planningIndicators.map(item => item.code))
    const orfaos = engine.alerts
      .map(alert => (alert.metadata as { sourceIndicator?: string } | null)?.sourceIndicator)
      .filter((code): code is string => Boolean(code) && code !== 'mx_score')
      .filter(code => !codigos.has(code))
    expect(orfaos).toEqual([])
  })
})
