// Motor de fórmulas do catálogo de indicadores — 100% puro (sem Supabase).
//
// Port do Base44 (indicatorCatalog.js + indicatorFormat.js + strategicCalc.js):
// avalia expressões com IND("CODIGO") e PAR("CODIGO"), calcula totais anuais,
// extrai dependências e formata valores conforme o tipo do indicador.

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
export function evaluateFormula(
  formula: string | null | undefined,
  indicatorValues: Record<string, number | null | undefined>,
  parameterValues: Record<string, number | null | undefined>,
): number | null {
  if (!formula) return null
  try {
    let expr = formula
    expr = expr.replace(/IND\("([^"]+)"\)/g, (_match, code: string) => {
      const value = indicatorValues[code]
      if (value == null || Number.isNaN(value)) return 'null'
      return String(value)
    })
    expr = expr.replace(/PAR\("([^"]+)"\)/g, (_match, code: string) => {
      const value = parameterValues[code]
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

/**
 * Calcula o mapa de valores mensais: manuais alimentam as fórmulas dos
 * calculados (3 passagens resolvem cadeias de dependência).
 */
export function computeValueMap(
  monthlyValues: Array<{ indicator_code: string; month: number; value: number | null }>,
  indicators: Array<Pick<FormulaEngineIndicator, 'code' | 'formula_expression'>>,
  params: Record<string, number | null | undefined>,
): {
  valueMap: Record<string, Record<number, number | null>>
  calcStatus: Record<string, Record<number, 'CALCULATED' | 'WITHOUT_BASE' | 'MISSING_PARAMETER'>>
} {
  const valueMap: Record<string, Record<number, number | null>> = {}
  const calcStatus: Record<string, Record<number, 'CALCULATED' | 'WITHOUT_BASE' | 'MISSING_PARAMETER'>> = {}

  for (const mv of monthlyValues) {
    if (!valueMap[mv.indicator_code]) valueMap[mv.indicator_code] = {}
    valueMap[mv.indicator_code][mv.month] = mv.value
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

        const flatValues: Record<string, number | null> = {}
        for (const [code, monthMap] of Object.entries(valueMap)) {
          flatValues[code] = monthMap[month] ?? null
        }
        const result = evaluateFormula(indicator.formula_expression, flatValues, params)

        if (result != null && !Number.isNaN(result)) {
          valueMap[indicator.code][month] = result
          calcStatus[indicator.code][month] = 'CALCULATED'
        } else {
          const hasMissingParam = extractParameterDeps(indicator.formula_expression).some(code => {
            const value = params[code]
            return value == null || Number.isNaN(value)
          })
          calcStatus[indicator.code][month] = hasMissingParam ? 'MISSING_PARAMETER' : 'WITHOUT_BASE'
          valueMap[indicator.code][month] = null
        }
      }
    }
  }

  return { valueMap, calcStatus }
}

export function calcStatusLabel(
  status: 'CALCULATED' | 'WITHOUT_BASE' | 'MISSING_PARAMETER' | undefined,
): string | null {
  if (status === 'WITHOUT_BASE') return 'Sem base'
  if (status === 'MISSING_PARAMETER') return 'Parâmetro pendente'
  return null
}
