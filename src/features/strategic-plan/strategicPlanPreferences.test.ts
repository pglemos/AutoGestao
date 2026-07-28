import { describe, expect, test } from 'bun:test'
import { readStrategicRouteState, resolveInitialStrategicDisplayMode, writeStrategicRouteState } from './strategicPlanPreferences'

describe('preferências estratégicas', () => {
  test('desktop sem preferência inicia em both', () => {
    expect(resolveInitialStrategicDisplayMode({ width: 1440 })).toBe('both')
  })

  test('mobile nunca inicia em both', () => {
    expect(resolveInitialStrategicDisplayMode({ width: 390, saved: 'both' })).toBe('table')
  })

  test('preserva storeId e parâmetros não relacionados', () => {
    const next = writeStrategicRouteState('?storeId=store-1&foo=bar', { tab: 'visao-geral', indicatorId: 'SP-004' })
    expect(readStrategicRouteState(next)).toEqual({ tab: 'visao-geral', indicatorId: 'SP-004' })
    expect(next).toContain('storeId=store-1')
    expect(next).toContain('foo=bar')
  })
})
