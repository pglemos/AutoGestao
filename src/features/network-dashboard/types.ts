export type NetworkDateRange = { start: string; end: string }
export type NetworkTimeframe = 'hoje' | 'ontem' | 'semanal' | 'mensal' | 'personalizada'
export type NetworkStatusFilter = 'all' | 'alert' | 'critical' | 'target'

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
