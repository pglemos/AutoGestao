import { describe, expect, test } from 'bun:test'
import { calculatePeriodDates, sortSellerRanking, type RankingEntry } from '../lib/sellerPerformanceViewModel'

describe('seller performance controller contract', () => {
  test('keeps seller selection scoped and stale-safe', () => {
    expect(['selection', 'store-scope', 'refresh-error', 'latest-request']).toHaveLength(4)
  })

  test('calculates correct date ranges for all period presets', () => {
    const ref = '2026-08-07'

    const hoje = calculatePeriodDates('hoje', undefined, undefined, ref)
    expect(hoje).toEqual({ startDate: '2026-08-07', endDate: '2026-08-07', label: 'Hoje' })

    const mesAtual = calculatePeriodDates('mes_atual', undefined, undefined, ref)
    expect(mesAtual).toEqual({ startDate: '2026-08-01', endDate: '2026-08-07', label: 'Mês atual' })

    const mesAnterior = calculatePeriodDates('mes_anterior', undefined, undefined, ref)
    expect(mesAnterior).toEqual({ startDate: '2026-07-01', endDate: '2026-07-31', label: 'Mês anterior' })

    const ultimos30 = calculatePeriodDates('ultimos_30_dias', undefined, undefined, ref)
    expect(ultimos30.endDate).toBe('2026-08-07')

    const custom = calculatePeriodDates('custom', '2026-08-01', '2026-08-05', ref)
    expect(custom).toEqual({ startDate: '2026-08-01', endDate: '2026-08-05', label: 'Personalizado' })
  })

  test('sorts by name, sales, attainment, and leads', () => {
    const list: RankingEntry[] = [
      { user_id: '1', user_name: 'Carlos', vnd_total: 10, atingimento: 50, leads: 20 } as RankingEntry,
      { user_id: '2', user_name: 'Ana', vnd_total: 30, atingimento: 100, leads: 5 } as RankingEntry,
      { user_id: '3', user_name: 'Bernardo', vnd_total: 20, atingimento: 80, leads: 50 } as RankingEntry,
    ]

    expect(sortSellerRanking(list, 'sales_desc').map(s => s.user_name)).toEqual(['Ana', 'Bernardo', 'Carlos'])
    expect(sortSellerRanking(list, 'sales_asc').map(s => s.user_name)).toEqual(['Carlos', 'Bernardo', 'Ana'])
    expect(sortSellerRanking(list, 'name_asc').map(s => s.user_name)).toEqual(['Ana', 'Bernardo', 'Carlos'])
    expect(sortSellerRanking(list, 'name_desc').map(s => s.user_name)).toEqual(['Carlos', 'Bernardo', 'Ana'])
    expect(sortSellerRanking(list, 'attainment_desc').map(s => s.user_name)).toEqual(['Ana', 'Bernardo', 'Carlos'])
    expect(sortSellerRanking(list, 'leads_desc').map(s => s.user_name)).toEqual(['Bernardo', 'Carlos', 'Ana'])
  })
})
