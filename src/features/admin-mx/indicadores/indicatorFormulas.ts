// Motor de fórmulas do catálogo de indicadores — 100% puro (sem Supabase).
//
// Port do Base44 (indicatorCatalog.js + indicatorFormat.js + strategicCalc.js):
// avalia expressões com IND("CODIGO") e PAR("CODIGO"), calcula totais anuais,
// extrai dependências e formata valores conforme o tipo do indicador.

import {
  catalogAliasKeys,
  matchCanonicalIndicator,
  matchOfficialParameter,
  officialParameterDefaults,
} from './canonicalBase44Catalog'

export type IndicatorValueFormat = 'INTEGER' | 'DECIMAL' | 'CURRENCY_BRL' | 'PERCENTAGE' | 'SCORE_0_5' | 'RATIO' | 'INVENTORY_TURNOVER'

export type AnnualAggregation = 'SUM_MONTHS' | 'AVERAGE_MONTHS' | 'LAST_VALID_MONTH' | 'RECALCULATE_FROM_ANNUAL_BASES' | 'RECALCULATE_FROM_LAST_PERIOD_BASES'

export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

export const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const

export const MONTH_LABELS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const

export const VALUE_FORMAT_LABELS: Record<IndicatorValueFormat, string> = {
  INTEGER: 'Inteiro',
  DECIMAL: 'Decimal',
  CURRENCY_BRL: 'Moeda',
  PERCENTAGE: 'Percentual',
  SCORE_0_5: 'Nota 0-5',
  RATIO: 'Razão',
  INVENTORY_TURNOVER: 'Giro',
}

export const ANNUAL_AGG_LABELS: Record<AnnualAggregation, string> = {
  SUM_MONTHS: 'Soma dos meses',
  AVERAGE_MONTHS: 'Média dos meses',
  LAST_VALID_MONTH: 'Último mês válido',
  RECALCULATE_FROM_ANNUAL_BASES: 'Recalculado pelas bases anuais',
  RECALCULATE_FROM_LAST_PERIOD_BASES: 'Recalculado pelo último período',
}

export type FormulaEngineIndicator = {
  code: string
  value_type?: string
  formula_expression?: string | null
  annual_aggregation?: string | null
  annual_formula?: string | null
  casas_decimais?: number | null
}

/** Extrai os códigos referenciados por IND("...") numa expressão. */
export function extractIndicatorDeps(formula: string | null | undefined): string[] {
  if (!formula) return []
  return [...formula.matchAll(/IND\("([^"]+)"\)/g)].map(match => match[1])
}

/** Extrai os códigos referenciados por PAR("...") numa expressão. */
export function extractParameterDeps(formula: string | null | undefined): string[] {
  if (!formula) return []
  return [...formula.matchAll(/PAR\("([^"]+)"\)/g)].map(match => match[1])
}

/**
 * Avalia uma expressão com IND() e PAR(). Devolve null quando falta base
 * (indicador/parâmetro ausente, divisão por zero ou erro de sintaxe).
 */
function lookupLoose(
  map: Record<string, number | null | undefined>,
  code: string,
  kind: 'indicator' | 'parameter',
): number | null | undefined {
  if (map[code] != null && !Number.isNaN(map[code])) return map[code]
  if (kind === 'indicator') {
    const canon = matchCanonicalIndicator(code)
    if (canon) {
      for (const key of catalogAliasKeys(canon.code)) {
        if (map[key] != null && !Number.isNaN(map[key])) return map[key]
      }
      for (const [key, value] of Object.entries(map)) {
        if (value == null || Number.isNaN(value)) continue
        if (matchCanonicalIndicator(key)?.code === canon.code) return value
      }
    }
    return map[code]
  }
  const param = matchOfficialParameter(code)
  if (param) {
    if (map[param.code] != null && !Number.isNaN(map[param.code])) return map[param.code]
    const lower = param.code.toLowerCase()
    if (map[lower] != null && !Number.isNaN(map[lower])) return map[lower]
  }
  return map[code]
}

export function evaluateFormula(
  formula: string | null | undefined,
  indicatorValues: Record<string, number | null | undefined>,
  parameterValues: Record<string, number | null | undefined>,
): number | null {
  if (!formula) return null
  try {
    let expr = formula
    expr = expr.replace(/IND\("([^"]+)"\)/g, (_match, code: string) => {
      const value = lookupLoose(indicatorValues, code, 'indicator')
      if (value == null || Number.isNaN(value)) return 'null'
      return String(value)
    })
    expr = expr.replace(/PAR\("([^"]+)"\)/g, (_match, code: string) => {
      const value = lookupLoose(parameterValues, code, 'parameter')
      if (value == null || Number.isNaN(value)) return 'null'
      return String(value)
    })
    if (expr.includes('null')) return null
    const result = Function(`"use strict"; return (${expr})`)()
    return typeof result === 'number' && Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}

