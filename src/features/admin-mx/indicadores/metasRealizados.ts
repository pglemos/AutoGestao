// Metas e realizados — lógica pura (sem Supabase).
//
// Port do Base44 (storeTargetCopyOps + excelTargetImportProcessor + actualCalc +
// QuickEntryView): prévia e execução de cópia de metas entre lojas, plano de
// mudanças de importação, e grade de cadastro rápido.

import {
  BASE44_GLOBAL_ORDER,
  catalogAliasKeys,
  matchCanonicalIndicator,
  officialCatalogCode,
  officialParameterDefaults,
} from './canonicalBase44Catalog'
import { actualFormulaFor, ACTUAL_BLANK_POLICY, ACTUAL_CALCULATED, isActualCalculated } from './actualCalc'
import { MONTHS, MONTH_LABELS, applyOfficialComputedMetas, evaluateFormula, extractIndicatorDeps, type AnnualAggregation } from './indicatorFormulas'

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
  displayCode?: string
  name: string
  department?: string
  calculado?: boolean
  value_type?: string | null
  casas_decimais?: number | null
}

/**
 * Meta: bloqueada quando calculada (fórmula com PAR).
 * Realizado/AA: bloqueados só nos 15 ACTUAL_CALCULATED (sem PAR).
 */
export function isPlanningFieldEditable(
  indicator: Pick<TargetIndicator, 'code' | 'calculado'>,
  field: 'meta' | 'realizado' | 'ano_anterior',
): boolean {
  const code = matchCanonicalIndicator(indicator.code)?.code ?? indicator.code
  if (field === 'meta') return !indicator.calculado
  return !isActualCalculated(code)
}

export type TargetWorkbookSheet = {
  name: string
  headers: string[]
  rows: Array<Record<string, unknown>>
}

export const TARGET_TEMPLATE_INSTRUCTION_LINES = [
  'Preencha somente as células brancas (indicadores digitáveis).',
  'Não altere os códigos dos indicadores (coluna Código do Indicador).',
  'Não altere os nomes dos indicadores.',
  'Não exclua linhas da tabela.',
  'Deixe a célula vazia quando não quiser atualizar aquele mês.',
  'Digite zero (0) somente quando a meta for realmente zero.',
  'Use "LIMPAR" para remover uma meta já cadastrada.',
  'Indicadores calculáveis (fundo cinza) serão recalculados pelo sistema.',
  'A coluna Total é somente conferência — não será importada.',
  'A importação não altera Realizado nem Ano Anterior.',
] as const

function formatLabel(indicator: TargetIndicator) {
  const type = String(indicator.value_type ?? '').toLowerCase()
  if (type.includes('percent')) return 'Percentual'
  if (type.includes('currency') || type.includes('moeda')) return 'Moeda'
  if ((indicator.casas_decimais ?? 0) > 0) return 'Decimal'
  return 'Inteiro'
}

export function sortTargetIndicators<T extends TargetIndicator>(indicators: T[]) {
  return [...indicators].sort((left, right) => {
    const leftCode = matchCanonicalIndicator(left.code)?.code ?? left.code
    const rightCode = matchCanonicalIndicator(right.code)?.code ?? right.code
    return (BASE44_GLOBAL_ORDER[leftCode] ?? 999) - (BASE44_GLOBAL_ORDER[rightCode] ?? 999)
  })
}

export function resolveImportedIndicator<T extends TargetIndicator>(indicators: T[], rawCode: string) {
  const trimmed = rawCode.trim()
  if (!trimmed) return undefined
  const official = matchCanonicalIndicator(trimmed)?.code
  return indicators.find(indicator => {
    const code = matchCanonicalIndicator(indicator.code)?.code ?? indicator.code
    return indicator.code === trimmed
      || indicator.displayCode === trimmed
      || code === trimmed
      || code === official
      || (official != null && (matchCanonicalIndicator(indicator.code)?.code === official))
  })
}

