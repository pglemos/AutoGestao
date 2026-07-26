import { describe, expect, test } from 'bun:test'
import {
  canCreateConsultingClient,
  canManageConsultingClient,
  canViewConsultingClient,
  isConsultantAssignedToClient,
} from './consultingClientPolicy'

const assignments = [
  { client_id: 'cliente-a', user_id: 'consultor-a', active: true },
  { client_id: 'cliente-b', user_id: 'consultor-a', active: false },
]

describe('consulting client policy', () => {
  test('all internal profiles manage the global consulting scope', () => {
    expect(canCreateConsultingClient('administrador_mx')).toBe(true)
    expect(canCreateConsultingClient('consultor_mx')).toBe(true)
    expect(canManageConsultingClient({ role: 'consultor_mx', assigned: true })).toBe(true)
    expect(canManageConsultingClient({ role: 'consultor_mx', assigned: false })).toBe(true)
  })

  test('assignment remains useful metadata but does not gate global access', () => {
    expect(isConsultantAssignedToClient({ userId: 'consultor-a', clientId: 'cliente-a', assignments })).toBe(true)
    expect(isConsultantAssignedToClient({ userId: 'consultor-a', clientId: 'cliente-b', assignments })).toBe(false)
    expect(canViewConsultingClient({ role: 'consultor_mx', assigned: true })).toBe(true)
    expect(canViewConsultingClient({ role: 'consultor_mx', assigned: false })).toBe(true)
    expect(canViewConsultingClient({ role: 'administrador_geral', assigned: false })).toBe(true)
  })
})