/**
 * Calcula o total anual conforme a política de agregação. Para políticas
 * "recalculadas", usa a fórmula anual com SUM_ANNUAL/AVG_ANNUAL/LAST_ANNUAL.
 */
export function calculateAnnualValue(
  monthlyValues: Array<number | null>,
  policy: AnnualAggregation | string,
  annualFormula: string | null | undefined,
  allIndicatorMonthlyValues: Record<string, Record<number, number | null>>,
): number | null {
  const valid = monthlyValues.filter((value): value is number => value != null && !Number.isNaN(value))
  if (valid.length === 0) return null

  switch (policy) {
    case 'SUM_MONTHS':
      return valid.reduce((sum, value) => sum + value, 0)
    case 'AVERAGE_MONTHS':
      return valid.reduce((sum, value) => sum + value, 0) / valid.length
    case 'LAST_VALID_MONTH':
      return valid[valid.length - 1]
    case 'RECALCULATE_FROM_ANNUAL_BASES':
    case 'RECALCULATE_FROM_LAST_PERIOD_BASES': {
      if (annualFormula && allIndicatorMonthlyValues) {
        const annualValues = (code: string): number[] => {
          const values = Object.values(allIndicatorMonthlyValues[code] ?? {}).filter(
            (value): value is number => value != null && !Number.isNaN(value),
          )
          return values
        }
        const sumAnnual = (code: string) => annualValues(code).reduce((sum, value) => sum + value, 0)
        const avgAnnual = (code: string) => {
          const values = annualValues(code)
          return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null
        }
        const lastAnnual = (code: string) => {
          const values = annualValues(code)
          return values.length > 0 ? values[values.length - 1] : null
        }
        let expr = annualFormula
        expr = expr.replace(/SUM_ANNUAL\("([^"]+)"\)/g, (_match, code: string) => String(sumAnnual(code)))
        expr = expr.replace(/AVG_ANNUAL\("([^"]+)"\)/g, (_match, code: string) => {
          const value = avgAnnual(code)
          return value != null ? String(value) : 'null'
        })
        expr = expr.replace(/LAST_ANNUAL\("([^"]+)"\)/g, (_match, code: string) => {
          const value = lastAnnual(code)
          return value != null ? String(value) : 'null'
        })
        if (expr.includes('null')) return null
        try {
          const result = Function(`"use strict"; return (${expr})`)()
          return typeof result === 'number' && Number.isFinite(result) ? result : null
        } catch {
          return null
        }
      }
      return valid.reduce((sum, value) => sum + value, 0)
    }
    default:
      return valid.reduce((sum, value) => sum + value, 0)
  }
}

export type FormatConfig = {
  value_format: IndicatorValueFormat
  display_decimal_places: number
  prefix: string
  suffix: string
  allow_negative: boolean
}

const FORMAT_BY_VALUE_TYPE: Record<string, IndicatorValueFormat> = {
  number: 'DECIMAL',
  percent: 'PERCENTAGE',
  currency: 'CURRENCY_BRL',
  integer: 'INTEGER',
  score: 'SCORE_0_5',
  ratio: 'RATIO',
}

/** Config de formatação a partir do tipo de valor do catálogo MX. */
export function getFormatConfig(valueType: string | null | undefined, casasDecimais: number | null | undefined = 2): FormatConfig {
  const base = FORMAT_BY_VALUE_TYPE[String(valueType ?? '').toLowerCase()] ?? 'DECIMAL'
  switch (base) {
    case 'INTEGER':
      return { value_format: 'INTEGER', display_decimal_places: 0, prefix: '', suffix: '', allow_negative: false }
    case 'PERCENTAGE':
      return { value_format: 'PERCENTAGE', display_decimal_places: casasDecimais ?? 2, prefix: '', suffix: '%', allow_negative: false }
    case 'CURRENCY_BRL':
      return { value_format: 'CURRENCY_BRL', display_decimal_places: casasDecimais ?? 2, prefix: 'R$', suffix: '', allow_negative: true }
    case 'SCORE_0_5':
      return { value_format: 'SCORE_0_5', display_decimal_places: 1, prefix: '', suffix: ' de 5', allow_negative: false }
    case 'RATIO':
      return { value_format: 'RATIO', display_decimal_places: casasDecimais ?? 2, prefix: '', suffix: '', allow_negative: false }
    default:
      return { value_format: 'DECIMAL', display_decimal_places: casasDecimais ?? 2, prefix: '', suffix: '', allow_negative: false }
  }
}

