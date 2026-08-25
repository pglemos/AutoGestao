import { describe, expect, it } from 'vitest'
import { BASE44_STANDARD_INDICATORS } from './canonicalBase44Catalog'
import {
  applyEditorMonthToUnits,
  clearEditorMonth,
  copyEditorMonth,
  createEditorGrid,
  groupEditorIndicatorsByArea,
  editorAnnualTotal,
  filterEditorIndicators,
  hydrateEditorGrid,
  patchEditorGrid,
  readEditorSeries,
  applyEditorMonthToYear,
  recalculateEditorGrid,
  sortEditorIndicators,
} from './strategicPlanEditor'

describe('strategicPlanEditor', () => {
  it('hydrates a complete unit x indicator x month grid without inventing values', () => {
    const grid = hydrateEditorGrid([
      { loja_id: 'matriz', indicator_code: 'sales_total', month: 1, meta: 10, realizado: 8, ano_anterior: 7 },
    ], ['matriz', 'filial'], ['sales_total', 'seller_count'])

    expect(readEditorSeries(grid, 'matriz', 'sales_total', 'meta')).toEqual([10, null, null, null, null, null, null, null, null, null, null, null])
    expect(readEditorSeries(grid, 'filial', 'sales_total', 'meta')).toHaveLength(12)
    expect(readEditorSeries(grid, 'filial', 'sales_total', 'meta').every(value => value === null)).toBe(true)
  })

  it('hydrates persisted alias keys onto the official roster code', () => {
    const grid = hydrateEditorGrid([
      { loja_id: 'matriz', indicator_code: 'sales_door_flow', month: 1, meta: 15, realizado: null, ano_anterior: null },
      { loja_id: 'matriz', indicator_code: 'SALES_TOTAL', month: 1, meta: 55, realizado: null, ano_anterior: null },
    ], ['matriz'], ['sales_walkin', 'sales_total'])

    expect(readEditorSeries(grid, 'matriz', 'sales_walkin', 'meta')[0]).toBe(15)
    expect(readEditorSeries(grid, 'matriz', 'sales_total', 'meta')[0]).toBe(55)
  })

  it('does not let a null official row wipe a persisted alias', () => {
    const grid = hydrateEditorGrid([
      { loja_id: 'matriz', indicator_code: 'sales_door_flow', month: 1, meta: 15, realizado: null, ano_anterior: null },
      { loja_id: 'matriz', indicator_code: 'sales_walkin', month: 1, meta: null, realizado: null, ano_anterior: null },
    ], ['matriz'], ['sales_walkin'])

    expect(readEditorSeries(grid, 'matriz', 'sales_walkin', 'meta')[0]).toBe(15)
  })

  it('recalculates official totals onto the roster keys after hydrating aliases', () => {
    const indicators = BASE44_STANDARD_INDICATORS.map(item => ({
      metric_key: item.code.toLowerCase(),
      formula_expression: item.formula_expression,
    }))
    const codes = indicators.map(item => item.metric_key)
    const grid = recalculateEditorGrid(hydrateEditorGrid([
      { loja_id: 'matriz', indicator_code: 'sales_door_flow', month: 1, meta: 15, realizado: null, ano_anterior: null },
      { loja_id: 'matriz', indicator_code: 'sales_referral', month: 1, meta: 5, realizado: null, ano_anterior: null },
      { loja_id: 'matriz', indicator_code: 'sales_company_wallet', month: 1, meta: 5, realizado: null, ano_anterior: null },
      { loja_id: 'matriz', indicator_code: 'sales_seller_wallet', month: 1, meta: 10, realizado: null, ano_anterior: null },
      { loja_id: 'matriz', indicator_code: 'sales_internet', month: 1, meta: 20, realizado: null, ano_anterior: null },
      { loja_id: 'matriz', indicator_code: 'sales_other', month: 1, meta: 0, realizado: null, ano_anterior: null },
      { loja_id: 'matriz', indicator_code: 'sales_walkin', month: 1, meta: null, realizado: null, ano_anterior: null },
    ], ['matriz'], codes), ['matriz'], indicators)

    expect(readEditorSeries(grid, 'matriz', 'sales_total', 'meta')[0]).toBe(55)
    expect(readEditorSeries(grid, 'matriz', 'sales_walkin', 'meta')[0]).toBe(15)
  })

  it('copies one month only for editable indicators', () => {
    let grid = createEditorGrid(['matriz'], ['manual', 'calculado'])
    grid = patchEditorGrid(grid, { unitId: 'matriz', indicatorCode: 'manual', month: 2, field: 'meta', value: 42 })
    const result = copyEditorMonth(grid, {
      unitId: 'matriz', sourceMonth: 2, targetMonth: 3, field: 'meta',
      indicatorCodes: ['manual', 'calculado'], editableCodes: new Set(['manual']),
    })

    expect(result.patches).toHaveLength(1)
    expect(result.grid.matriz.manual[3].meta).toBe(42)
    expect(result.grid.matriz.calculado[3].meta).toBeNull()
  })

  it('applies a month to all other active units and can clear it', () => {
    let grid = createEditorGrid(['matriz', 'filial'], ['sales_total'])
    grid = patchEditorGrid(grid, { unitId: 'matriz', indicatorCode: 'sales_total', month: 5, field: 'realizado', value: 9 })
    const applied = applyEditorMonthToUnits(grid, {
      sourceUnitId: 'matriz', targetUnitIds: ['matriz', 'filial'], month: 5,
      field: 'realizado', indicatorCodes: ['sales_total'],
    })
    expect(applied.grid.filial.sales_total[5].realizado).toBe(9)

    const cleared = clearEditorMonth(applied.grid, {
      unitId: 'filial', month: 5, field: 'realizado', indicatorCodes: ['sales_total'],
    })
    expect(cleared.grid.filial.sales_total[5].realizado).toBeNull()
  })

  it('filters by search, area and hidden state, then sorts by official order', () => {
    const indicators = [
      { metric_key: 'b', label: 'Vendas', area: 'Vendas', display_order: 20, visible_to_owner: true },
      { metric_key: 'a', label: 'Atendimentos', area: 'Funil', display_order: 10, visible_to_owner: false },
    ]
    expect(filterEditorIndicators(indicators, { search: 'vendas', area: 'Vendas' })).toHaveLength(1)
    expect(filterEditorIndicators(indicators, { includeHidden: true })).toHaveLength(2)
    expect(sortEditorIndicators(indicators).map(indicator => indicator.metric_key)).toEqual(['a', 'b'])
    expect(sortEditorIndicators(indicators, 'nome').map(indicator => indicator.metric_key)).toEqual(['a', 'b'])
  })

  it('prefers Base44 global order over stale display_order no ciclo', () => {
    const indicators = [
      { metric_key: 'contribution_margin', label: 'Margem', area: 'Financeiro', display_order: 1 },
      { metric_key: 'sales_total', label: 'Total de Vendas', area: 'Comercial', display_order: 99 },
      { metric_key: 'sales_walkin', label: 'Balcão', area: 'Comercial', display_order: 2 },
    ]
    expect(sortEditorIndicators(indicators).map(indicator => indicator.metric_key))
      .toEqual(['sales_total', 'sales_walkin', 'contribution_margin'])
  })

  it('returns null for an empty annual series', () => {
    expect(editorAnnualTotal([null, null])).toBeNull()
    expect(editorAnnualTotal([1, null, 2])).toBe(3)
  })

  it('applyEditorMonthToYear marca 11 meses a partir da origem', () => {
    const grid = hydrateEditorGrid([
      { loja_id: 'u1', indicator_code: 'SALES_WALKIN', month: 1, meta: 10, realizado: null, ano_anterior: null },
    ], ['u1'], ['SALES_WALKIN'])
    const { patches } = applyEditorMonthToYear(grid, {
      unitId: 'u1',
      sourceMonth: 1,
      field: 'meta',
      indicatorCodes: ['SALES_WALKIN'],
    })
    expect(patches).toHaveLength(11)
    expect(patches.every(p => p.value === 10)).toBe(true)
  })
})

describe('groupEditorIndicatorsByArea', () => {
  it('junta a mesma área em um único bloco mesmo intercalada', () => {
    const groups = groupEditorIndicatorsByArea([
      { metric_key: 'a', area: 'Comercial' },
      { metric_key: 'b', area: 'Marketing' },
      { metric_key: 'c', area: 'Comercial' },
      { metric_key: 'd', area: null },
    ])
    expect(groups.map(group => group.area)).toEqual(['Comercial', 'Marketing', 'Sem área'])
    expect(groups[0].items.map(item => item.metric_key)).toEqual(['a', 'c'])
  })
})
