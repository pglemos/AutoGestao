import type { StrategicDisplayMode, StrategicRouteState, StrategicTab } from './strategicPlan.types'

const validTabs = new Set<StrategicTab>(['resumo', 'visao-geral'])
const validModes = new Set<StrategicDisplayMode>(['both', 'table', 'chart'])

export function resolveInitialStrategicDisplayMode({
  width,
  saved,
}: {
  width: number
  saved?: StrategicDisplayMode | null
}): StrategicDisplayMode {
  if (width < 768) return saved === 'chart' ? 'chart' : 'table'
  return saved && validModes.has(saved) ? saved : 'both'
}

export function readStrategicRouteState(search: string): StrategicRouteState {
  const params = new URLSearchParams(search)
  const rawTab = params.get('tab') as StrategicTab | null
  return {
    tab: rawTab && validTabs.has(rawTab) ? rawTab : 'resumo',
    indicatorId: params.get('indicator'),
  }
}

export function writeStrategicRouteState(
  search: string,
  state: { tab?: StrategicTab; indicatorId?: string | null },
): string {
  const params = new URLSearchParams(search)
  if (state.tab) params.set('tab', state.tab)
  if (typeof state.indicatorId !== 'undefined') {
    if (state.indicatorId) params.set('indicator', state.indicatorId)
    else params.delete('indicator')
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}
