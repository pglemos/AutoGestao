import { describe, expect, test } from 'bun:test'
import { toDeterministicRole } from './deterministic-role'

describe('toDeterministicRole', () => {
  test.each([
    ['vendedor', 'seller'],
    ['seller', 'seller'],
    ['gerente', 'manager'],
    ['manager', 'manager'],
    ['sales_manager', 'manager'],
    ['dono', 'owner'],
    ['owner', 'owner'],
    ['master', 'owner'],
    ['administrador_geral', 'admin'],
    ['administrador_mx', 'admin'],
    ['admin_mx', 'admin'],
    ['consultor_mx', 'admin'],
    ['consultant', 'admin'],
  ] as const)('maps %s to %s', (input, expected) => {
    expect(toDeterministicRole(input)).toBe(expected)
  })

  test('fails closed for unknown or absent roles', () => {
    expect(toDeterministicRole('unexpected-role')).toBeNull()
    expect(toDeterministicRole(null)).toBeNull()
    expect(toDeterministicRole(undefined)).toBeNull()
  })
})
