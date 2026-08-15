// Metas e realizados — lógica pura (sem Supabase).
//
// Port do Base44 (storeTargetCopyOps + excelTargetImportProcessor + actualCalc +
// QuickEntryView): prévia e execução de cópia de metas entre lojas, plano de
// mudanças de importação, e grade de cadastro rápido.

import { MONTHS, type AnnualAggregation } from './indicatorFormulas'

export type StoreTargetValue = {
  loja_id: string
  indicator_code: string
  year: number
  month: number
  meta: number | null
  realizado: number | null
  ano_anterior: number | null
}

export type TargetIndicator = {
  code: string
  name: string
  department?: string
  calculado?: boolean
}

export type CopyConflictPolicy = 'FILL_EMPTY_ONLY' | 'REPLACE_SELECTED' | 'CELL_BY_CELL'

export const COPY_CONFLICT_LABEL: Record<CopyConflictPolicy, string> = {
  FILL_EMPTY_ONLY: 'Preencher somente campos vazios',
  REPLACE_SELECTED: 'Substituir os valores selecionados',
  CELL_BY_CELL: 'Revisar célula por célula',
}

export type CopyRowAction = 'PREENCHER' | 'SUBSTITUIR' | 'MANTER' | 'IGNORAR'

export type CopyPreviewRow = {
  indicatorCode: string
  indicatorName: string
  department: string
  month: number
  storeId: string
  storeName: string
  sourceValue: number | null
  targetCurrent: number | null
  newValue: number | null
  action: CopyRowAction
  included: boolean
}

export type CopyPreview = {
  rows: CopyPreviewRow[]
  counters: {
    toFill: number
    toReplace: number
    preserved: number
    ignored: number
    calcToRecalc: number
    companyIgnored: number
    totalRows: number
  }
  filteredIndicatorCount: number
}

/** Indicadores "empresariais" não são copiados entre lojas (consolidado). */
export function isCompanyLevelIndicator(indicator: TargetIndicator): boolean {
  return ['INSTAGRAM_FOLLOWERS', 'GOOGLE_BUSINESS_RATING', 'CONTENT_QUALITY', 'TOTAL_EXPENSE', 'AVERAGE_PREPARATION_COST'].includes(indicator.code)
}

/**
 * Prévia da cópia: para cada loja destino × indicador digitável × mês,
 * decide a ação conforme a política de conflito.
 */
export function previewStoreTargetsCopy(params: {
  sourceValues: StoreTargetValue[]
  targetValues: StoreTargetValue[]
  indicators: TargetIndicator[]
  targetStores: Array<{ id: string; name: string }>
  selectedMonths: number[]
  selectedIndicatorCodes: string[]
  conflictPolicy: CopyConflictPolicy
}): CopyPreview {
  const { indicators, targetStores, selectedMonths, conflictPolicy } = params
  const months = selectedMonths.length > 0 ? selectedMonths : [...MONTHS]

  const copyable = indicators.filter(indicator => !indicator.calculado && !isCompanyLevelIndicator(indicator))
  const filtered = params.selectedIndicatorCodes.length > 0
    ? copyable.filter(indicator => params.selectedIndicatorCodes.includes(indicator.code))
    : copyable
  const companyIgnored = indicators.filter(indicator => !indicator.calculado && isCompanyLevelIndicator(indicator))

  const rows: CopyPreviewRow[] = []
  const counters = { toFill: 0, toReplace: 0, preserved: 0, ignored: 0, calcToRecalc: 0, companyIgnored: 0, totalRows: 0 }

  for (const store of targetStores) {
    for (const indicator of filtered) {
      for (const month of months) {
        const source = params.sourceValues.find(value =>
          value.indicator_code === indicator.code && value.month === month,
        )
        const sourceValue = source?.meta ?? null

        if (sourceValue == null) {
          counters.ignored++
          rows.push({
            indicatorCode: indicator.code,
            indicatorName: indicator.name,
            department: indicator.department ?? '',
            month,
            storeId: store.id,
            storeName: store.name,
            sourceValue: null,
            targetCurrent: null,
            newValue: null,
            action: 'IGNORAR',
            included: false,
          })
          continue
        }

        const target = params.targetValues.find(value =>
          value.indicator_code === indicator.code && value.month === month && value.loja_id === store.id,
        )
        const targetCurrent = target?.meta ?? null

        let action: CopyRowAction
        let newValue: number | null
        let included: boolean
        if (targetCurrent == null) {
          action = 'PREENCHER'
          newValue = sourceValue
          included = true
          counters.toFill++
        } else if (conflictPolicy === 'FILL_EMPTY_ONLY') {
          action = 'MANTER'
          newValue = targetCurrent
          included = false
          counters.preserved++
        } else {
          action = 'SUBSTITUIR'
          newValue = sourceValue
          included = true
          counters.toReplace++
        }

        rows.push({
          indicatorCode: indicator.code,
          indicatorName: indicator.name,
          department: indicator.department ?? '',
          month,
          storeId: store.id,
          storeName: store.name,
          sourceValue,
          targetCurrent,
          newValue,
          action,
          included,
        })
      }
    }
  }

  counters.calcToRecalc = indicators.filter(indicator => indicator.calculado).length
  counters.companyIgnored = companyIgnored.length
  counters.totalRows = rows.length

  return { rows, counters, filteredIndicatorCount: filtered.length }
}

