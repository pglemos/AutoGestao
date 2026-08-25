// Parâmetros estratégicos (os 13 do Base44) — definição, persistência e valor efetivo.
//
// Paridade com o Base44 `/indicadores` → aba "Parâmetros e Fórmulas", tabela
// Parâmetro | Valor | Unidade | Ajuste cliente | Dependentes | Status | Ações.
//
// Até aqui os 13 parâmetros existiam apenas como constante hardcoded
// (`BASE44_STANDARD_PARAMETERS`, consumida por `officialParameterDefaults`), sem
// tela nem persistência: a MX não conseguia alterar o padrão nem ver quem depende
// de cada parâmetro. Os valores editados pela MX passam a viver em
// `parametros_estrategicos_mx` (tabela própria — `valores_parametros_consultoria`
// tem FK de `metric_key` para o catálogo de indicadores e não aceita código de
// parâmetro). Overrides por cliente continuam em `overrides_parametros_cliente`.

import { supabase } from '@/lib/supabase'
import { BASE44_STANDARD_PARAMETERS } from './canonicalBase44Catalog'
import { extractParameterDeps } from './indicatorFormulas'
import { buildParamMapForMonth, type ClientParameterOverride, type ParameterDefinition } from './parameterCatalog'
import type { FormulaAwareIndicator } from './indicatorData'

/** Unidade de leitura de cada parâmetro (rótulo da coluna "Unidade"). */
const PARAMETER_UNITS: Record<string, string> = {
  LEADS_PER_INTERNET_SALE: 'leads',
  TRADE_SALES_RATE: '%',
  EVALUATIONS_PER_TRADE_SALE: 'avaliações',
  FINANCED_SALES_RATE: '%',
  APPROVAL_BUFFER_MULTIPLIER: 'multiplicador',
  APPROVED_TO_PAID_CONVERSION: '%',
  LEAD_TO_APPOINTMENT_RATE: '%',
  APPOINTMENT_TO_VISIT_RATE: '%',
  ACTIVE_STOCK_RATE: '%',
  STOCK_TO_SALES_RATIO: 'razão',
  OVER_90_STOCK_RATE: '%',
  STOCK_MARGIN_RATE: '%',
  POST_SALE_RATE: '%',
}

export const STRATEGIC_PARAMETER_CODES = BASE44_STANDARD_PARAMETERS.map(item => item.code)

export function isStrategicParameterCode(code: string): boolean {
  const normalized = code.trim().toUpperCase()
  return STRATEGIC_PARAMETER_CODES.some(item => item === normalized)
}

export function parameterUnit(code: string): string {
  return PARAMETER_UNITS[code] ?? 'número'
}

/** Definições padrão da MX (sem valores persistidos aplicados). */
export function strategicParameterDefinitions(): ParameterDefinition[] {
  return BASE44_STANDARD_PARAMETERS.map(item => ({
    id: item.code,
    code: item.code,
    name: item.name,
    unit: parameterUnit(item.code),
    default_value: item.default_value,
    allows_client_override: true,
    allows_monthly_values: 'monthly_defaults' in item,
    monthly_defaults: 'monthly_defaults' in item ? [...item.monthly_defaults] : undefined,
    status: 'ativo',
  }))
}

/**
 * Definições com o valor persistido pela MX sobrepondo o padrão de código.
 * `persisted` é o mapa `código → valor` vindo de `valores_parametros_consultoria`.
 */
export type PersistedParameters = {
  values: Record<string, number | null>
  monthly: Record<string, number[] | null>
}

export function applyPersistedParameterValues(
  definitions: ParameterDefinition[],
  persisted: PersistedParameters,
): ParameterDefinition[] {
  return definitions.map(definition => {
    const value = persisted.values[definition.code]
    if (value == null || Number.isNaN(value)) return definition
    const monthly = persisted.monthly[definition.code]
    return {
      ...definition,
      default_value: value,
      monthly_defaults: monthly && monthly.length === 12 ? monthly : undefined,
    }
  })
}

/** Indicadores cuja fórmula referencia o parâmetro. */
export function parameterDependents(
  indicators: FormulaAwareIndicator[],
  parameterCode: string,
): Array<{ code: string; name: string; formula_expression: string }> {
  const normalized = parameterCode.trim().toUpperCase()
  return indicators
    .filter(indicator => extractParameterDeps(indicator.formula_expression)
      .some(dep => dep.trim().toUpperCase() === normalized))
    .map(indicator => ({
      code: indicator.metric_key,
      name: indicator.label,
      formula_expression: indicator.formula_expression ?? '',
    }))
}

