import { describe, expect, test } from 'bun:test'
import { readActionPlanRouteState, resolveInitialActionPlanMode, writeActionPlanRouteState } from './actionPlanPreferences'

describe('actionPlanPreferences', () => {
  test('inicia em Foco sem preferência válida', () => {
    expect(resolveInitialActionPlanMode(null)).toBe('focus')
    expect(resolveInitialActionPlanMode('table')).toBe('list')
    expect(resolveInitialActionPlanMode('foco')).toBe('focus')
  })

  test('preserva storeId e parâmetros não relacionados', () => {
    const next = writeActionPlanRouteState('?storeId=store-1&source=dashboard', { tab: 'calendario' })
    expect(next).toContain('storeId=store-1')
    expect(next).toContain('source=dashboard')
    expect(readActionPlanRouteState(next)).toEqual({ tab: 'calendario' })
  })

  test('rota inválida volta para Ações', () => {
    expect(readActionPlanRouteState('?tab=qualquer')).toEqual({ tab: 'acoes' })
  })
})
