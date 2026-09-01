import { describe, expect, test } from 'bun:test'
import { filterAndSortStoreDiagnostics, getStoreDiagnosticStatus, getStorePendingCount, prioritizeStoreDiagnostics } from './networkDashboardFilters'
import type { NetworkCockpitStore, StoreDiagnostic } from '../types'

const make = (id: string, name: string, sales: number, goal = 10, disciplinePct = 100, dataQuality?: StoreDiagnostic['dataQuality'], riskReasons: string[] = []): StoreDiagnostic => ({
  id, name, sales, goal, disciplinePct, dataQuality, riskReasons, leads: 10, agd: 1, vis: 1, gap: Math.max(0, goal - sales), proj: sales, ritmo: goal ? sales / goal * 100 : 0, efficiency: sales * 10, sellers: 1, checkedInToday: 1,
})

const asCockpit = (row: StoreDiagnostic, pending = 0): NetworkCockpitStore => ({
  ...row,
  pendingClosures: pending,
  overdueActions: 0,
  blockedActions: 0,
  awaitingValidationActions: 0,
  completedActions: 0,
  totalActions: 0,
  strategicProgress: { value: 0, universe: 0, percentage: null, periodStart: '2026-07-01', periodEnd: '2026-07-31', source: 'test' },
  consultingProgress: { value: 0, universe: 0, percentage: null, periodStart: '2026-07-01', periodEnd: '2026-07-31', source: 'test' },
  consultingDeliveryProgress: { value: 0, universe: 0, percentage: null, periodStart: '2026-07-01', periodEnd: '2026-07-31', source: 'test' },
  consultingEvidencePending: 0,
  consultingParticipantsPending: 0,
  sellersEvolution: [],
  managersEvolution: [],
  ownerEvolution: null,
  riskReasons: row.riskReasons || [],
  sources: {},
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

  test('classifica estados de qualidade antes dos valores numéricos', () => {
    expect(getStoreDiagnosticStatus(make('no-data', 'Sem dado', 0, 10, 0, { operational: 'no_data', goal: 'configured', discipline: 'no_data' }))).toBe('alert')
    expect(getStoreDiagnosticStatus(make('unknown-discipline', 'Disciplina desconhecida', 0, 10, 0, { operational: 'available', goal: 'configured', discipline: 'unknown' }))).toBe('alert')
    expect(getStoreDiagnosticStatus(make('target', 'Meta', 10))).toBe('target')
    expect(getStoreDiagnosticStatus(make('healthy', 'Em dia', 6))).toBe('healthy')
  })

  test('prioriza risco e pendências sem alterar a entrada', () => {
    const critical = asCockpit(make('critical', 'Crítica', 1, 10, 40, undefined, ['Disciplina diária abaixo de 50%']))
    const alertWithPending = asCockpit(make('alert-pending', 'Atenção com pendências', 8, 10, 80, { operational: 'no_data', goal: 'configured', discipline: 'no_data' }, ['Sem dados operacionais no período']), 4)
    const alertWithoutPending = asCockpit(make('alert', 'Atenção', 8, 10, 80, { operational: 'unknown', goal: 'configured', discipline: 'unknown' }, ['Disponibilidade operacional não confirmada']))
    const healthy = asCockpit(make('healthy', 'Em dia', 10, 10, 100))
    const input = [healthy, alertWithoutPending, critical, alertWithPending]

    expect(prioritizeStoreDiagnostics(input).map(row => row.id)).toEqual(['critical', 'alert-pending', 'alert', 'healthy'])
    expect(input.map(row => row.id)).toEqual(['healthy', 'alert', 'critical', 'alert-pending'])
  })

  test('soma todas as filas de exceção em uma pendência única', () => {
    const row = asCockpit(make('pending', 'Pendências', 2), 1)
    row.overdueActions = 2
    row.blockedActions = 3
    row.awaitingValidationActions = 4
    row.consultingEvidencePending = 5
    row.consultingParticipantsPending = 6
    expect(getStorePendingCount(row)).toBe(21)
  })
})
