import { describe, expect, test } from 'bun:test'
import type { RankingEntry } from '@/types/database'
import {
  buildSellerPerformanceViewModel,
  calculatePeriodDates,
  createLatestRequestGuard,
  sortSellerRanking,
} from './sellerPerformanceViewModel'

describe('seller performance view model', () => {
  test('handles zero leads and request invalidation', () => {
    const model = buildSellerPerformanceViewModel({
      user_id: '1',
      user_name: 'A',
      avatar_url: null,
      vnd_total: 2,
      leads: 0,
      visitas: 1,
      atingimento: 50,
      ritmo: 2,
    } as never)
    expect(model.conversion).toBe(0)
    const guard = createLatestRequestGuard()
    const a = guard.next()
    const b = guard.next()
    expect(guard.isCurrent(a)).toBe(false)
    expect(guard.isCurrent(b)).toBe(true)
  })

  test('calculates period dates correctly for presets', () => {
    const ref = '2026-08-07'

    const hoje = calculatePeriodDates('hoje', undefined, undefined, ref)
    expect(hoje.startDate).toBe('2026-08-07')
    expect(hoje.endDate).toBe('2026-08-07')
    expect(hoje.label).toBe('Hoje')

    const mesAtual = calculatePeriodDates('mes_atual', undefined, undefined, ref)
    expect(mesAtual.startDate).toBe('2026-08-01')
    expect(mesAtual.endDate).toBe('2026-08-07')

    const mesAnterior = calculatePeriodDates('mes_anterior', undefined, undefined, ref)
    expect(mesAnterior.startDate).toBe('2026-07-01')
    expect(mesAnterior.endDate).toBe('2026-07-31')

    const ultimos30 = calculatePeriodDates('ultimos_30_dias', undefined, undefined, ref)
    expect(ultimos30.endDate).toBe('2026-08-07')
    expect(ultimos30.label).toBe('Últimos 30 dias')

    const custom = calculatePeriodDates('custom', '2026-08-02', '2026-08-05', ref)
    expect(custom.startDate).toBe('2026-08-02')
    expect(custom.endDate).toBe('2026-08-05')
  })

  test('sorts seller ranking entries correctly', () => {
    const sellers = [
      { user_id: '1', user_name: 'Carlos', vnd_total: 10, atingimento: 80 } as RankingEntry,
      { user_id: '2', user_name: 'Ana', vnd_total: 25, atingimento: 100 } as RankingEntry,
      { user_id: '3', user_name: 'Bruno', vnd_total: 5, atingimento: 40 } as RankingEntry,
    ]

    const byNameAsc = sortSellerRanking(sellers, 'name_asc')
    expect(byNameAsc.map(s => s.user_name)).toEqual(['Ana', 'Bruno', 'Carlos'])

    const byNameDesc = sortSellerRanking(sellers, 'name_desc')
    expect(byNameDesc.map(s => s.user_name)).toEqual(['Carlos', 'Bruno', 'Ana'])

    const bySalesDesc = sortSellerRanking(sellers, 'sales_desc')
    expect(bySalesDesc.map(s => s.user_name)).toEqual(['Ana', 'Carlos', 'Bruno'])

    const bySalesAsc = sortSellerRanking(sellers, 'sales_asc')
    expect(bySalesAsc.map(s => s.user_name)).toEqual(['Bruno', 'Carlos', 'Ana'])
  })
})
