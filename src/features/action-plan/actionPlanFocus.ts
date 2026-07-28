import { isActionLate, normalizeActionStatus, parseActionDate, startOfActionDay } from './actionPlanMetrics'
import type { ActionPlanItem, FocusSections } from './actionPlan.types'

const DAY_MS = 86_400_000
const PRIORITY_ORDER: Record<ActionPlanItem['priority'], number> = { critical: 0, high: 1, medium: 2, low: 3 }

function daysFromNow(value: string | null | undefined, now: Date): number | null {
  const parsed = parseActionDate(value)
  if (!parsed) return null
  return Math.round((startOfActionDay(parsed).getTime() - startOfActionDay(now).getTime()) / DAY_MS)
}

function daysSince(value: string | null | undefined, now: Date): number | null {
  const parsed = parseActionDate(value)
  if (!parsed) return null
  return Math.floor((now.getTime() - parsed.getTime()) / DAY_MS)
}

export function actionNeedsOwnerDecision(action: ActionPlanItem): boolean {
  return normalizeActionStatus(action.status) === 'awaiting_decision'
    && Boolean(action.requiresOwnerDecision ?? action.requiresOwner)
}

export function actionIsAtRisk(action: ActionPlanItem, now = new Date()): boolean {
  const status = normalizeActionStatus(action.status)
  if (status === 'completed' || status === 'cancelled' || status === 'awaiting_validation') return false
  if (actionNeedsOwnerDecision(action)) return false
  if (isActionLate(action, now) || status === 'blocked') return true
  const dueInDays = daysFromNow(action.dueDate, now)
  if (dueInDays !== null && dueInDays >= 0 && dueInDays <= 2 && action.progress < 50) return true
  const staleDays = daysSince(action.updatedAt, now)
  if (staleDays !== null && staleDays > 7) return true
  return action.priority === 'critical' && status === 'not_started'
}

function sortOperational(left: ActionPlanItem, right: ActionPlanItem, now: Date): number {
  const leftLate = isActionLate(left, now) ? 0 : 1
  const rightLate = isActionLate(right, now) ? 0 : 1
  if (leftLate !== rightLate) return leftLate - rightLate
  const leftBlocked = normalizeActionStatus(left.status) === 'blocked' ? 0 : 1
  const rightBlocked = normalizeActionStatus(right.status) === 'blocked' ? 0 : 1
  if (leftBlocked !== rightBlocked) return leftBlocked - rightBlocked
  const priority = PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]
  if (priority !== 0) return priority
  const leftDue = parseActionDate(left.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
  const rightDue = parseActionDate(right.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
  return leftDue - rightDue
}

export function buildFocusSections(actions: ActionPlanItem[], now = new Date()): FocusSections {
  const needsYou: ActionPlanItem[] = []
  const atRisk: ActionPlanItem[] = []
  const inExecution: ActionPlanItem[] = []
  const awaitingValidation: ActionPlanItem[] = []
  const completed: ActionPlanItem[] = []

  for (const action of actions) {
    const status = normalizeActionStatus(action.status)
    if (status === 'cancelled') continue
    if (status === 'completed') {
      completed.push(action)
      continue
    }
    if (status === 'awaiting_validation') {
      awaitingValidation.push(action)
      continue
    }
    if (actionNeedsOwnerDecision(action)) {
      needsYou.push(action)
      continue
    }
    if (actionIsAtRisk(action, now)) {
      atRisk.push(action)
      continue
    }
    if (status === 'in_progress') inExecution.push(action)
  }

  return {
    needsYou: needsYou.sort((a, b) => sortOperational(a, b, now)),
    atRisk: atRisk.sort((a, b) => sortOperational(a, b, now)),
    inExecution: inExecution.sort((a, b) => sortOperational(a, b, now)),
    awaitingValidation: awaitingValidation.sort((a, b) => sortOperational(a, b, now)),
    recentlyCompleted: completed
      .sort((a, b) => (parseActionDate(b.completedAt)?.getTime() ?? 0) - (parseActionDate(a.completedAt)?.getTime() ?? 0))
      .slice(0, 4),
  }
}
