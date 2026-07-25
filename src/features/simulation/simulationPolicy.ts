const SAFE_SIMULATION_ACTIONS = new Set([
  'view',
  'navigate',
  'filter',
  'search',
  'export',
  'update-carteira-delegated',
])

export function canPerformSimulatedAction(action: string): boolean {
  return SAFE_SIMULATION_ACTIONS.has(action)
}
