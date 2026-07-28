import type { ActionPlanMode, ActionPlanTab } from './actionPlan.types'

export function resolveInitialActionPlanMode(value: string | null | undefined): ActionPlanMode {
  if (value === 'kanban') return 'kanban'
  if (value === 'list' || value === 'table') return 'list'
  return 'focus'
}

export function readActionPlanRouteState(search: string): { tab: ActionPlanTab } {
  const params = new URLSearchParams(search)
  return { tab: params.get('tab') === 'calendario' ? 'calendario' : 'acoes' }
}

export function writeActionPlanRouteState(search: string, state: { tab: ActionPlanTab }): string {
  const params = new URLSearchParams(search)
  params.set('tab', state.tab)
  const result = params.toString()
  return result ? `?${result}` : ''
}