/** Valor editável sem símbolo; percentuais são armazenados como fração. */
export function formatEditableInput(value: number | null | undefined, config: FormatConfig): string {
  if (value == null || Number.isNaN(value)) return ''
  if (config.value_format === 'PERCENTAGE') return String(Number((value * 100).toFixed(config.display_decimal_places)))
  return String(value)
}

function formatNumberBR(value: number, minDecimals: number, maxDecimals: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: minDecimals, maximumFractionDigits: maxDecimals })
}

function trimTrailingZerosBR(formatted: string): string {
  if (!formatted.includes(',')) return formatted
  return formatted.replace(/,?0+$/, '').replace(/,$/, '')
}

/** Formata um valor para exibição (contexto tabela). */
export function formatDisplay(value: number | null | undefined, config: FormatConfig): string {
  if (value == null || Number.isNaN(value)) return '—'
  const num = Number(value)
  const decimals = config.display_decimal_places
  switch (config.value_format) {
    case 'INTEGER':
      return formatNumberBR(Math.round(num), 0, 0)
    case 'PERCENTAGE':
      return formatNumberBR(num * 100, decimals, decimals) + '%'
    case 'CURRENCY_BRL': {
      const formatted = formatNumberBR(Math.abs(num), decimals, decimals)
      return `${num < 0 ? '-' : ''}R$ ${formatted}`
    }
    case 'SCORE_0_5':
      return formatNumberBR(num, 1, 1)
    default:
      return trimTrailingZerosBR(formatNumberBR(num, 0, decimals))
  }
}

/** Converte um valor exibido de volta para o valor armazenado (percentual → fração). */
export function parseStrategicInput(raw: string, config: FormatConfig): number | null {
  if (!raw || raw.trim() === '') return null
  let cleaned = raw.trim()
    .replace(/^R\$\s*/i, '')
    .replace(/[xX]$/i, '')
    .replace(/\.(?=\d{3}([.,]|$))/g, '')
    .replace(',', '.')
    .replace('%', '')
    .replace(/[^\d.-]/g, '')
  if (!cleaned) return null
  const num = Number(cleaned)
  if (Number.isNaN(num)) return null
  if (config.value_format === 'PERCENTAGE') return num / 100
  return num
}

/**
 * Mapa de dependentes transitivos: para cada indicador manual, os indicadores
 * calculados que dependem dele direta ou indiretamente (BFS).
 */
export function buildDependentsMap(
  indicators: Array<Pick<FormulaEngineIndicator, 'code' | 'formula_expression'>>,
): Record<string, string[]> {
  const directDeps: Record<string, string[]> = {}
  const directDependents: Record<string, string[]> = {}
  for (const indicator of indicators) {
    if (!indicator.formula_expression) continue
    const deps = extractIndicatorDeps(indicator.formula_expression)
    directDeps[indicator.code] = deps
    for (const dep of deps) {
      if (!directDependents[dep]) directDependents[dep] = []
      if (!directDependents[dep].includes(indicator.code)) directDependents[dep].push(indicator.code)
    }
  }

  const transitive: Record<string, string[]> = {}
  for (const indicator of indicators) {
    const visited = new Set<string>()
    const queue = [...(directDependents[indicator.code] ?? [])]
    while (queue.length > 0) {
      const code = queue.shift() as string
      if (visited.has(code)) continue
      visited.add(code)
      queue.push(...(directDependents[code] ?? []))
    }
    transitive[indicator.code] = [...visited]
  }
  return transitive
}

export type ParameterSource =
  | Record<string, number | null | undefined>
  | ((month: number) => Record<string, number | null | undefined>)

function paramsForMonth(params: ParameterSource, month: number) {
  return typeof params === 'function' ? params(month) : params
}

function writeMonthValue(
  valueMap: Record<string, Record<number, number | null>>,
  code: string,
  month: number,
  value: number | null,
) {
  for (const key of catalogAliasKeys(code)) {
    if (!valueMap[key]) valueMap[key] = {}
    valueMap[key][month] = value
  }
}

/**
 * Calcula o mapa de valores mensais: manuais alimentam as fórmulas dos
 * calculados (3 passagens resolvem cadeias de dependência).
 */
