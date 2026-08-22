import { catalogAliasKeys, matchCanonicalIndicator } from './canonicalBase44Catalog'
import { MONTHS, applyOfficialComputedMetas } from './indicatorFormulas'

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
  return hydrateEditorGrid(
    applyOfficialComputedMetas({ values, indicators, unitIds }),
    unitIds,
    indicators.map(indicator => indicator.metric_key),
  )
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

export function groupEditorIndicatorsByArea<T extends { area?: string | null }>(indicators: T[]) {
  const groups: Array<{ area: string; items: T[] }> = []
  for (const item of indicators) {
    const area = item.area || 'Sem área'
    const last = groups[groups.length - 1]
    if (last && last.area === area) last.items.push(item)
    else groups.push({ area, items: [item] })
  }
  return groups
}

export function sortEditorIndicators<T extends EditorIndicatorLike>(indicators: T[], order: 'ordem' | 'nome' = 'ordem'): T[] {
  return [...indicators].sort((a, b) => {
    if (order === 'nome') return a.label.localeCompare(b.label, 'pt-BR')
    const aOrder = a.display_order ?? a.sort_order ?? Number.MAX_SAFE_INTEGER
    const bOrder = b.display_order ?? b.sort_order ?? Number.MAX_SAFE_INTEGER
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