export type CopyMutation = {
  loja_id: string
  indicator_code: string
  year: number
  month: number
  meta: number
}

/** Executa a cópia na memória: cria os valores a gravar para cada loja destino. */
export function buildStoreCopyMutations(params: {
  preview: CopyPreview
  year: number
  conflictPolicy: CopyConflictPolicy
  includedRows?: Record<string, boolean>
}): CopyMutation[] {
  const { preview, year, conflictPolicy, includedRows } = params
  const mutations: CopyMutation[] = []

  for (const row of preview.rows) {
    if (row.action === 'IGNORAR' || row.action === 'MANTER') continue
    if (conflictPolicy === 'CELL_BY_CELL') {
      const key = `${row.indicatorCode}|${row.month}|${row.storeId}`
      if (includedRows && !includedRows[key]) continue
    }
    if (row.newValue == null) continue
    mutations.push({
      loja_id: row.storeId,
      indicator_code: row.indicatorCode,
      year,
      month: row.month,
      meta: row.newValue,
    })
  }

  return mutations
}

// ── Importação de planilha (TARGET) ────────────────────────────────────────────

export type ImportRow = {
  code: string
  months: Array<number | string | null>
  total: number | string | null
  observation: string | null
}

export type ImportChangeAction = 'UPDATE' | 'CLEAR' | 'INVALID'

export type TargetImportChange = {
  indicatorCode: string
  indicatorName: string
  month: number
  currentValue: number | null
  newValue: number | null
  action: ImportChangeAction
  error?: string
}

export type ImportValidation = {
  errors: string[]
  warnings: string[]
}

export function validateTargetImport(params: {
  config: Record<string, unknown>
  rows: ImportRow[]
  clientId: string
  referenceYear: number
  indicators: TargetIndicator[]
}): ImportValidation {
  const errors: string[] = []
  const warnings: string[] = []

  if (String(params.config.client_account_id ?? '') !== params.clientId) {
    errors.push('Arquivo não pertence ao cliente esperado (MX_CONFIG inválido).')
  }
  if (String(params.config.reference_year ?? '') !== String(params.referenceYear)) {
    errors.push(`Ano do arquivo (${params.config.reference_year ?? '?'}) não corresponde ao esperado (${params.referenceYear}).`)
  }
  if (String(params.config.view_type ?? '') !== 'TARGET') {
    errors.push('Este arquivo não é um modelo de Metas.')
  }

  const seen = new Set<string>()
  for (const row of params.rows) {
    if (seen.has(row.code)) errors.push(`Código duplicado: ${row.code}`)
    seen.add(row.code)

    const indicator = params.indicators.find(item => item.code === row.code)
    if (!indicator) {
      errors.push(`Indicador não encontrado no catálogo: ${row.code}`)
      continue
    }
    if (indicator.calculado) {
      for (let month = 1; month <= 12; month++) {
        const value = row.months[month - 1]
        if (value != null && value !== '' && String(value).trim().toUpperCase() !== 'CALCULADO') {
          warnings.push(`Indicador calculado ${row.code} mês ${month}: alteração será ignorada e recalculada pelo sistema.`)
        }
      }
    }
  }

  return { errors, warnings }
}

