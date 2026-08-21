export type PlanningShell = 'owner' | 'internal'

export type PlanningRole =
  | 'administrador_geral'
  | 'administrador_mx'
  | 'consultor_mx'
  | 'dono'
  | 'gerente'
  | 'vendedor'

export type PlanningActor = {
  id: string
  name: string
  email: string | null
  role: PlanningRole
}

export type PlanningCapabilities = {
  scope: 'global' | 'store' | 'self'
  canEditTargets: boolean
  canManageStrategicCycle: boolean
  canCreateActions: boolean
  canDeleteActions: boolean
  canReviewActions: boolean
  canManageConsulting: boolean
  canReviewAnticipation: boolean
  canViewStrategicPpa: boolean
}

export type PlanningWorkspaceValue = {
  shell: PlanningShell
  storeId: string | null
  actor: PlanningActor
  capabilities: PlanningCapabilities
}
