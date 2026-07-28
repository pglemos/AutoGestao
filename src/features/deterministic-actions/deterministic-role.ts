import { normalizeRole, toCanonicalRoleCode } from '@/lib/auth/roles'
import type { DeterministicActionInput } from '@/lib/deterministic-actions'

export type DeterministicRole = DeterministicActionInput['role']

export function toDeterministicRole(rawRole: string | null | undefined): DeterministicRole | null {
  const role = normalizeRole(rawRole)
  const canonicalRole = toCanonicalRoleCode(rawRole)

  if (role === 'vendedor' || canonicalRole === 'seller') return 'seller'
  if (role === 'gerente' || canonicalRole === 'sales_manager') return 'manager'
  if (role === 'dono' || canonicalRole === 'master') return 'owner'
  if (
    role === 'administrador_geral'
    || role === 'administrador_mx'
    || role === 'consultor_mx'
    || canonicalRole === 'admin_mx'
    || canonicalRole === 'consultant'
  ) {
    return 'admin'
  }

  return null
}
