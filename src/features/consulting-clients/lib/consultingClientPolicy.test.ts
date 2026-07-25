import { describe, expect, test } from 'bun:test'
import { canCreateConsultingClient, canManageConsultingClient } from './consultingClientPolicy'

describe('consulting client policy', () => {
  test('admin manages all and consultant only assigned scope', () => {
    expect(canCreateConsultingClient('administrador_mx')).toBe(true)
    expect(canCreateConsultingClient('consultor_mx')).toBe(false)
    expect(canManageConsultingClient({ role: 'consultor_mx', assigned: true })).toBe(true)
    expect(canManageConsultingClient({ role: 'consultor_mx', assigned: false })).toBe(false)
  })
})
