export type NetworkDateRange = { start: string; end: string }
export type NetworkTimeframe = 'hoje' | 'ontem' | 'semanal' | 'mensal' | 'personalizada'
export type NetworkStatusFilter = 'all' | 'alert' | 'critical' | 'target'

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

export type NetworkSort = {
  key: keyof StoreDiagnostic
  direction: 'asc' | 'desc'
}

export type NetworkReportType = 'matinal' | 'semanal' | 'mensal'
