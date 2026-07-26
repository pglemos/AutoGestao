import { describe, expect, test } from 'bun:test'
import { getInternalMxAccessMode } from './internalMxActionPolicy'

describe('internal MX action policy', () => {
  test('administrador_mx manages reprocessing', () => {
    expect(getInternalMxAccessMode({ role: 'administrador_mx', resource: 'reprocessing', action: 'execute' })).toBe('manage')
  })

  test('consultor_mx cannot execute reprocessing', () => {
    expect(getInternalMxAccessMode({ role: 'consultor_mx', resource: 'reprocessing', action: 'execute' })).toBe('hidden')
  })

  test('consultor_mx manages global planning and consulting scope', () => {
    expect(getInternalMxAccessMode({ role: 'consultor_mx', resource: 'strategic-plan', action: 'update' })).toBe('manage')
    expect(getInternalMxAccessMode({ role: 'consultor_mx', resource: 'action-plan', action: 'delete' })).toBe('manage')
    expect(getInternalMxAccessMode({ role: 'consultor_mx', resource: 'consulting-client', action: 'update', ownsScope: true })).toBe('manage')
    expect(getInternalMxAccessMode({ role: 'consultor_mx', resource: 'consulting-client', action: 'update', ownsScope: false })).toBe('manage')
  })

  test('non internal roles stay hidden', () => {
    expect(getInternalMxAccessMode({ role: 'gerente', resource: 'network', action: 'view' })).toBe('hidden')
  })
})
