export type StrategicDisplayMode = 'both' | 'table' | 'chart'
export type StrategicTab = 'resumo' | 'visao-geral'

export type StrategicSeries = {
  id: string
  code: string
  name: string
  area: string
  direction: string
  displayFormat?: string
  decimalPlaces?: number
  aggregationMode?: string
  unitLabel?: string
  targetValues: Array<number | null>
  currentValues: Array<number | null>
  previousYearValues: Array<number | null>
  [key: string]: unknown
}

export type StrategicActionPayload = {
  indicatorId: string
  action: string
  problem?: string
  note?: string
  area?: string
  responsible?: string
  deadline?: string | null
  priority?: string
  createdBy?: string
  [key: string]: unknown
}

export type StrategicHistoryEntry = {
  id: string
  previousValues: Array<number | null>
  newValues: Array<number | null>
  timestamp: string
  user: string
  note?: string | null
}

export type StrategicPlanLoadInput = {
  storeId: string | null
  year: number
  clientId?: string | null
  versionId?: string | null
  month?: number | null
  view?: string | null
  scopeType?: string | null
}

export type StrategicPlanRepository = {
  load(input: StrategicPlanLoadInput): Promise<void>
  getOverviewData(year?: number): StrategicSeries[]
  getIndicatorById(id: string): StrategicSeries | null
  getIndicatorSeries(id: string, year?: number): StrategicSeries | null
  getActionItems(id?: string): Array<Record<string, unknown>>
  getTargetHistory(id: string, year: number): StrategicHistoryEntry[]
  restoreHistoryVersion(id: string, actor?: unknown): Promise<void>
  getPreferences(): { displayMode?: StrategicDisplayMode }
  setPreferences(input: { displayMode: StrategicDisplayMode }): void
  updateTargets(id: string, year: number, values: Array<number | null>, actor?: unknown, note?: string): Promise<void>
  createActionItem(payload: StrategicActionPayload): Promise<Record<string, unknown> | null>
  exportIndicatorData(id: string, year: number): string
  exportOverviewData(year?: number): string
}

export type StrategicRouteState = {
  tab: StrategicTab
  indicatorId: string | null
}
