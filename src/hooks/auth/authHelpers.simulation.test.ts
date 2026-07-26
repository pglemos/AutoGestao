import { afterEach, describe, expect, test } from 'bun:test'
import { clearSimulationStorage, readSimulationContext, writeSimulationContext } from './authHelpers'

afterEach(() => clearSimulationStorage())

describe('simulation storage lifecycle', () => {
  test('reads legacy and extended contexts', () => {
    writeSimulationContext({ role: 'vendedor', sellerUserId: 'u1', storeId: 's1' })
    expect(readSimulationContext()).toEqual({ role: 'vendedor', sellerUserId: 'u1', storeId: 's1', realRole: undefined, startedAt: undefined })
    writeSimulationContext({ role: 'gerente', sellerUserId: 'u2', storeId: 's2', realRole: 'administrador_mx', startedAt: '2026-07-25T00:00:00.000Z' })
    expect(readSimulationContext()?.realRole).toBe('administrador_mx')
  })
  test('clears corrupt data', () => {
    window.sessionStorage.setItem('mx_simulation_context', '{')
    expect(readSimulationContext()).toBeNull()
    expect(window.sessionStorage.getItem('mx_simulation_context')).toBeNull()
  })
})
