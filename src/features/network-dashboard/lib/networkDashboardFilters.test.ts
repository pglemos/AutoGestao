import { describe, expect, test } from 'bun:test'
import { filterAndSortStoreDiagnostics } from './networkDashboardFilters'
import type { StoreDiagnostic } from '../types'

const make = (id: string, name: string, sales: number, goal = 10, disciplinePct = 100): StoreDiagnostic => ({
  id, name, sales, goal, disciplinePct, leads: 10, agd: 1, vis: 1, gap: Math.max(0, goal - sales), proj: sales, ritmo: goal ? sales / goal * 100 : 0, efficiency: sales * 10, sellers: 1, checkedInToday: 1,
})

describe('network dashboard filters', () => {
  test('search is accent insensitive', () => {
    const result = filterAndSortStoreDiagnostics({ rows: [make('1', 'São José', 2)], search: 'sao', status: 'all', sort: { key: 'sales', direction: 'desc' } })
    expect(result).toHaveLength(1)
  })
  test('filters target and keeps stable order on ties', () => {
    const rows = [make('a', 'A', 10), make('b', 'B', 10), make('c', 'C', 2)]
    const result = filterAndSortStoreDiagnostics({ rows, search: '', status: 'target', sort: { key: 'sales', direction: 'desc' } })
    expect(result.map(row => row.id)).toEqual(['a', 'b'])
  })
})
