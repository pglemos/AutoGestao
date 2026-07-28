import { normalizeRole } from '@/lib/auth/roles'
import type { DeterministicActionInput } from '@/lib/deterministic-actions'

export type DeterministicRole = DeterministicActionInput['role']

export function toDeterministicRole(rawRole: string | null | undefined): DeterministicRole | null {
  const role = normalizeRole(rawRole)

  if (role === 'vendedor') return 'seller'
  if (role === 'gerente') return 'manager'
  if (role === 'dono') return 'owner'
  if (role === 'administrador_geral' || role === 'administrador_mx' || role === 'consultor_mx') {
    return 'admin'
  }

  return null
}