/**
 * Processa as linhas do arquivo em mudanças de importação. Valores "LIMPAR"
 * viram CLEAR; calculados são pulados; numéricos viram UPDATE.
 */
export function processTargetImport(params: {
  rows: ImportRow[]
  indicators: TargetIndicator[]
  currentValues: Array<{ indicator_code: string; month: number; value: number | null }>
  isPercentage: (code: string) => boolean
}): TargetImportChange[] {
  const changes: TargetImportChange[] = []

  for (const row of params.rows) {
    const indicator = params.indicators.find(item => item.code === row.code)
    if (!indicator) continue
    if (indicator.calculado) continue

    for (let month = 1; month <= 12; month++) {
      const cell = row.months[month - 1]
      if (cell == null || cell === '') continue
      if (String(cell).trim().toUpperCase() === 'CALCULADO') continue

      const current = params.currentValues.find(value =>
        value.indicator_code === row.code && value.month === month,
      )?.value ?? null

      if (typeof cell === 'string' && cell.trim().toUpperCase() === 'LIMPAR') {
        if (current != null) {
          changes.push({ indicatorCode: row.code, indicatorName: indicator.name, month, currentValue: current, newValue: null, action: 'CLEAR' })
        }
        continue
      }

      let numValue: number
      if (typeof cell === 'number') {
        numValue = cell
      } else {
        const cleaned = String(cell).trim()
          .replace(/^R\$\s*/i, '')
          .replace(/[xX]$/i, '')
          .replace(/\.(?=\d{3}([.,]|$))/g, '')
          .replace(',', '.')
          .replace(/[^\d.-]/g, '')
        numValue = parseFloat(cleaned)
      }

      if (Number.isNaN(numValue)) {
        changes.push({ indicatorCode: row.code, indicatorName: indicator.name, month, currentValue: current, newValue: null, action: 'INVALID', error: `Valor inválido: ${String(cell)}` })
        continue
      }

      if (params.isPercentage(row.code)) numValue = numValue / 100
      if (current === numValue) continue

      changes.push({ indicatorCode: row.code, indicatorName: indicator.name, month, currentValue: current, newValue: numValue, action: 'UPDATE' })
    }
  }

  return changes
}

// ── Cadastro rápido (grade mensal) ─────────────────────────────────────────────

export type QuickEntryCell = {
  indicator_code: string
  month: number
  value: number | null
}

/** Valida o lote do cadastro rápido: meses no intervalo e valores numéricos. */
export function validateQuickEntryCells(cells: QuickEntryCell[]): string[] {
  const errors: string[] = []
  for (const cell of cells) {
    if (cell.month < 1 || cell.month > 12) {
      errors.push(`Mês inválido ${cell.month} para ${cell.indicator_code}.`)
    }
    if (cell.value != null && Number.isNaN(cell.value)) {
      errors.push(`Valor inválido para ${cell.indicator_code} no mês ${cell.month}.`)
    }
  }
  return errors
}

/** Agrupa valores mensais por indicador (para a grade do cadastro rápido). */
export function buildMonthlyGrid(
  values: StoreTargetValue[],
  indicatorCodes: string[],
): Record<string, Record<number, { meta: number | null; realizado: number | null }>> {
  const grid: Record<string, Record<number, { meta: number | null; realizado: number | null }>> = {}
  for (const code of indicatorCodes) {
    grid[code] = {}
    for (const month of MONTHS) {
      grid[code][month] = { meta: null, realizado: null }
    }
  }
  for (const value of values) {
    if (!grid[value.indicator_code]) continue
    grid[value.indicator_code][value.month] = { meta: value.meta, realizado: value.realizado }
  }
  return grid
}

/** Soma anual respeitando a política de agregação do indicador. */
export function annualize(
  values: Array<{ month: number; value: number | null }>,
  policy: AnnualAggregation | string,
  sumMonthly: (values: Array<{ month: number; value: number | null }>) => number | null,
): number | null {
  const valid = values.filter(item => item.value != null && !Number.isNaN(item.value)).map(item => item.value as number)
  if (valid.length === 0) return null
  if (policy === 'AVERAGE_MONTHS') return valid.reduce((sum, value) => sum + value, 0) / valid.length
  if (policy === 'LAST_VALID_MONTH') return valid[valid.length - 1]
  return sumMonthly(values) ?? valid.reduce((sum, value) => sum + value, 0)
}