/** Gera as abas do XLSX de metas, tanto preenchido quanto em branco. */
export function buildTargetWorkbookSheets(params: {
  indicators: TargetIndicator[]
  year: number
  storeId: string
  storeName?: string
  values?: Record<string, Array<number | null>>
  clientName?: string
  cycleId?: string | null
  scopeType?: string
}): TargetWorkbookSheet[] {
  const headers = [
    'Ordem Oficial',
    'Código do Indicador',
    'Departamento',
    'Indicador',
    'Tipo',
    'Formato',
    ...MONTH_LABELS,
    'Total',
    'Observação',
  ]
  const rows = sortTargetIndicators(params.indicators).map(indicator => {
    const official = officialCatalogCode(indicator.code)
    const order = BASE44_GLOBAL_ORDER[official] ?? ''
    const monthValues = MONTH_LABELS.map((_, index) => {
      if (indicator.calculado) return 'Calculado'
      const value = params.values?.[indicator.code]?.[index] ?? params.values?.[official]?.[index] ?? null
      return indicator.value_type === 'percent' && value != null ? value * 100 : value
    })
    const numericMonths = monthValues.filter((value): value is number => typeof value === 'number')
    return {
      'Ordem Oficial': typeof order === 'number' ? order : '',
      'Código do Indicador': official,
      Departamento: indicator.department ?? '',
      Indicador: indicator.name,
      Tipo: indicator.calculado ? 'Calculado' : 'Digitável',
      Formato: formatLabel(indicator),
      ...Object.fromEntries(MONTH_LABELS.map((label, index) => [label, monthValues[index]])),
      Total: indicator.calculado ? '' : numericMonths.reduce((sum, value) => sum + value, 0),
      Observação: '',
    }
  })

  return [
    { name: 'METAS', headers, rows },
    {
      name: 'INSTRUÇÕES',
      headers: ['Instrução'],
      rows: TARGET_TEMPLATE_INSTRUCTION_LINES.map(instruction => ({ Instrução: instruction })),
    },
    {
      name: 'MX_CONFIG',
      headers: ['Chave', 'Valor'],
      rows: [
        { Chave: 'template_version', Valor: '1.0.0' },
        { Chave: 'client_name', Valor: params.clientName ?? params.storeName ?? '' },
        { Chave: 'strategic_plan_cycle_id', Valor: params.cycleId ?? '' },
        { Chave: 'reference_year', Valor: String(params.year) },
        { Chave: 'view_type', Valor: 'TARGET' },
        { Chave: 'store_id', Valor: params.storeId },
        { Chave: 'store_name', Valor: params.storeName ?? '' },
        { Chave: 'scope_type', Valor: params.scopeType ?? (params.storeId ? 'UNIDADE' : 'CONSOLIDADO') },
        { Chave: 'indicator_count', Valor: String(params.indicators.length) },
        { Chave: 'manual_indicator_count', Valor: String(params.indicators.filter(item => !item.calculado).length) },
        { Chave: 'calculated_indicator_count', Valor: String(params.indicators.filter(item => item.calculado).length) },
      ],
    },
  ]
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

    const indicator = resolveImportedIndicator(params.indicators, row.code)
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
    const indicator = resolveImportedIndicator(params.indicators, row.code)
    if (!indicator) continue
    if (indicator.calculado) continue
    const persistedCode = indicator.code

    for (let month = 1; month <= 12; month++) {
      const cell = row.months[month - 1]
      if (cell == null || String(cell).trim() === '') continue
      const cellText = String(cell).trim().toUpperCase()
      if (cellText === 'CALCULADO' || cellText === 'CALCULÁVEL') continue

      const current = params.currentValues.find(value => {
        const currentOfficial = matchCanonicalIndicator(value.indicator_code)?.code ?? value.indicator_code
        const persistedOfficial = matchCanonicalIndicator(persistedCode)?.code ?? persistedCode
        return (value.indicator_code === persistedCode || currentOfficial === persistedOfficial) && value.month === month
      })?.value ?? null

      if (typeof cell === 'string' && cell.trim().toUpperCase() === 'LIMPAR') {
        if (current != null) {
          changes.push({ indicatorCode: persistedCode, indicatorName: indicator.name, month, currentValue: current, newValue: null, action: 'CLEAR' })
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
        changes.push({ indicatorCode: persistedCode, indicatorName: indicator.name, month, currentValue: current, newValue: null, action: 'INVALID', error: `Valor inválido: ${String(cell)}` })
        continue
      }

      if (params.isPercentage(persistedCode) || params.isPercentage(officialCatalogCode(persistedCode))) numValue = numValue / 100
      if (current === numValue) continue

      changes.push({ indicatorCode: persistedCode, indicatorName: indicator.name, month, currentValue: current, newValue: numValue, action: 'UPDATE' })
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

/** Janeiro vazio não replica: preserva os demais meses. Zero é valor válido. */
export function januaryReplicationSeries(january: number | null): number[] | null {
  if (january == null) return null
  return Array.from({ length: 12 }, () => january)
}

export const QUICK_ENTRY_DEPARTMENTS = [
  'Comercial',
  'Marketing',
  'Produto e Estoque',
  'Financeiro',
  'Operações',
  'Pessoas - RH',
] as const

export const SALES_CHANNEL_CODES = [
  'SALES_WALKIN',
  'SALES_REFERRAL',
  'SALES_COMPANY_PORTFOLIO',
  'SALES_SELLER_PORTFOLIO',
  'SALES_INTERNET',
  'SALES_OTHER',
] as const

export function monthSeries(values: Array<number | null> | undefined): Array<number | null> {
  return Array.from({ length: 12 }, (_, index) => values?.[index] ?? null)
}

export function indicatorYearComplete(values: Array<number | null>): boolean {
  return values.length === 12 && values.every(value => value != null)
}

/** Valor único: todos os meses iguais (incluindo todos vazios). */
export function monthsAreUniform(values: Array<number | null>): boolean {
  const series = monthSeries(values)
  return series.every(value => value === series[0])
}

/** Único valor preenchido do ano, ou null se vazio/misturado. */
export function uniqueFilledValue(values: Array<number | null>): number | null {
  const filled = monthSeries(values).filter((value): value is number => value != null)
  if (filled.length === 0) return null
  return filled.every(value => value === filled[0]) ? filled[0] : null
}

/** No cadastro rápido, buracos de um valor único viram esse valor — não misturam 0 com 9. */
export function fillUniformGaps(values: Array<number | null>): Array<number | null> {
  const series = monthSeries(values)
  const unique = uniqueFilledValue(series)
  if (unique == null) return series
  return series.map(value => value ?? unique)
}

/** Zero isolado no meio de um único valor não-zero (ex.: Jan 0 e Fev–Dez 9) não é meta real. */
export function fillIsolatedZeros(values: Array<number | null>): Array<number | null> {
  const series = monthSeries(values)
  const nonzero = series.filter((value): value is number => value != null && value !== 0)
  if (nonzero.length === 0) return series
  if (!nonzero.every(value => value === nonzero[0])) return series
  const unique = nonzero[0]
  const zeroCount = series.filter(value => value === 0).length
  if (zeroCount === 0 || zeroCount >= 6) return series
  return series.map(value => (value === 0 ? unique : value))
}

export function normalizeQuickEntrySeries(values: Array<number | null>): Array<number | null> {
  return fillUniformGaps(fillIsolatedZeros(values))
}

/** Copia o mês anterior para frente (Fev←Jan, Mar←Fev, …). Vazio não sobrescreve o próximo. */
export function copyPreviousMonthSeries(values: Array<number | null>): Array<number | null> {
  const next = monthSeries(values)
  for (let index = 1; index < 12; index++) {
    if (next[index - 1] != null) next[index] = next[index - 1]
  }
  return next
}

export function clearMonthSeries(): Array<number | null> {
  return Array.from({ length: 12 }, () => null)
}

export function matchQuickEntryDepartment(department: string | null | undefined): string {
  const raw = (department ?? '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  if (!raw) return 'Outros'
  const matched = QUICK_ENTRY_DEPARTMENTS.find(name => {
    const normalized = name.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return raw.includes(normalized) || normalized.includes(raw)
  })
  return matched ?? (department?.trim() || 'Outros')
}

export function countQuickEntryProgress(params: {
  indicators: Array<{ code: string; calculado?: boolean; department?: string | null }>
  valuesFor: (code: string) => Array<number | null>
}) {
  const digitaveis = params.indicators.filter(indicator => !indicator.calculado)
  const byDept: Record<string, { filled: number; total: number }> = {}
  for (const dept of QUICK_ENTRY_DEPARTMENTS) byDept[dept] = { filled: 0, total: 0 }
  let digitaveisFilled = 0
  for (const indicator of digitaveis) {
    const dept = matchQuickEntryDepartment(indicator.department)
    if (!byDept[dept]) byDept[dept] = { filled: 0, total: 0 }
    byDept[dept].total++
    if (indicatorYearComplete(monthSeries(params.valuesFor(indicator.code)))) {
      byDept[dept].filled++
      digitaveisFilled++
    }
  }
  return { digitaveisFilled, digitaveisTotal: digitaveis.length, byDept }
}

function resolveMonthlyGridCode(indicatorCode: string, allowed: Set<string>): string | null {
  if (allowed.has(indicatorCode)) return indicatorCode
  const canon = matchCanonicalIndicator(indicatorCode)
  if (!canon) return null
  for (const key of catalogAliasKeys(canon.code)) {
    if (allowed.has(key)) return key
  }
  return null
}

/** Agrupa valores mensais por indicador (para a grade do cadastro rápido). */
export function buildMonthlyGrid(
  values: StoreTargetValue[],
  indicatorCodes: string[],
): Record<string, Record<number, { meta: number | null; realizado: number | null; ano_anterior: number | null }>> {
  const grid: Record<string, Record<number, { meta: number | null; realizado: number | null; ano_anterior: number | null }>> = {}
  const allowed = new Set(indicatorCodes)
  for (const code of indicatorCodes) {
    grid[code] = {}
    for (const month of MONTHS) {
      grid[code][month] = { meta: null, realizado: null, ano_anterior: null }
    }
  }
  for (const value of values) {
    const code = resolveMonthlyGridCode(value.indicator_code, allowed)
    if (!code || !grid[code]) continue
    const current = grid[code][value.month]
    grid[code][value.month] = {
      meta: value.meta ?? current.meta,
      realizado: value.realizado ?? current.realizado,
      ano_anterior: value.ano_anterior ?? current.ano_anterior,
    }
  }
  return grid
}

function toFiniteNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

function flattenMonthlyGrid(
  grid: ReturnType<typeof buildMonthlyGrid>,
  unitId: string,
  year: number,
): StoreTargetValue[] {
  const rows: StoreTargetValue[] = []
  for (const [code, months] of Object.entries(grid)) {
    for (const month of MONTHS) {
      const cell = months[month]
      rows.push({
        loja_id: unitId,
        indicator_code: code,
        year,
        month,
        meta: toFiniteNumber(cell.meta),
        realizado: toFiniteNumber(cell.realizado),
        ano_anterior: toFiniteNumber(cell.ano_anterior),
      })
    }
  }
  return rows
}

export function buildOfficialMonthlyGrid(
  values: StoreTargetValue[],
  indicators: Array<{ code: string; formula_expression?: string | null }>,
  unitId: string,
) {
  const codes = indicators.map(item => item.code)
  const hydrated = buildMonthlyGrid(values, codes)
  if (!unitId) return hydrated
  return buildMonthlyGrid(applyOfficialComputedMetas({
    values: flattenMonthlyGrid(hydrated, unitId, values[0]?.year ?? 0),
    indicators: indicators.map(item => ({
      metric_key: item.code,
      formula_expression: item.formula_expression ?? matchCanonicalIndicator(item.code)?.formula_expression ?? null,
    })),
    unitIds: [unitId],
  }), codes)
}

export function readOfficialMonthValue(
  grid: ReturnType<typeof buildMonthlyGrid>,
  indicators: Array<{ code: string; formula_expression?: string | null }>,
  code: string,
  month: number,
  field: 'meta' | 'realizado' | 'ano_anterior' = 'meta',
): number | null {
  const stored = grid[code]?.[month]?.[field] ?? null
  const canonCode = matchCanonicalIndicator(code)?.code ?? code
  const formula = field === 'meta'
    ? (matchCanonicalIndicator(code)?.formula_expression
      ?? indicators.find(item => item.code === code)?.formula_expression
      ?? null)
    : actualFormulaFor(canonCode)
  if (!formula) return stored
  const flat: Record<string, number | null> = {}
  for (const indicator of indicators) {
    const value = grid[indicator.code]?.[month]?.[field] ?? null
    flat[indicator.code] = value
    const canon = matchCanonicalIndicator(indicator.code)
    if (!canon) continue
    flat[canon.code] = value
    for (const alias of catalogAliasKeys(canon.code)) flat[alias] = value
  }
  if (field !== 'meta') {
    // ZERO_IF_EMPTY só olha deps da fórmula (não o flat inteiro: estoque/crédito
    // com valor não pode “autorizar” Outros=0 a inventar SALES_TOTAL).
    const depCodes = extractIndicatorDeps(formula)
    const depValue = (dep: string): number | null => {
      const key = matchCanonicalIndicator(dep)?.code ?? dep
      const raw = flat[dep] ?? flat[key] ?? null
      return raw != null && Number.isFinite(raw) ? raw : null
    }
    const hasRealBase = depCodes.some(dep => {
      const key = matchCanonicalIndicator(dep)?.code ?? dep
      if (ACTUAL_BLANK_POLICY[key] === 'ZERO_IF_EMPTY') return false
      return depValue(dep) != null
    })
    if (hasRealBase) {
      for (const [policyCode, policy] of Object.entries(ACTUAL_BLANK_POLICY)) {
        if (policy !== 'ZERO_IF_EMPTY') continue
        if (!depCodes.some(dep => (matchCanonicalIndicator(dep)?.code ?? dep) === policyCode || dep === policyCode)) continue
        if (flat[policyCode] != null) continue
        flat[policyCode] = 0
        for (const alias of catalogAliasKeys(policyCode)) {
          if (flat[alias] == null) flat[alias] = 0
        }
      }
    } else {
      // Outros=0 legado sem canais reais da fórmula não pode virar base aditiva.
      for (const [policyCode, policy] of Object.entries(ACTUAL_BLANK_POLICY)) {
        if (policy !== 'ZERO_IF_EMPTY') continue
        flat[policyCode] = null
        for (const alias of catalogAliasKeys(policyCode)) flat[alias] = null
      }
    }
  }
  const params = field === 'meta' ? officialParameterDefaults(month) : {}
  const evaluated = evaluateFormula(formula, flat, params)
  // Realizado/AA calculado: null oficial vence lixo persistido (ex.: total=0).
  if (field !== 'meta') return evaluated
  return evaluated ?? stored
}

/** 3 passagens topológicas (Base44) para derivados do Realizado/AA. */
export function applyActualComputedPasses(
  grid: ReturnType<typeof buildMonthlyGrid>,
  indicators: Array<{ code: string; formula_expression?: string | null }>,
  fields: Array<'realizado' | 'ano_anterior'> = ['realizado', 'ano_anterior'],
): ReturnType<typeof buildMonthlyGrid> {
  const codes = Object.keys(ACTUAL_CALCULATED)
  for (const field of fields) {
    for (let pass = 0; pass < 3; pass += 1) {
      for (const code of codes) {
        if (!grid[code]) continue
        for (const month of MONTHS) {
          const next = readOfficialMonthValue(grid, indicators, code, month, field)
          const cell = grid[code][month] ?? { meta: null, realizado: null, ano_anterior: null }
          // Sempre grava (inclui null) para limpar realizado inventado/persistido.
          grid[code][month] = { ...cell, [field]: next }
        }
      }
    }
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

/**
 * Agrupa as alterações de uma importação em uma chamada por indicador.
 *
 * A RPC `salvar_metas_indicador_planejamento` substitui os 12 meses do ano de
 * uma vez. Enviar uma chamada por célula, com os outros 11 meses nulos, apaga
 * o que não estava na planilha — e, para duas células do mesmo indicador, a
 * segunda chamada desfaz a primeira. Por isso os meses ausentes precisam ser
 * preenchidos com o valor que já está gravado.
 */
export function buildImportSaveBatches(params: {
  changes: Array<{ indicatorCode: string; month: number; newValue: number | null }>
  currentValues: Array<{ indicator_code: string; month: number; value: number | null }>
}): Array<{ indicatorCode: string; values: Array<number | null> }> {
  const byIndicator = new Map<string, Array<number | null>>()

  for (const change of params.changes) {
    if (change.month < 1 || change.month > 12) continue
    let values = byIndicator.get(change.indicatorCode)
    if (!values) {
      values = Array.from({ length: 12 }, (_, index) => (
        params.currentValues.find(value =>
          value.indicator_code === change.indicatorCode && value.month === index + 1,
        )?.value ?? null
      ))
      byIndicator.set(change.indicatorCode, values)
    }
    values[change.month - 1] = change.newValue
  }

  return [...byIndicator].map(([indicatorCode, values]) => ({ indicatorCode, values }))
}
