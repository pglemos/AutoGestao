import type { UserRole } from '@/types/database'
import { isPerfilInternoMx } from './roles'

export type Capability =
  | 'simulate_role'
  | 'manage_store'
  | 'manage_team'
  | 'manage_feedback'
  | 'manage_pdi'
  | 'create_checkin_adjustment'
  | 'view_products'
  | 'print_pdi'
  | 'view_configurations'
  | 'view_ranking'
  | 'simulateRole'
  | 'manageStore'
  | 'manageTeam'
  | 'manageFeedback'
  | 'managePDI'
  | 'createCheckinAdjustment'
  | 'viewProducts'
  | 'printPDI'
  | 'viewConfigurations'
  | 'viewRanking'

export const CONFIGURATION_ROLES: readonly UserRole[] = ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente']
export const PRODUCT_ROLES: readonly UserRole[] = ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente']
export const PDI_PRINT_ROLES: readonly UserRole[] = ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente']
export const RANKING_ROLES: readonly UserRole[] = ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente', 'vendedor']

export function canSimulateRole(role: UserRole | string | null | undefined): boolean {
  return isPerfilInternoMx(role)
}

export function canManageStore(role: UserRole | string | null | undefined): boolean {
  return isPerfilInternoMx(role)
}

export function canManageTeam(role: UserRole | string | null | undefined): boolean {
  return isPerfilInternoMx(role) || role === 'gerente' || role === 'dono'
}

export function canManageFeedback(role: UserRole | string | null | undefined): boolean {
  return isPerfilInternoMx(role) || role === 'gerente' || role === 'dono'
}

export function canManagePDI(role: UserRole | string | null | undefined): boolean {
  return isPerfilInternoMx(role) || role === 'gerente' || role === 'dono'
}

export function canCreateAdjustment(role: UserRole | string | null | undefined): boolean {
  return isPerfilInternoMx(role) || role === 'gerente' || role === 'vendedor'
}

export function hasCapability(role: UserRole | string | null | undefined, capability: Capability): boolean {
  switch (capability) {
    case 'simulate_role':
    case 'simulateRole':
      return canSimulateRole(role)
    case 'manage_store':
    case 'manageStore':
      return canManageStore(role)
    case 'manage_team':
    case 'manageTeam':
      return canManageTeam(role)
    case 'manage_feedback':
    case 'manageFeedback':
      return canManageFeedback(role)
    case 'manage_pdi':
    case 'managePDI':
      return canManagePDI(role)
    case 'create_checkin_adjustment':
    case 'createCheckinAdjustment':
      return canCreateAdjustment(role)
    case 'view_products':
    case 'viewProducts':
      return PRODUCT_ROLES.includes(role as UserRole)
    case 'print_pdi':
    case 'printPDI':
      return PDI_PRINT_ROLES.includes(role as UserRole)
    case 'view_configurations':
    case 'viewConfigurations':
      return CONFIGURATION_ROLES.includes(role as UserRole)
    case 'view_ranking':
    case 'viewRanking':
      return RANKING_ROLES.includes(role as UserRole)
    default:
      return false
  }
}
