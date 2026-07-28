import type {
  ActionPlanFilters,
  ActionPlanItem,
  ActionPlanMetrics,
  ExecutiveCardFilterResult,
  ExecutiveCardKey,
} from './actionPlan.types'

const FINAL_STATUSES = new Set(['completed', 'cancelled'])

export function parseActionDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const raw = String(value).trim()
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s.*)?$/)
  if (br) {
    const date = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]))
    date.setHours(0, 0, 0, 0)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function startOfActionDay(value: Date): Date {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

export function normalizeActionStatus(status: ActionPlanItem['status']): Exclude<ActionPlanItem['status'], 'late'> {
  return status === 'late' ? 'not_started' : status
}

export function isActionLate(action: ActionPlanItem, now = new Date()): boolean {
  const status = normalizeActionStatus(action.status)
  if (FINAL_STATUSES.has(status)) return false
  const dueDate = parseActionDate(action.dueDate)
  if (!dueDate) return false
  return startOfActionDay(dueDate).getTime() < startOfActionDay(now).getTime()
}

export function calculateActionPlanMetrics(actions: ActionPlanItem[], now = new Date()): ActionPlanMetrics {
  const active = actions.filter(action => normalizeActionStatus(action.status) !== 'cancelled')
  return {
    total: active.length,
    notStarted: active.filter(action => normalizeActionStatus(action.status) === 'not_started').length,
    late: active.filter(action => isActionLate(action, now)).length,
    inProgress: active.filter(action => normalizeActionStatus(action.status) === 'in_progress').length,
    completed: active.filter(action => normalizeActionStatus(action.status) === 'completed').length,
  }
}

export function applyExecutiveCardFilter(
  card: ExecutiveCardKey,
  current: ExecutiveCardKey | null,
): ExecutiveCardFilterResult {
  if (card === current) {
    return { activeCard: null, patch: { display: undefined, status: undefined } }
  }
  if (card === 'total') {
    return { activeCard: 'total', patch: { display: undefined, status: undefined } }
  }
  if (card === 'late') {
    return { activeCard: 'late', patch: { display: 'late', status: undefined } }
  }
  return {
    activeCard: card,
    patch: { display: undefined, status: card },
  }
}

export function matchesExecutiveCard(
  action: ActionPlanItem,
  card: ExecutiveCardKey | null,
  now = new Date(),
): boolean {
  if (!card || card === 'total') return normalizeActionStatus(action.status) !== 'cancelled'
  if (card === 'late') return isActionLate(action, now)
  return normalizeActionStatus(action.status) === card
}

export function mergeActionPlanFilters(
  filters: ActionPlanFilters,
  patch: Pick<ActionPlanFilters, 'display' | 'status'>,
): ActionPlanFilters {
  return { ...filters, ...patch }
}
