// Catálogo de parâmetros estratégicos e overrides por cliente — 100% puro.
//
// Port do Base44 (strategicCalc.js getEffectiveParameter + ParametersTab +
// ClientParametersDrawer + saveClientParameterOverride): hierarquia de valor
// efetivo (cliente/mês > cliente/ano > padrão MX), validação de override com
// justificativa obrigatória, e prévia de impacto nos indicadores dependentes.

export const PARAM_STATUSES = ['ativo', 'encerrado'] as const
export type ParameterStatus = (typeof PARAM_STATUSES)[number]

export const OVERRIDE_SCOPES = ['ANO_INTEIRO', 'MESES_SELECIONADOS', 'SOMENTE_ESTE_MES'] as const
export type OverrideScope = (typeof OVERRIDE_SCOPES)[number]

export type ParameterDefinition = {
  id: string
  code: string
  name: string
  unit: string
  default_value: number | null
  allows_client_override?: boolean
  allows_monthly_values?: boolean
  monthly_defaults?: number[]
  department?: string
  indicator_codes?: string[]
  status?: ParameterStatus
}

export type ClientParameterOverride = {
  id?: string
  parameter_code: string
  reference_year: number
  month: number | null
  override_value: number
  reason: string
  status?: ParameterStatus
}

export type EffectiveParameter = {
  value: number | null
  source: 'CLIENT_MONTH_OVERRIDE' | 'CLIENT_YEAR_OVERRIDE' | 'MX_DEFAULT' | 'SEM_PARAMETRO'
}

/**
 * Valor efetivo de um parâmetro na hierarquia:
 * cliente/mês > cliente/ano > padrão MX mensal > padrão MX geral.
 */
export function getEffectiveParameter(
  paramCode: string,
  month: number,
  params: ParameterDefinition[],
  overrides: ClientParameterOverride[],
): EffectiveParameter {
  const param = params.find(item => item.code === paramCode)
  if (!param) return { value: null, source: 'SEM_PARAMETRO' }

  const active = overrides.filter(item => item.status !== 'encerrado')
  const monthOverride = active.find(item => item.parameter_code === paramCode && item.month === month)
  if (monthOverride) return { value: monthOverride.override_value, source: 'CLIENT_MONTH_OVERRIDE' }

  const yearOverride = active.find(item => item.parameter_code === paramCode && item.month === null)
  if (yearOverride) return { value: yearOverride.override_value, source: 'CLIENT_YEAR_OVERRIDE' }

  if (param.allows_monthly_values && param.monthly_defaults?.length) {
    const monthly = param.monthly_defaults[month - 1]
    if (monthly != null) return { value: monthly, source: 'MX_DEFAULT' }
  }

  return { value: param.default_value, source: 'MX_DEFAULT' }
}

/** Constrói o mapa de parâmetros efetivos para um mês. */
export function buildParamMapForMonth(
  params: ParameterDefinition[],
  overrides: ClientParameterOverride[],
  month: number,
): Record<string, number | null> {
  const map: Record<string, number | null> = {}
  for (const param of params) {
    map[param.code] = getEffectiveParameter(param.code, month, params, overrides).value
  }
  return map
}

export function validateParameterCode(code: string): string | null {
  if (!code.trim()) return 'Informe o código do parâmetro.'
  if (!/^[A-Z0-9_]+$/.test(code.trim())) return 'O código aceita apenas letras maiúsculas, números e underline.'
  return null
}

export function validateParameterName(name: string): string | null {
  if (!name.trim()) return 'Informe o nome do parâmetro.'
  return null
}

export function validateParameterValue(value: number | null): string | null {
  if (value == null || Number.isNaN(value)) return 'Informe o valor padrão do parâmetro.'
  return null
}

/** Override precisa de justificativa obrigatória. */
export function validateOverrideReason(reason: string): string | null {
  if (!reason.trim()) return 'Justificativa obrigatória para personalizar o parâmetro.'
  return null
}

export function validateOverrideValue(value: number | null): string | null {
  if (value == null || Number.isNaN(value)) return 'Informe o novo valor do parâmetro.'
  return null
}

/** Bloqueia override em parâmetros que não permitem personalização por cliente. */
export function canOverrideParameter(param: ParameterDefinition): boolean {
  return param.allows_client_override !== false
}

