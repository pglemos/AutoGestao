import { describe, expect, test } from 'bun:test'
import {
  aggregateClientSalesForStores,
  aggregateOfficialStoreSales,
  calculateClientSalesAttainment,
  getClientSalesNextMidnightDelay,
  getClientSalesTodayKey,
  resolveClientSalesPeriod,
} from './clientSales'

describe('períodos de vendas da carteira', () => {
  const afternoonInSaoPaulo = new Date('2026-08-24T15:00:00.000Z')

  test('usa a data civil de São Paulo, não a data UTC do navegador', () => {
    expect(getClientSalesTodayKey(new Date('2026-08-24T02:00:00.000Z'))).toBe('2026-08-23')
    expect(getClientSalesTodayKey(afternoonInSaoPaulo)).toBe('2026-08-24')
  })

  test('resolve hoje, semana, quinze dias e mês atual', () => {
    expect(resolveClientSalesPeriod('today', '', '', afternoonInSaoPaulo).range).toMatchObject({ startDate: '2026-08-24', endDate: '2026-08-24' })
    expect(resolveClientSalesPeriod('week', '', '', afternoonInSaoPaulo).range).toMatchObject({ startDate: '2026-08-24', endDate: '2026-08-24' })
    expect(resolveClientSalesPeriod('last15days', '', '', afternoonInSaoPaulo).range).toMatchObject({ startDate: '2026-08-10', endDate: '2026-08-24' })
    expect(resolveClientSalesPeriod('month', '', '', afternoonInSaoPaulo).range).toMatchObject({ startDate: '2026-08-01', endDate: '2026-08-24' })
  })

  test('semana começa na segunda-feira e customizado valida a ordem', () => {
    const sunday = new Date('2026-08-23T15:00:00.000Z')
    expect(resolveClientSalesPeriod('week', '', '', sunday).range).toMatchObject({ startDate: '2026-08-17', endDate: '2026-08-23' })
    expect(resolveClientSalesPeriod('custom', '2026-08-01', '2026-08-15', afternoonInSaoPaulo).range).toMatchObject({ startDate: '2026-08-01', endDate: '2026-08-15' })
    expect(resolveClientSalesPeriod('custom', '2026-08-16', '2026-08-15', afternoonInSaoPaulo).error).toContain('posterior')
    expect(resolveClientSalesPeriod('custom', '', '', afternoonInSaoPaulo).error).toContain('Informe')
  })

  test('agenda a próxima virada de dia no fuso de São Paulo', () => {
    const now = new Date('2026-08-24T20:00:00.000Z')
    const delay = getClientSalesNextMidnightDelay(now)
    expect(delay).toBeGreaterThan(7 * 60 * 60 * 1000)
    expect(delay).toBeLessThan(8 * 60 * 60 * 1000)
  })
})

describe('agregação das vendas oficiais por loja', () => {
  test('soma linhas da RPC por loja e preserva a última competência', () => {
    const result = aggregateOfficialStoreSales([
      { store_id: 'store-1', competencia: '2026-08-02', vendas: 2, faturamento: '120000' },
      { store_id: 'store-1', competencia: '2026-08-10', vendas: '3', faturamento: 180000 },
      { store_id: 'store-2', competencia: '2026-08-08', vendas: 1, faturamento: null },
      { store_id: null, competencia: '2026-08-12', vendas: 99, faturamento: 99 },
    ])
    expect(result.get('store-1')).toEqual({ sales: 5, revenue: 300000, lastSaleDate: '2026-08-10' })
    expect(result.get('store-2')).toEqual({ sales: 1, revenue: 0, lastSaleDate: '2026-08-08' })
    expect(result.has('')).toBe(false)
  })

  test('calcula atingimento contra a meta mensal e não inventa percentual sem meta', () => {
    expect(calculateClientSalesAttainment(5, 10)).toBe(50)
    expect(calculateClientSalesAttainment(12, 10)).toBe(120)
    expect(calculateClientSalesAttainment(5, 0)).toBeNull()
  })

  test('consolida matriz e filiais na linha do mesmo cliente', () => {
    expect(aggregateClientSalesForStores(['matrix', 'branch-1'], [
      { storeId: 'matrix', sales: 5, revenue: 100, monthlyGoal: 10, lastSaleDate: '2026-08-10' },
      { storeId: 'branch-1', sales: 3, revenue: 60, monthlyGoal: 8, lastSaleDate: '2026-08-12' },
      { storeId: 'other', sales: 99, revenue: 999, monthlyGoal: 99, lastSaleDate: '2026-08-20' },
    ])).toMatchObject({
      sales: 8,
      revenue: 160,
      monthlyGoal: 18,
      attainment: (8 / 18) * 100,
      storesWithSales: 2,
      configuredGoalStores: 2,
      lastSaleDate: '2026-08-12',
    })
  })
})
