import type {
  ActionPlanPermissions,
  ActionPlanRole,
  ActionPlanStatus,
  ActionTransitionResolution,
  CanonicalActionPlanStatus,
} from './actionPlan.types'
import { normalizeActionStatus } from './actionPlanMetrics'

const INTERNAL: ActionPlanPermissions = {
  scope: 'global',
  canCreate: true,
  canEdit: true,
  canDeletePermanently: true,
  canValidate: true,
  canDelegate: true,
  canViewAllResponsiblePeople: true,
}

const OWNER: ActionPlanPermissions = {
  scope: 'store',
  canCreate: true,
  canEdit: true,
  canDeletePermanently: false,
  canValidate: true,
  canDelegate: true,
  canViewAllResponsiblePeople: true,
}

const MANAGER: ActionPlanPermissions = {
  scope: 'store',
  canCreate: true,
  canEdit: true,
  canDeletePermanently: false,
  canValidate: false,
  canDelegate: true,
  canViewAllResponsiblePeople: true,
}

const SELLER: ActionPlanPermissions = {
  scope: 'self',
  canCreate: false,
  canEdit: true,
  canDeletePermanently: false,
  canValidate: false,
  canDelegate: false,
  canViewAllResponsiblePeople: false,
}

export function getActionPlanPermissions(role: ActionPlanRole): ActionPlanPermissions {
  if (role === 'administrador_geral' || role === 'administrador_mx' || role === 'consultor_mx') return INTERNAL
  if (role === 'dono') return OWNER
  if (role === 'gerente') return MANAGER
  return SELLER
}

const TRANSITIONS: Record<CanonicalActionPlanStatus, Partial<Record<CanonicalActionPlanStatus, ActionTransitionResolution>>> = {
  awaiting_decision: {
    not_started: { kind: 'modal', operation: 'approve' },
    in_progress: { kind: 'modal', operation: 'approve' },
    cancelled: { kind: 'modal', operation: 'cancel' },
  },
  not_started: {
    in_progress: { kind: 'direct', operation: 'start' },
    cancelled: { kind: 'modal', operation: 'cancel' },
  },
  in_progress: {
    blocked: { kind: 'modal', operation: 'block' },
    awaiting_validation: { kind: 'modal', operation: 'submitValidation' },
    cancelled: { kind: 'modal', operation: 'cancel' },
  },
  blocked: {
    in_progress: { kind: 'modal', operation: 'unblock' },
    cancelled: { kind: 'modal', operation: 'cancel' },
  },
  awaiting_validation: {
    completed: { kind: 'modal', operation: 'validate' },
    in_progress: { kind: 'modal', operation: 'return' },
  },
  completed: {
    in_progress: { kind: 'modal', operation: 'reopen' },
  },
  cancelled: {},
}

export function resolveActionTransition(
  source: ActionPlanStatus,
  destination: ActionPlanStatus,
): ActionTransitionResolution {
  const from = normalizeActionStatus(source)
  const to = normalizeActionStatus(destination)
  return TRANSITIONS[from][to] ?? { kind: 'forbidden' }
}
