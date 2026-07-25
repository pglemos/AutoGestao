import { describe, expect, test } from 'bun:test'
import { getInternalMxAccessMode } from './internalMxActionPolicy'

describe('internal MX action policy', () => {
  test('administrador_mx manages reprocessing', () => {
    expect(getInternalMxAccessMode({ role: 'administrador_mx', resource: 'reprocessing', action: 'execute' })).toBe('manage')
  })

  test('consultor_mx cannot execute reprocessing', () => {
    expect(getInternalMxAccessMode({ role: 'consultor_mx', resource: 'reprocessing', action: 'execute' })).toBe('hidden')
  })

  test('consultor_mx only updates owned consulting scope', () => {
    expect(getInternalMxAccessMode({ role: 'consultor_mx', resource: 'consulting-client', action: 'update', ownsScope: true })).toBe('manage')
    expect(getInternalMxAccessMode({ role: 'consultor_mx', resource: 'consulting-client', action: 'update', ownsScope: false })).toBe('read')
  })

  test('non internal roles stay hidden', () => {
    expect(getInternalMxAccessMode({ role: 'gerente', resource: 'network', action: 'view' })).toBe('hidden')
  })
})
