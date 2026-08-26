import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  CENTRAL_MX_ENGINE_VERSION,
  CENTRAL_MX_PLANNING_INDICATORS,
  buildCentralMxEngine,
} from './central-mx-engine'

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
  // O catálogo do cockpit tinha 45 entradas, duas delas (`cost_per_lead` e
  // `training_completion_rate`) arquivadas no catálogo da metodologia e sempre
  // vazias na tela do Dono. Foram removidas: 43 é o número correto hoje.
  test('keeps the planning catalog grouped by the six departments', () => {
    expect(CENTRAL_MX_PLANNING_INDICATORS).toHaveLength(43)
    expect(new Set(CENTRAL_MX_PLANNING_INDICATORS.map(item => item.code)).size).toBe(43)
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

    expect(engine.planningIndicators).toHaveLength(43)
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
    expect(engine.scores.processes).toHaveLength(3)
    expect(engine.scores.individuals).toHaveLength(2)
    expect(engine.alerts.length).toBeGreaterThan(0)
    expect(engine.alerts.every(alert => alert.problem && alert.impact && alert.recommendation && alert.quickActionLabel)).toBe(true)
    expect(engine.actionPlanItems).toHaveLength(engine.alerts.length)
    expect(engine.actionPlanItems.every(item => item.department && item.indicator && item.problem && item.action && item.how && item.origin && item.priority)).toBe(true)
  })

  test('does not invent missing strategic values but still exposes every row for the annual table', () => {
    const engine = buildCentralMxEngine({ ...baseInput, financial: null, previousYear: {} })
    const inventory = engine.planningIndicators.find(item => item.code === 'inventory_total')
    const dre = engine.planningIndicators.find(item => item.code === 'dre_completion_rate')

    expect(inventory).toMatchObject({
      meta: null,
      realizado: null,
      anoAnterior: null,
      status: 'pendente',
    })
    expect(dre?.status).toBe('parcial')
  })

  // A migration de seed é histórica e imutável: continua com as 45 entradas
  // originais. O engine hoje expõe 43 — o seed precisa conter todas elas.
  test('keeps the Supabase Central MX catalog seed aligned with the engine', () => {
    const migration = readFileSync(
      new URL('../../supabase/migrations/20260529120000_central_mx_catalog_45_and_action_evidence.sql', import.meta.url),
      'utf8',
    )

    for (const indicator of CENTRAL_MX_PLANNING_INDICATORS) {
      expect(migration).toContain(`('${indicator.code}'`)
    }

    expect((migration.match(/"central_mx":true/g) || []).length).toBe(45)
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.evidencias_planos_acao')
  })
})
