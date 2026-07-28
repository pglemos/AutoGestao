import type { NetworkSort, NetworkStatusFilter, StoreDiagnostic } from '../types'

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
}

export function getStoreDiagnosticStatus(row: StoreDiagnostic): Exclude<NetworkStatusFilter, 'all'> {
  if (row.goal > 0 && row.sales >= row.goal) return 'target'
  if (row.disciplinePct < 50 || row.ritmo < 50) return 'critical'
  return 'alert'
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
