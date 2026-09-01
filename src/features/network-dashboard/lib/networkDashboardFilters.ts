import type { NetworkCockpitStore, NetworkSort, NetworkStatusFilter, StoreDiagnostic } from '../types'

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
}

export function getStoreDiagnosticStatus(row: StoreDiagnostic): Exclude<NetworkStatusFilter, 'all'> {
  const quality = row.dataQuality
  if (quality?.operational === 'no_data' || quality?.operational === 'unknown') return 'alert'
  if (quality?.goal === 'not_configured' || quality?.goal === 'unknown') return 'alert'
  if (quality?.discipline === 'no_data' || quality?.discipline === 'unknown') return 'alert'
  if ((!quality || quality.discipline === 'available') && (row.disciplinePct < 50 || row.ritmo < 50)) return 'critical'
  if (row.riskReasons?.length) return 'alert'
  if (row.goal > 0 && row.sales >= row.goal) return 'target'
  return 'healthy'
}

export function getStorePendingCount(row: Pick<NetworkCockpitStore, 'pendingClosures' | 'overdueActions' | 'blockedActions' | 'awaitingValidationActions' | 'consultingEvidencePending' | 'consultingParticipantsPending'>): number {
  return row.pendingClosures + row.overdueActions + row.blockedActions + row.awaitingValidationActions + row.consultingEvidencePending + row.consultingParticipantsPending
}

function isNetworkCockpitStore(row: StoreDiagnostic): row is NetworkCockpitStore {
  return 'pendingClosures' in row
}

/** Ordena a fila inicial pelo que pede decisão antes da exploração detalhada. */
export function prioritizeStoreDiagnostics<T extends StoreDiagnostic>(rows: T[]): T[] {
  const statusRank: Record<Exclude<NetworkStatusFilter, 'all'>, number> = {
    critical: 0,
    alert: 1,
    target: 2,
    healthy: 3,
  }

  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const statusOrder = statusRank[getStoreDiagnosticStatus(a.row)] - statusRank[getStoreDiagnosticStatus(b.row)]
      if (statusOrder !== 0) return statusOrder
      const riskOrder = (b.row.riskReasons?.length ?? 0) - (a.row.riskReasons?.length ?? 0)
      if (riskOrder !== 0) return riskOrder
      const aPending = isNetworkCockpitStore(a.row) ? getStorePendingCount(a.row) : 0
      const bPending = isNetworkCockpitStore(b.row) ? getStorePendingCount(b.row) : 0
      if (bPending !== aPending) return bPending - aPending
      if (b.row.gap !== a.row.gap) return b.row.gap - a.row.gap
      return a.index - b.index
    })
    .map(({ row }) => row)
}

export function filterAndSortStoreDiagnostics<T extends StoreDiagnostic>(input: {
  rows: T[]
  search: string
  status: NetworkStatusFilter
  sort: NetworkSort
}): T[] {
  const term = normalize(input.search)
  return input.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !term || normalize(row.name).includes(term))
    .filter(({ row }) => input.status === 'all' || getStoreDiagnosticStatus(row) === input.status)
    .sort((a, b) => {
      const left = a.row[input.sort.key]
      const right = b.row[input.sort.key]
      const order = typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), 'pt-BR')
      if (order === 0) return a.index - b.index
      return input.sort.direction === 'asc' ? order : -order
    })
    .map(({ row }) => row)
}
