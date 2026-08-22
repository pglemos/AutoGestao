import { describe, expect, test } from 'bun:test'
import { planSalesOtherRepairs } from './repairOwnerStrategicPlanData'
import { pickExecutiveCards } from './pickExecutiveCards'

const july = new Date('2026-08-15T12:00:00Z')

describe('planSalesOtherRepairs', () => {
  test('zera Outros em competência fechada quando há canal e Outros está vazio', () => {
    const planned = planSalesOtherRepairs([
      { loja_id: 'bh', indicator_code: 'SALES_WALKIN', year: 2026, month: 7, meta: 10, realizado: 25, ano_anterior: null },
      { loja_id: 'bh', indicator_code: 'SALES_OTHER', year: 2026, month: 7, meta: 0, realizado: null, ano_anterior: null },
    ], ['bh'], 2026, july)
    expect(planned.write).toEqual([{ storeId: 'bh', month: 7, indicatorCode: 'SALES_OTHER' }])
  })

  test('não reescreve zero já gravado e não toca valor oficial', () => {
    const planned = planSalesOtherRepairs([
      { loja_id: 'bh', indicator_code: 'sales_walkin', year: 2026, month: 7, meta: 10, realizado: 25, ano_anterior: null },
      { loja_id: 'bh', indicator_code: 'sales_other', year: 2026, month: 7, meta: 0, realizado: 0, ano_anterior: null },
      { loja_id: 'ct', indicator_code: 'SALES_WALKIN', year: 2026, month: 7, meta: 10, realizado: 25, ano_anterior: null },
      { loja_id: 'ct', indicator_code: 'SALES_OTHER', year: 2026, month: 7, meta: 0, realizado: 3, ano_anterior: null },
    ], ['bh', 'ct'], 2026, july)
    expect(planned.write).toEqual([])
    expect(planned.alreadyZero).toBe(1)
  })

  test('não zera mês aberto', () => {
    const planned = planSalesOtherRepairs([
      { loja_id: 'bh', indicator_code: 'SALES_WALKIN', year: 2026, month: 8, meta: 10, realizado: 1, ano_anterior: null },
      { loja_id: 'bh', indicator_code: 'SALES_OTHER', year: 2026, month: 8, meta: 0, realizado: null, ano_anterior: null },
    ], ['bh'], 2026, july)
    expect(planned.write).toEqual([])
    expect(planned.skippedOpenMonths).toBeGreaterThan(0)
  })
})

describe('pickExecutiveCards', () => {
  test('escolhe pelo roster oficial, não por SP-001 fixo', () => {
    const series = [
      { id: 'SALES_TOTAL', code: 'SALES_TOTAL', name: 'Vendas Total' },
      { id: 'LEADS_RECEIVED', code: 'LEADS_RECEIVED', name: 'Leads' },
      { id: 'VISITS_VOLUME', code: 'VISITS_VOLUME', name: 'Visitas' },
    ]
    expect(pickExecutiveCards(series).map(item => item.id)).toEqual(['SALES_TOTAL', 'LEADS_RECEIVED', 'VISITS_VOLUME'])
  })

  test('sem códigos oficiais usa os primeiros do roster carregado', () => {
    const series = [
      { id: 'custom-a', code: 'custom-a', name: 'A' },
      { id: 'custom-b', code: 'custom-b', name: 'B' },
    ]
    expect(pickExecutiveCards(series).map(item => item.id)).toEqual(['custom-a', 'custom-b'])
  })
})
