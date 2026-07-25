import type { UserRole } from '@/types/database'

export type InternalMxManagedArea = 'operational-settings' | 'pmr-parameters'
export type InternalMxAccessMode = 'manage' | 'read-only' | 'hidden'

const ADMIN_ROLES = new Set<UserRole>(['administrador_geral', 'administrador_mx'])

const READ_ONLY_MESSAGES: Record<InternalMxManagedArea, string> = {
  'operational-settings': 'O Consultor MX pode consultar os parâmetros operacionais, mas alterações são exclusivas dos administradores MX.',
  'pmr-parameters': 'O Consultor MX pode consultar benchmarks e parâmetros PMR, mas alterações são exclusivas dos administradores MX.',
}

export function getInternalMxAccessMode(
  area: InternalMxManagedArea,
  role: UserRole | string | null | undefined,
): InternalMxAccessMode {
  switch (area) {
    case 'operational-settings':
    case 'pmr-parameters':
      if (ADMIN_ROLES.has(role as UserRole)) return 'manage'
      if (role === 'consultor_mx') return 'read-only'
      return 'hidden'
  }
}

export function canManageInternalMxArea(
  area: InternalMxManagedArea,
  role: UserRole | string | null | undefined,
): boolean {
  return getInternalMxAccessMode(area, role) === 'manage'
}

export function canViewInternalMxArea(
  area: InternalMxManagedArea,
  role: UserRole | string | null | undefined,
): boolean {
  return getInternalMxAccessMode(area, role) !== 'hidden'
}

export function getInternalMxReadOnlyMessage(area: InternalMxManagedArea): string {
  return READ_ONLY_MESSAGES[area]
}
