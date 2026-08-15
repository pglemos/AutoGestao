import { describe, expect, test } from 'bun:test'
import { ADMIN_CONVERGENCE_MODULES } from './domainMap'

const EXPECTED_ROUTES = [
  '/clientes',
  '/equipe',
  '/produtos',
  '/indicadores',
  '/planos-acao',
  '/consultoria-mx',
] as const

describe('Base44 admin convergence domain map', () => {
  test('covers the six requested administrator modules exactly once', () => {
    expect(ADMIN_CONVERGENCE_MODULES.map((item) => item.route)).toEqual(EXPECTED_ROUTES)
    expect(new Set(ADMIN_CONVERGENCE_MODULES.map((item) => item.key)).size).toBe(6)
  })

  test('every module declares a canonical data source and migration policy', () => {
    for (const module of ADMIN_CONVERGENCE_MODULES) {
      expect(module.canonicalTables.length).toBeGreaterThan(0)
      expect(module.migrationPolicy.length).toBeGreaterThan(20)
      expect(['existing', 'partial', 'missing']).toContain(module.currentStatus)
    }
  })

  test('never maps Base44 operational entities to parallel duplicate tables', () => {
    const forbidden = new Set([
      'client_accounts',
      'stores_base44',
      'user_profiles_base44',
      'action_plans_base44',
      'indicator_definitions_base44',
      'journey_encounters_base44',
    ])

    for (const module of ADMIN_CONVERGENCE_MODULES) {
      for (const table of module.canonicalTables) {
        expect(forbidden.has(table)).toBe(false)
      }
    }
  })

  test('separates methodology governance from consulting operation', () => {
    const methodology = ADMIN_CONVERGENCE_MODULES.find((item) => item.key === 'consultoria-mx')
    expect(methodology?.route).toBe('/consultoria-mx')
    expect(methodology?.preservedOperationalRoutes).toContain('/consultoria')
    expect(methodology?.canonicalTables).toContain('etapas_modelo_visita_consultoria')
    expect(methodology?.canonicalTables).not.toContain('visitas_consultoria')
  })
})
