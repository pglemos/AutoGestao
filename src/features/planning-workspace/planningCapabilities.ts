import type { PlanningCapabilities, PlanningRole } from './planningWorkspace.types'

const INTERNAL: PlanningCapabilities = Object.freeze({
  scope: 'global',
  canEditTargets: true,
  canManageStrategicCycle: true,
  canCreateActions: true,
  canDeleteActions: true,
  canReviewActions: true,
  canManageConsulting: true,
  canReviewAnticipation: true,
  canViewStrategicPpa: true,
})

const OWNER: PlanningCapabilities = Object.freeze({
  scope: 'store',
  canEditTargets: true,
  canManageStrategicCycle: false,
  canCreateActions: true,
  canDeleteActions: false,
  canReviewActions: true,
  canManageConsulting: false,
  canReviewAnticipation: false,
  canViewStrategicPpa: true,
})

const MANAGER: PlanningCapabilities = Object.freeze({
  scope: 'store',
  canEditTargets: false,
  canManageStrategicCycle: false,
  canCreateActions: true,
  canDeleteActions: false,
  canReviewActions: false,
  canManageConsulting: false,
  canReviewAnticipation: false,
  canViewStrategicPpa: false,
})

const SELLER: PlanningCapabilities = Object.freeze({
  scope: 'self',
  canEditTargets: false,
  canManageStrategicCycle: false,
  canCreateActions: false,
  canDeleteActions: false,
  canReviewActions: false,
  canManageConsulting: false,
  canReviewAnticipation: false,
  canViewStrategicPpa: false,
})

export function resolvePlanningCapabilities(role: PlanningRole): PlanningCapabilities {
  if (role === 'administrador_geral' || role === 'administrador_mx' || role === 'consultor_mx') return INTERNAL
  if (role === 'dono') return OWNER
  if (role === 'gerente') return MANAGER
  return SELLER
}
