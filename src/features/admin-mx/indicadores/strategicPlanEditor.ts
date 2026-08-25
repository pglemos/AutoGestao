import { catalogAliasKeys, matchCanonicalIndicator, officialCatalogOrder } from './canonicalBase44Catalog'
import { MONTHS, applyOfficialComputedMetas } from './indicatorFormulas'
import { applyActualComputedPasses, buildMonthlyGrid } from './metasRealizados'

function resolveEditorGridCode(indicatorCode: string, allowed: Set<string>): string | null {
  if (allowed.has(indicatorCode)) return indicatorCode
  const canon = matchCanonicalIndicator(indicatorCode)
  if (!canon) return null
  for (const key of catalogAliasKeys(canon.code)) {
    if (allowed.has(key)) return key
  }
  return null
}

export type Month = typeof MONTHS[number]

export type EditorField = 'meta' | 'realizado' | 'ano_anterior'

export type EditorValue = {
  meta: number | null
  realizado: number | null
  ano_anterior: number | null
}

export type EditorGrid = Record<string, Record<string, Record<number, EditorValue>>>

export type EditorIndicatorLike = {
  metric_key: string
  label: string
  area: string | null
  sort_order?: number | null
  display_order?: number | null
  visible_to_owner?: boolean
  active?: boolean
}

export type EditorPlanningRow = {
  loja_id: string
  indicator_code: string
  month: number | null
  meta: number | null
  realizado: number | null
  ano_anterior: number | null
}

export type EditorCellPatch = {
  unitId: string
  indicatorCode: string
  month: number
  field: EditorField
  value: number | null
}

export const EDITOR_FIELDS: Array<{ key: EditorField; label: string; description: string }> = [
  { key: 'meta', label: 'Meta', description: 'Planejamento mensal que será validado para publicação.' },
  { key: 'realizado', label: 'Realizado', description: 'Resultado lançado contra a meta publicada ou em construção.' },
  { key: 'ano_anterior', label: 'Ano anterior', description: 'Referência histórica mensal para comparação.' },
]

function blankValue(): EditorValue {
  return { meta: null, realizado: null, ano_anterior: null }
}

export function createEditorGrid(unitIds: string[], indicatorCodes: string[]): EditorGrid {
  const grid: EditorGrid = {}
  for (const unitId of unitIds) {
    grid[unitId] = {}
    for (const code of indicatorCodes) {
      grid[unitId][code] = Object.fromEntries(MONTHS.map(month => [month, blankValue()]))
    }
  }
  return grid
}

export function hydrateEditorGrid(
  rows: EditorPlanningRow[],
  unitIds: string[],
  indicatorCodes: string[],
): EditorGrid {
  const grid = createEditorGrid(unitIds, indicatorCodes)
  const allowed = new Set(indicatorCodes)
  for (const row of rows) {
    if (!row.month) continue
    const code = resolveEditorGridCode(row.indicator_code, allowed)
    if (!code || !grid[row.loja_id]?.[code]) continue
    const current = grid[row.loja_id][code][row.month]
    grid[row.loja_id][code][row.month] = {
      meta: row.meta ?? current.meta,
      realizado: row.realizado ?? current.realizado,
      ano_anterior: row.ano_anterior ?? current.ano_anterior,
    }
  }
  return grid
}

