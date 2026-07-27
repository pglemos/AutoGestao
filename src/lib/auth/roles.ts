import type { MxRoleCode, RoleCode, UserRole } from '@/types/database'

export const USER_ROLES = [
  'administrador_geral',
  'administrador_mx',
  'consultor_mx',
  'dono',
  'gerente',
  'vendedor',
] as const satisfies readonly UserRole[]

export const ROLE_CODES = [
  'master',
  'director',
  'sales_manager',
  'seller',
  'marketing',
  'product',
  'finance',
  'hr',
  'operations',
  'consultant',
] as const satisfies readonly RoleCode[]

export const MX_ROLE_CODES = [
  ...ROLE_CODES,
  'admin_mx',
] as const satisfies readonly MxRoleCode[]

const ROLE_ALIASES: Record<string, UserRole> = {
  administrador_geral: 'administrador_geral',
  admin_master: 'administrador_geral',
  administrador_mx: 'administrador_mx',
  admin: 'administrador_mx',
  consultor_mx: 'consultor_mx',
  consultor: 'consultor_mx',
  dono: 'dono',
  owner: 'dono',
  gerente: 'gerente',
  manager: 'gerente',
  vendedor: 'vendedor',
  seller: 'vendedor',
}

const CANONICAL_ROLE_ALIASES: Record<string, MxRoleCode> = {
  administrador_geral: 'admin_mx',
  admin_master: 'admin_mx',
  administrador_mx: 'admin_mx',
  admin: 'admin_mx',
  admin_mx: 'admin_mx',
  consultor_mx: 'consultant',
  consultor: 'consultant',
  consultant: 'consultant',
  dono: 'master',
  owner: 'master',
  master: 'master',
  gerente: 'sales_manager',
  manager: 'sales_manager',
  sales_manager: 'sales_manager',
  vendedor: 'seller',
  seller: 'seller',
  director: 'director',
  diretor: 'director',
  socio: 'director',
  sócio: 'director',
  marketing: 'marketing',
  product: 'product',
  produto: 'product',
  finance: 'finance',
  financeiro: 'finance',
  hr: 'hr',
  rh: 'hr',
  operations: 'operations',
  operacoes: 'operations',
  operações: 'operations',
}

export function normalizeRole(rawRole: string | null | undefined): UserRole | null {
  const role = (rawRole || '').toLowerCase().trim()
  return ROLE_ALIASES[role] || null
}

export function toCanonicalRoleCode(rawRole: string | null | undefined): MxRoleCode | null {
  const role = (rawRole || '').toLowerCase().trim()
  return CANONICAL_ROLE_ALIASES[role] || null
}

export function isCanonicalRoleCode(rawRole: string | null | undefined): rawRole is RoleCode {
  return ROLE_CODES.includes(rawRole as RoleCode)
}

export function isUserRole(rawRole: string | null | undefined): rawRole is UserRole {
  return normalizeRole(rawRole) === rawRole
}

export function isPerfilInternoMx(role: UserRole | string | null | undefined): boolean {
  const normalized = normalizeRole(role)
  return normalized === 'administrador_geral' || normalized === 'administrador_mx' || normalized === 'consultor_mx'
}

/**
 * Contrato administrativo global da área interna MX.
 *
 * A Opção B deliberadamente iguala Administrador Geral, Administrador MX e
 * Consultor MX para todas as superfícies que historicamente consumiam este
 * helper como gate de administração.
 */
export function isAdministradorMx(role: UserRole | string | null | undefined): boolean {
  return isPerfilInternoMx(role)
}
