import { describe, expect, test } from 'bun:test'
import { resolveNetworkDateRange, validateNetworkDateRange, buildStoreDiagnostic } from './networkDashboardCalculations'

describe('network dashboard calculations', () => {
  const now = new Date('2026-07-25T12:00:00-03:00')
  test('resolves common periods', () => {
    expect(resolveNetworkDateRange('hoje', { start: '', end: '' }, now)).toEqual({ start: '2026-07-25', end: '2026-07-25' })
    expect(resolveNetworkDateRange('ontem', { start: '', end: '' }, now)).toEqual({ start: '2026-07-24', end: '2026-07-24' })
    expect(resolveNetworkDateRange('semanal', { start: '', end: '' }, now)).toEqual({ start: '2026-07-20', end: '2026-07-26' })
    expect(resolveNetworkDateRange('mensal', { start: '', end: '' }, now)).toEqual({ start: '2026-07-01', end: '2026-07-31' })
  })
  test('validates custom period', () => {
    expect(validateNetworkDateRange({ start: '2025-01-01', end: '2026-07-25' })).toContain('366')
    expect(validateNetworkDateRange({ start: '2026-08-01', end: '2026-07-25' })).toContain('anterior')
  })
  test('builds stable metrics without division by zero', () => {
    const row = buildStoreDiagnostic({ id: '1', name: 'A', leads: 0, agd: 0, vis: 0, sales: 0, goal: 0, sellers: 0, checkedInToday: 0, elapsedDays: 0, totalDays: 0 })
    expect(row.efficiency).toBe(0)
    expect(row.disciplinePct).toBe(0)
  })
})