export function recalculateEditorGrid(
  grid: EditorGrid,
  unitIds: string[],
  indicators: Array<{ metric_key: string; formula_expression?: string | null }>,
): EditorGrid {
  const values: EditorPlanningRow[] = []
  for (const unitId of unitIds) {
    for (const indicator of indicators) {
      for (const month of MONTHS) {
        const cell = grid[unitId]?.[indicator.metric_key]?.[month]
        values.push({
          loja_id: unitId,
          indicator_code: indicator.metric_key,
          month,
          meta: cell?.meta ?? null,
          realizado: cell?.realizado ?? null,
          ano_anterior: cell?.ano_anterior ?? null,
        })
      }
    }
  }
  const withMeta = hydrateEditorGrid(
    applyOfficialComputedMetas({ values, indicators, unitIds }),
    unitIds,
    indicators.map(indicator => indicator.metric_key),
  )
  const codes = indicators.map(indicator => indicator.metric_key)
  const formulaIndicators = indicators.map(indicator => ({
    code: indicator.metric_key,
    formula_expression: indicator.formula_expression ?? null,
  }))
  const next: EditorGrid = { ...withMeta }
  for (const unitId of unitIds) {
    const unitValues = values.filter(row => row.loja_id === unitId)
    let monthGrid = buildMonthlyGrid(unitValues.map(row => ({
      loja_id: unitId,
      indicator_code: row.indicator_code,
      year: 0,
      month: row.month ?? 1,
      meta: withMeta[unitId]?.[row.indicator_code]?.[row.month ?? 1]?.meta ?? row.meta,
      realizado: withMeta[unitId]?.[row.indicator_code]?.[row.month ?? 1]?.realizado ?? row.realizado,
      ano_anterior: withMeta[unitId]?.[row.indicator_code]?.[row.month ?? 1]?.ano_anterior ?? row.ano_anterior,
    })), codes)
    monthGrid = applyActualComputedPasses(monthGrid, formulaIndicators)
    next[unitId] = { ...(next[unitId] ?? {}) }
    for (const code of codes) {
      next[unitId][code] = { ...(next[unitId][code] ?? {}) }
      for (const month of MONTHS) {
        const cell = monthGrid[code]?.[month]
        next[unitId][code][month] = {
          meta: withMeta[unitId]?.[code]?.[month]?.meta ?? null,
          realizado: cell?.realizado ?? withMeta[unitId]?.[code]?.[month]?.realizado ?? null,
          ano_anterior: cell?.ano_anterior ?? withMeta[unitId]?.[code]?.[month]?.ano_anterior ?? null,
        }
      }
    }
  }
  return next
}

export function readEditorSeries(
  grid: EditorGrid,
  unitId: string,
  indicatorCode: string,
  field: EditorField,
): Array<number | null> {
  return MONTHS.map(month => grid[unitId]?.[indicatorCode]?.[month]?.[field] ?? null)
}

export function patchEditorGrid(grid: EditorGrid, patch: EditorCellPatch): EditorGrid {
  const next: EditorGrid = {
    ...grid,
    [patch.unitId]: {
      ...(grid[patch.unitId] ?? {}),
      [patch.indicatorCode]: {
        ...(grid[patch.unitId]?.[patch.indicatorCode] ?? {}),
        [patch.month]: {
          ...(grid[patch.unitId]?.[patch.indicatorCode]?.[patch.month] ?? blankValue()),
          [patch.field]: patch.value,
        },
      },
    },
  }
  return next
}

export function copyEditorMonth(
  grid: EditorGrid,
  params: {
    unitId: string
    sourceMonth: Month
    targetMonth: Month
    field: EditorField
    indicatorCodes: string[]
    editableCodes?: Set<string>
  },
): { grid: EditorGrid; patches: EditorCellPatch[] } {
  const { unitId, sourceMonth, targetMonth, field, indicatorCodes, editableCodes } = params
  let next = grid
  const patches: EditorCellPatch[] = []
  for (const indicatorCode of indicatorCodes) {
    if (editableCodes && !editableCodes.has(indicatorCode)) continue
    const value = grid[unitId]?.[indicatorCode]?.[sourceMonth]?.[field] ?? null
    next = patchEditorGrid(next, { unitId, indicatorCode, month: targetMonth, field, value })
    patches.push({ unitId, indicatorCode, month: targetMonth, field, value })
  }
  return { grid: next, patches }
}

/** Copia o mês de origem para os demais 11 meses (somente Meta — prompt #20). */
export function applyEditorMonthToYear(
  grid: EditorGrid,
  params: {
    unitId: string
    sourceMonth: Month
    field: EditorField
    indicatorCodes: string[]
    editableCodes?: Set<string>
  },
): { grid: EditorGrid; patches: EditorCellPatch[] } {
  let next = grid
  const patches: EditorCellPatch[] = []
  for (const month of MONTHS) {
    if (month === params.sourceMonth) continue
    const result = copyEditorMonth(next, {
      unitId: params.unitId,
      sourceMonth: params.sourceMonth,
      targetMonth: month,
      field: params.field,
      indicatorCodes: params.indicatorCodes,
      editableCodes: params.editableCodes,
    })
    next = result.grid
    patches.push(...result.patches)
  }
  return { grid: next, patches }
}