export async function fetchStrategicParameterValues(
  parameterSetId: string,
): Promise<PersistedParameters & { error: string | null }> {
  const { data, error } = await supabase
    .from('parametros_estrategicos_mx')
    .select('code, default_value, monthly_defaults, status')
    .eq('parameter_set_id', parameterSetId)
  if (error) return { values: {}, monthly: {}, error: error.message }
  const values: Record<string, number | null> = {}
  const monthly: Record<string, number[] | null> = {}
  type Row = { code: string; default_value: number | null; monthly_defaults: number[] | null; status: string }
  for (const row of (data ?? []) as Row[]) {
    if (row.status === 'encerrado') continue
    values[row.code] = row.default_value == null ? null : Number(row.default_value)
    monthly[row.code] = row.monthly_defaults?.map(Number) ?? null
  }
  return { values, monthly, error: null }
}

export async function saveStrategicParameterValue(input: {
  parameterSetId: string
  code: string
  value: number
  notes?: string | null
}): Promise<{ error: string | null }> {
  const definition = strategicParameterDefinitions().find(item => item.code === input.code)
  if (!definition) return { error: `Código de parâmetro desconhecido: ${input.code}` }
  const { error } = await supabase
    .from('parametros_estrategicos_mx')
    .upsert({
      parameter_set_id: input.parameterSetId,
      code: definition.code,
      name: definition.name,
      unit: definition.unit,
      default_value: input.value,
      monthly_defaults: null,
      status: 'ativo',
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'parameter_set_id,code' })
  return { error: error?.message ?? null }
}

/** Devolve o parâmetro ao padrão da metodologia (valor e mensais de código). */
export async function restoreStrategicParameterDefault(input: {
  parameterSetId: string
  code: string
}): Promise<{ error: string | null }> {
  const definition = strategicParameterDefinitions().find(item => item.code === input.code)
  if (!definition) return { error: `Código de parâmetro desconhecido: ${input.code}` }
  const { error } = await supabase
    .from('parametros_estrategicos_mx')
    .upsert({
      parameter_set_id: input.parameterSetId,
      code: definition.code,
      name: definition.name,
      unit: definition.unit,
      default_value: definition.default_value ?? 0,
      monthly_defaults: definition.monthly_defaults ?? null,
      status: 'ativo',
      notes: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'parameter_set_id,code' })
  return { error: error?.message ?? null }
}

/**
 * Fonte de parâmetros efetiva de um cliente: padrão da metodologia, sobreposto
 * pelo valor da MX (parametros_estrategicos_mx) e pelo ajuste do cliente
 * (overrides_parametros_cliente), na hierarquia cliente/mês > cliente/ano >
 * MX mês > MX padrão.
 *
 * Sem isto o motor de fórmulas usava `officialParameterDefaults`, ou seja, a
 * constante de código — o ajuste por cliente não chegava ao cálculo.
 */
export async function loadClientParameterSource(params: {
  clientId: string | null
  year: number
  parameterSetId?: string | null
}): Promise<{ source: (month: number) => Record<string, number | null>; error: string | null }> {
  let definitions = strategicParameterDefinitions()
  let error: string | null = null

  const setId = params.parameterSetId ?? (await fetchActiveParameterSetId())
  if (setId) {
    const persisted = await fetchStrategicParameterValues(setId)
    if (persisted.error) error = persisted.error
    else definitions = applyPersistedParameterValues(definitions, persisted)
  }

  let overrides: ClientParameterOverride[] = []
  if (params.clientId) {
    const { data, error: overrideError } = await supabase
      .from('overrides_parametros_cliente')
      .select('metric_key, reference_year, month, override_value, reason, status')
      .eq('client_id', params.clientId)
      .eq('reference_year', params.year)
      .eq('status', 'ativo')
      .in('metric_key', STRATEGIC_PARAMETER_CODES)
    if (overrideError) error = error ?? overrideError.message
    type Row = { metric_key: string; reference_year: number; month: number | null; override_value: number; reason: string; status: string }
    overrides = ((data ?? []) as Row[]).map(row => ({
      parameter_code: row.metric_key,
      reference_year: row.reference_year,
      month: row.month,
      override_value: Number(row.override_value),
      reason: row.reason,
      status: 'ativo',
    }))
  }

  return {
    source: (month: number) => buildParamMapForMonth(definitions, overrides, month),
    error,
  }
}

async function fetchActiveParameterSetId(): Promise<string | null> {
  const { data } = await supabase
    .from('conjuntos_parametros_consultoria')
    .select('id')
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}
