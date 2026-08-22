import { describe, expect, it } from 'vitest'
import {
  applyEditorMonthToUnits,
  clearEditorMonth,
  copyEditorMonth,
  createEditorGrid,
  editorAnnualTotal,
  filterEditorIndicators,
  hydrateEditorGrid,
  patchEditorGrid,
  readEditorSeries,
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

  it('returns null for an empty annual series', () => {
    expect(editorAnnualTotal([null, null])).toBeNull()
    expect(editorAnnualTotal([1, null, 2])).toBe(3)
  })
})