export type OverrideDraft = {
  parameter_code: string
  reference_year: number
  scope: OverrideScope
  months: number[]
  new_value: number | null
  reason: string
}

export function validateOverrideDraft(
  draft: OverrideDraft,
  param: ParameterDefinition,
): string | null {
  const codeError = validateParameterCode(draft.parameter_code)
  if (codeError) return codeError
  if (!canOverrideParameter(param)) return 'Este parâmetro não permite personalização por cliente.'
  const reasonError = validateOverrideReason(draft.reason)
  if (reasonError) return reasonError
  const valueError = validateOverrideValue(draft.new_value)
  if (valueError) return valueError
  if (draft.scope === 'MESES_SELECIONADOS' && draft.months.length === 0) {
    return 'Selecione ao menos um mês de aplicação.'
  }
  return null
}

/** Converte o escopo em meses de aplicação ([null] = ano inteiro). */
export function resolveOverrideMonths(draft: OverrideDraft): Array<number | null> {
  if (draft.scope === 'ANO_INTEIRO') return [null]
  if (draft.scope === 'SOMENTE_ESTE_MES') {
    const month = draft.months[0] ?? new Date().getMonth() + 1
    return [month]
  }
  return draft.months
}

/** Normaliza um override em lançamentos mensais (year + per-month). */
export function expandOverrideToRows(draft: OverrideDraft, param: ParameterDefinition): ClientParameterOverride[] {
  const months = resolveOverrideMonths(draft)
  const value = draft.new_value as number
  return months.map(month => ({
    parameter_code: draft.parameter_code,
    reference_year: draft.reference_year,
    month,
    override_value: value,
    reason: draft.reason.trim(),
    status: 'ativo',
  }))
}

export type ImpactPreviewItem = {
  code: string
  name: string
  oldValue: number | null
  newValue: number | null
  hasBase: boolean
}

/**
 * Prévia do impacto de alterar um parâmetro: recalcula os indicadores
 * dependentes com o valor antigo e o novo para o mês informado.
 */
export function previewParameterImpact(params: {
  parameterCode: string
  paramName: string
  oldValue: number | null
  newValue: number
  month: number
  params: ParameterDefinition[]
  overrides: ClientParameterOverride[]
  dependents: Array<{ code: string; name: string; formula_expression: string }>
  valueMap: Record<string, Record<number, number | null>>
  evaluate: (formula: string, inds: Record<string, number | null>, pars: Record<string, number | null>) => number | null
}): { paramName: string; oldValue: number | null; newValue: number; impacted: ImpactPreviewItem[] } {
  const { parameterCode, oldValue, newValue, month, params: allParams, overrides, dependents, valueMap, evaluate } = params

  const buildMap = (overrideValue: number) => {
    const map: Record<string, number | null> = {}
    for (const param of allParams) {
      if (param.code === parameterCode) {
        map[param.code] = overrideValue
        continue
      }
      const eff = getEffectiveParameter(param.code, month, allParams, overrides)
      map[param.code] = eff.value
    }
    return map
  }

  const oldMap = buildMap(oldValue ?? 0)
  const newMap = buildMap(newValue)
  const flat: Record<string, number | null> = {}
  for (const [code, monthMap] of Object.entries(valueMap)) {
    flat[code] = monthMap[month] ?? null
  }

  const impacted = dependents.map(indicator => ({
    code: indicator.code,
    name: indicator.name,
    oldValue: evaluate(indicator.formula_expression, flat, oldMap),
    newValue: evaluate(indicator.formula_expression, flat, newMap),
    hasBase: Object.values(flat).some(value => value != null && !Number.isNaN(value)),
  }))

  return {
    paramName: params.paramName,
    oldValue,
    newValue,
    impacted,
  }
}

export const PARAM_SOURCE_LABEL: Record<EffectiveParameter['source'], string> = {
  CLIENT_MONTH_OVERRIDE: 'Personalizado para o Cliente (mês)',
  CLIENT_YEAR_OVERRIDE: 'Personalizado para o Cliente (ano)',
  MX_DEFAULT: 'Padrão MX',
  SEM_PARAMETRO: 'Sem parâmetro',
}

export const OVERRIDE_SCOPE_LABEL: Record<OverrideScope, string> = {
  ANO_INTEIRO: 'Ano inteiro',
  MESES_SELECIONADOS: 'Meses selecionados',
  SOMENTE_ESTE_MES: 'Somente este mês',
}
