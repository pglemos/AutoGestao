import { describe, expect, test } from 'bun:test'
import { canPerformSimulatedAction } from './simulationPolicy'

describe('simulation policy', () => {
  test('blocks unsupported administrative mutations', () => {
    expect(canPerformSimulatedAction('view')).toBe(true)
    expect(canPerformSimulatedAction('update-carteira-delegated')).toBe(true)
    expect(canPerformSimulatedAction('delete-user')).toBe(false)
    expect(canPerformSimulatedAction('reprocess')).toBe(false)
  })
})
