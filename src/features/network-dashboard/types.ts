export type NetworkDateRange = { start: string; end: string }
export type NetworkTimeframe = 'hoje' | 'ontem' | 'semanal' | 'mensal' | 'personalizada'
export type NetworkStatusFilter = 'all' | 'alert' | 'critical' | 'target' | 'healthy'

export type NetworkDataAvailability = 'available' | 'no_data' | 'unknown'
export type NetworkGoalAvailability = 'configured' | 'not_configured' | 'unknown'

/** Estado de qualidade separado do valor numérico exibido no cockpit. */
export type NetworkDataQuality = {
  operational: NetworkDataAvailability
  goal: NetworkGoalAvailability
  discipline: NetworkDataAvailability
}

export type NetworkMetricState = 'value' | 'zero' | 'partial' | 'no_data' | 'not_configured' | 'unknown'

export type NetworkDashboardMetrics = {
  stores: number
  sales: number
  goal: number
  critical: number
  attention: number
  target: number
  healthy: number
  storesWithData: number
  storesWithoutData: number
  storesWithUnknownData: number
  storesWithGoal: number
  storesWithoutGoal: number
  storesWithUnknownGoal: number
  salesState: NetworkMetricState
  attainmentState: NetworkMetricState
}

export type TraceableMetric = {
  value: number | null
  universe: number | null
  percentage?: number | null
  periodStart: string
  periodEnd: string
  source: string
}

export type PersonEvolution = {
  userId: string
  name: string
  role: 'vendedor' | 'gerente' | 'dono'
  status: 'healthy' | 'attention' | 'critical' | 'without_data'
  metrics: Record<string, TraceableMetric>
  reasons: string[]
}

export type StoreDiagnostic = {
  id: string
  name: string
  leads: number
  agd: number
  vis: number
  sales: number
  goal: number
  gap: number
  proj: number
  ritmo: number
  efficiency: number
  sellers: number
  checkedInToday: number
  disciplinePct: number
  dataQuality?: NetworkDataQuality
  /** Presente no cockpit completo; opcional para manter os filtros reutilizáveis. */
  riskReasons?: string[]
}

export type NetworkCockpitStore = StoreDiagnostic & {
  pendingClosures: number
  overdueActions: number
  blockedActions: number
  awaitingValidationActions: number
  completedActions: number
  totalActions: number
  strategicProgress: TraceableMetric
  consultingProgress: TraceableMetric
  consultingDeliveryProgress: TraceableMetric
  consultingEvidencePending: number
  consultingParticipantsPending: number
  sellersEvolution: PersonEvolution[]
  managersEvolution: PersonEvolution[]
  ownerEvolution: PersonEvolution | null
  riskReasons: string[]
  sources: Record<string, string>
}

export type NetworkSort = {
  key: keyof StoreDiagnostic
  direction: 'asc' | 'desc'
}

export type NetworkReportType = 'matinal' | 'semanal' | 'mensal'