export function applyEditorMonthToUnits(
  grid: EditorGrid,
  params: {
    sourceUnitId: string
    targetUnitIds: string[]
    month: Month
    field: EditorField
    indicatorCodes: string[]
    editableCodes?: Set<string>
  },
): { grid: EditorGrid; patches: EditorCellPatch[] } {
  const { sourceUnitId, targetUnitIds, month, field, indicatorCodes, editableCodes } = params
  let next = grid
  const patches: EditorCellPatch[] = []
  for (const targetUnitId of targetUnitIds) {
    if (targetUnitId === sourceUnitId) continue
    for (const indicatorCode of indicatorCodes) {
      if (editableCodes && !editableCodes.has(indicatorCode)) continue
      const value = grid[sourceUnitId]?.[indicatorCode]?.[month]?.[field] ?? null
      next = patchEditorGrid(next, { unitId: targetUnitId, indicatorCode, month, field, value })
      patches.push({ unitId: targetUnitId, indicatorCode, month, field, value })
    }
  }
  return { grid: next, patches }
}

export function clearEditorMonth(
  grid: EditorGrid,
  params: {
    unitId: string
    month: Month
    field: EditorField
    indicatorCodes: string[]
    editableCodes?: Set<string>
  },
): { grid: EditorGrid; patches: EditorCellPatch[] } {
  return applyPatches(grid, params.indicatorCodes.map(indicatorCode => ({
      unitId: params.unitId,
      indicatorCode,
      month: params.month,
      field: params.field,
      value: null,
    })).filter(patch => !params.editableCodes || params.editableCodes.has(patch.indicatorCode)))
}

function applyPatches(grid: EditorGrid, patches: EditorCellPatch[]) {
  let next = grid
  for (const patch of patches) next = patchEditorGrid(next, patch)
  return { grid: next, patches }
}

/**
 * Agrupa por área preservando a ordem de entrada (ordem oficial Base44) dentro
 * de cada área e a ordem de primeira aparição das áreas.
 *
 * Agrupar só por sequência quebrava quando a ordem oficial intercala áreas: o
 * mesmo departamento virava vários blocos, com o cabeçalho repetido e chave de
 * React duplicada.
 */
export function groupEditorIndicatorsByArea<T extends { area?: string | null }>(indicators: T[]) {
  const groups: Array<{ area: string; items: T[] }> = []
  const byArea = new Map<string, { area: string; items: T[] }>()
  for (const item of indicators) {
    const area = item.area || 'Sem área'
    let group = byArea.get(area)
    if (!group) {
      group = { area, items: [] }
      byArea.set(area, group)
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
}

/** Ordem global Base44 (1–45) prevalece sobre display_order local/stale do ciclo. */
export function resolveEditorIndicatorOrder(indicator: EditorIndicatorLike): number {
  const canon = matchCanonicalIndicator(indicator.metric_key)
  if (canon) return officialCatalogOrder(indicator.metric_key)
  return indicator.sort_order ?? indicator.display_order ?? 999
}

export function sortEditorIndicators<T extends EditorIndicatorLike>(indicators: T[], order: 'ordem' | 'nome' = 'ordem'): T[] {
  return [...indicators].sort((a, b) => {
    if (order === 'nome') return a.label.localeCompare(b.label, 'pt-BR')
    const aOrder = resolveEditorIndicatorOrder(a)
    const bOrder = resolveEditorIndicatorOrder(b)
    return aOrder - bOrder || a.label.localeCompare(b.label, 'pt-BR')
  })
}

export function filterEditorIndicators<T extends EditorIndicatorLike>(
  indicators: T[],
  filters: { search?: string; area?: string; includeHidden?: boolean },
): T[] {
  const search = filters.search?.trim().toLocaleLowerCase('pt-BR') ?? ''
  return indicators.filter(indicator => {
    if (!filters.includeHidden && indicator.active === false) return false
    if (!filters.includeHidden && indicator.visible_to_owner === false) return false
    if (filters.area && filters.area !== 'todas' && indicator.area !== filters.area) return false
    if (!search) return true
    return [indicator.metric_key, indicator.label, indicator.area, indicator.metric_key.replace(/_/g, '')]
      .some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(search))
  })
}

export function editorAnnualTotal(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value))
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) : null
}
