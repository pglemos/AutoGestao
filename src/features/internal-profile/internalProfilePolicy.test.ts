import { describe, expect, test } from 'bun:test'
import { canEditInternalProfile, maskSensitiveValue } from './lib/internalProfilePolicy'

describe('internal profile policy', () => {
  test('internal roles edit their own profile', () => {
    expect(canEditInternalProfile('administrador_mx')).toBe(true)
    expect(canEditInternalProfile('consultor_mx')).toBe(true)
    expect(canEditInternalProfile('vendedor')).toBe(false)
  })
  test('never exposes a complete sensitive value', () => {
    expect(maskSensitiveValue('123456789')).toBe('12••••89')
    expect(maskSensitiveValue('123')).toBe('••••')
  })
})
