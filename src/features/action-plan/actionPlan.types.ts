import type { PlanningRole } from '@/features/planning-workspace/planningWorkspace.types'

export type ActionPlanStatus =
  | 'awaiting_decision'
  | 'not_started'
  | 'in_progress'
  | 'blocked'
  | 'late'
  | 'awaiting_validation'
  | 'completed'
  | 'cancelled'

export type CanonicalActionPlanStatus = Exclude<ActionPlanStatus, 'late'>
export type ActionPlanPriority = 'low' | 'medium' | 'high' | 'critical'
export type ActionPlanTab = 'acoes' | 'calendario'
export type ActionPlanMode = 'focus' | 'kanban' | 'list'
export type ExecutiveCardKey = 'total' | 'not_started' | 'late' | 'in_progress' | 'completed'

export type ActionPlanFilters = {
  search?: string
  objective?: string
  department?: string
  responsible?: string
  status?: CanonicalActionPlanStatus
  priority?: ActionPlanPriority
  origin?: string
  display?: string
  indicator?: string
  impactStatus?: string
}

export type ActionPlanItem = {
  id: string
  code: string
  title: string
  status: ActionPlanStatus
  dueDate: string | null
  progress: number
  priority: ActionPlanPriority
  updatedAt: string | null
  createdAt?: string | null
  completedAt?: string | null
  blockedReason?: string | null
  requiresOwner?: boolean
  requiresOwnerDecision?: boolean
  submittedForValidationAt?: string | null
  responsible?: string
  responsibleId?: string | null
  department?: string
  departmentLabel?: string
  strategicObjective?: string
  strategicObjectiveLabel?: string
  indicator?: string
  origin?: string
  impactStatus?: string
  [key: string]: unknown
}

export type ActionPlanMetrics = {
  total: number
  notStarted: number
  late: number
  inProgress: number
  completed: number
}

export type ExecutiveCardFilterResult = {
  activeCard: ExecutiveCardKey | null
  patch: Pick<ActionPlanFilters, 'display' | 'status'>
}

export type FocusSections = {
  needsYou: ActionPlanItem[]
  atRisk: ActionPlanItem[]
  inExecution: ActionPlanItem[]
  awaitingValidation: ActionPlanItem[]
  recentlyCompleted: ActionPlanItem[]
}

export type ActionPlanScope = 'global' | 'store' | 'self'
export type ActionPlanPermissions = {
  scope: ActionPlanScope
  canCreate: boolean
  canEdit: boolean
  canDeletePermanently: boolean
  canValidate: boolean
  canDelegate: boolean
  canViewAllResponsiblePeople: boolean
}

export type ActionTransitionOperation =
  | 'approve'
  | 'start'
  | 'block'
  | 'unblock'
  | 'submitValidation'
  | 'validate'
  | 'return'
  | 'reopen'
  | 'cancel'

export type ActionTransitionResolution =
  | { kind: 'direct'; operation: ActionTransitionOperation }
  | { kind: 'modal'; operation: ActionTransitionOperation }
  | { kind: 'forbidden' }

export type ActionPlanRole = PlanningRole

export type ActionPlanMutationResult = ActionPlanItem | Record<string, unknown> | null | void
export type ActionPlanValidationResult = { error: boolean; errors?: string[]; message?: string }
export type ActionPlanRepository = {
  getActions(options?: { storeId?: string | null }): Promise<ActionPlanItem[]>
  getResponsiblePeople(options?: { storeId?: string | null }): Promise<string[]>
  createAction(payload: Record<string, unknown>, options?: { storeId?: string | null }): Promise<ActionPlanMutationResult>
  updateActionById(id: string, payload: Record<string, unknown>): Promise<ActionPlanMutationResult>
  approveAction(id: string, payload?: Record<string, unknown>): Promise<ActionPlanMutationResult>
  delegateAction(id: string, payload?: Record<string, unknown>): Promise<ActionPlanMutationResult>
  startAction(id: string, payload?: Record<string, unknown>): Promise<ActionPlanMutationResult>
  updateProgress(id: string, payload?: Record<string, unknown>): Promise<ActionPlanMutationResult>
  blockAction(id: string, payload?: Record<string, unknown>): Promise<ActionPlanMutationResult>
  unblockAction(id: string, payload?: Record<string, unknown>): Promise<ActionPlanMutationResult>
  submitForValidation(id: string, payload?: Record<string, unknown>): Promise<ActionPlanValidationResult>
  validateAction(id: string, payload?: Record<string, unknown>): Promise<ActionPlanMutationResult>
  returnToExecution(id: string, payload?: Record<string, unknown>): Promise<ActionPlanMutationResult>
  reopenAction(id: string, payload?: Record<string, unknown>): Promise<ActionPlanMutationResult>
  cancelAction(id: string, payload?: Record<string, unknown>): Promise<ActionPlanMutationResult>
  deleteAction(id: string): Promise<void>
  updateDueDate(id: string, payload?: Record<string, unknown>): Promise<ActionPlanMutationResult>
  duplicateAction(id: string, payload?: Record<string, unknown>): Promise<ActionPlanMutationResult>
}