export function computeValueMap(
  monthlyValues: Array<{ indicator_code: string; month: number; value: number | null }>,
  indicators: Array<Pick<FormulaEngineIndicator, 'code' | 'formula_expression'>>,
  params: ParameterSource,
): {
  valueMap: Record<string, Record<number, number | null>>
  calcStatus: Record<string, Record<number, 'CALCULATED' | 'WITHOUT_BASE' | 'MISSING_PARAMETER'>>
} {
  const valueMap: Record<string, Record<number, number | null>> = {}
  const calcStatus: Record<string, Record<number, 'CALCULATED' | 'WITHOUT_BASE' | 'MISSING_PARAMETER'>> = {}

  for (const mv of monthlyValues) {
    if (mv.value == null) {
      const existing = lookupLoose(
        Object.fromEntries(Object.entries(valueMap).map(([code, months]) => [code, months[mv.month] ?? null])),
        mv.indicator_code,
        'indicator',
      )
      if (existing != null && !Number.isNaN(existing)) continue
    }
    writeMonthValue(valueMap, mv.indicator_code, mv.month, mv.value)
  }

  const calculated = indicators
    .filter(indicator => indicator.formula_expression)
    .sort((a, b) => a.code.localeCompare(b.code))

  for (let pass = 0; pass < 3; pass++) {
    for (const indicator of calculated) {
      if (!valueMap[indicator.code]) valueMap[indicator.code] = {}
      if (!calcStatus[indicator.code]) calcStatus[indicator.code] = {}

      for (const month of MONTHS) {
        if (pass > 0 && calcStatus[indicator.code][month] === 'CALCULATED') continue

        const monthParams = paramsForMonth(params, month)
        const flatValues: Record<string, number | null> = {}
        for (const [code, monthMap] of Object.entries(valueMap)) {
          flatValues[code] = monthMap[month] ?? null
        }
        const result = evaluateFormula(indicator.formula_expression, flatValues, monthParams)

        if (result != null && !Number.isNaN(result)) {
          writeMonthValue(valueMap, indicator.code, month, result)
          calcStatus[indicator.code][month] = 'CALCULATED'
        } else {
          const hasMissingParam = extractParameterDeps(indicator.formula_expression).some(code => {
            const value = lookupLoose(monthParams, code, 'parameter')
            return value == null || Number.isNaN(value)
          })
          calcStatus[indicator.code][month] = hasMissingParam ? 'MISSING_PARAMETER' : 'WITHOUT_BASE'
          writeMonthValue(valueMap, indicator.code, month, null)
        }
      }
    }
  }

  return { valueMap, calcStatus }
}

const COMPUTED_FIELDS = ['meta', 'realizado', 'ano_anterior'] as const

export function applyOfficialComputedMetas<T extends {
  loja_id: string
  indicator_code: string
  month: number | null
  meta: number | null
  realizado?: number | null
  ano_anterior?: number | null
}>(params: {
  values: T[]
  indicators: Array<{ metric_key: string; formula_expression?: string | null }>
  unitIds: string[]
  parameterSource?: ParameterSource
}): T[] {
  const calculated = params.indicators.filter(item => (
    item.formula_expression || matchCanonicalIndicator(item.metric_key)?.formula_expression
  ))
  if (calculated.length === 0) return params.values

  const next = params.values.map(row => ({ ...row }))
  const index = new Map<string, number>()
  next.forEach((row, position) => {
    if (row.month == null) return
    index.set(`${row.loja_id}:${row.indicator_code}:${row.month}`, position)
  })

  const parameterSource = params.parameterSource ?? (month => officialParameterDefaults(month))
  const engineIndicators = params.indicators.map(item => {
    const canon = matchCanonicalIndicator(item.metric_key)
    return {
      code: item.metric_key,
      formula_expression: canon?.formula_expression ?? item.formula_expression,
    }
  })

  for (const unitId of params.unitIds) {
    for (const field of COMPUTED_FIELDS) {
      const monthlyValues = next
        .filter(row => row.loja_id === unitId && row.month != null)
        .map(row => ({ indicator_code: row.indicator_code, month: Number(row.month), value: row[field] ?? null }))
      const { valueMap } = computeValueMap(monthlyValues, engineIndicators, parameterSource)
      for (const indicator of calculated) {
        const canon = matchCanonicalIndicator(indicator.metric_key)
        for (const month of MONTHS) {
          const computed = valueMap[indicator.metric_key]?.[month]
            ?? (canon ? valueMap[canon.code]?.[month] : null)
            ?? null
          for (const code of catalogAliasKeys(indicator.metric_key)) {
            const key = `${unitId}:${code}:${month}`
            const existing = index.get(key)
            if (existing != null) {
              next[existing] = { ...next[existing], [field]: computed }
              continue
            }
            index.set(key, next.length)
            next.push({
              loja_id: unitId,
              indicator_code: code,
              month,
              meta: field === 'meta' ? computed : null,
              realizado: field === 'realizado' ? computed : null,
              ano_anterior: field === 'ano_anterior' ? computed : null,
            } as T)
          }
        }
      }
    }
  }

  return next
}

export function calcStatusLabel(
  status: 'CALCULATED' | 'WITHOUT_BASE' | 'MISSING_PARAMETER' | undefined,
): string | null {
  if (status === 'WITHOUT_BASE') return 'Sem base'
  if (status === 'MISSING_PARAMETER') return 'Parâmetro pendente'
  return null
}
