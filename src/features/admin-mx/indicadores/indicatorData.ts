// Acesso a dados do módulo indicadores — camada de persistência (Supabase).
//
// Tudo que é regra de negócio pura vive em indicatorFormulas / parameterCatalog
// / metasRealizados / indicatorWizard; este arquivo só orquestra leituras e
// gravações nas tabelas existentes + a nova overrides_parametros_cliente.

import { supabase } from '@/lib/supabase'
import { evaluateFormula, extractIndicatorDeps, extractParameterDeps } from './indicatorFormulas'
import type { IndicatorParameter } from './indicatorCatalog'

// ── Fórmulas e dependentes ────────────────────────────────────────────────────

export type FormulaAwareIndicator = {
  metric_key: string
  label: string
  area: string
  formula_expression: string | null
  target_calculation_mode: string | null
}

/** Carrega os indicadores com fórmula para o testador e mapa de dependentes. */
export async function fetchFormulaIndicators(): Promise<{ rows: FormulaAwareIndicator[]; error: string | null }> {
  const { data, error } = await supabase
    .from('catalogo_metricas_consultoria')
    .select('metric_key, label, area, formula_expression, target_calculation_mode')
    .order('sort_order', { ascending: true })
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as FormulaAwareIndicator[], error: null }
}

/** Indicadores que dependem de um parâmetro (referência PAR no fórmula). */
export function dependentsOfParameter(indicators: FormulaAwareIndicator[], parameterCode: string): Array<{ metric_key: string; label: string }> {
  return indicators
    .filter(indicator => extractParameterDeps(indicator.formula_expression).includes(parameterCode))
    .map(indicator => ({ metric_key: indicator.metric_key, label: indicator.label }))
}

export function indicatorDependencies(indicator: Pick<FormulaAwareIndicator, 'formula_expression'>): string[] {
  return extractIndicatorDeps(indicator.formula_expression)
}

// ── Parâmetros do catálogo (conjunto ativo) ───────────────────────────────────

export type ParameterSetInfo = {
  id: string
  name: string
  version: string
}

export async function fetchActiveParameterSet(): Promise<{ set: ParameterSetInfo | null; error: string | null }> {
  const { data, error } = await supabase
    .from('conjuntos_parametros_consultoria')
    .select('id, name, version')
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return { set: null, error: error.message }
  return { set: (data as ParameterSetInfo) ?? null, error: null }
}

export async function fetchParameterValues(parameterSetId: string): Promise<{ rows: IndicatorParameter[]; error: string | null }> {
  const { data, error } = await supabase
    .from('valores_parametros_consultoria')
    .select('metric_key, market_average, best_practice, target_default, red_threshold, yellow_threshold, green_threshold, notes')
    .eq('parameter_set_id', parameterSetId)
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as IndicatorParameter[], error: null }
}

/**
 * Cria/atualiza o valor de parâmetro de um indicador no conjunto ativo.
 * A tabela tem CHECKs próprios; a validação de faixas fica na UI.
 */
export async function saveParameterValue(input: {
  parameterSetId: string
  metric_key: string
  target_default: number | null
  market_average: number | null
  best_practice: number | null
  red_threshold: number | null
  yellow_threshold: number | null
  green_threshold: number | null
  notes?: string | null
}): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('valores_parametros_consultoria')
    .upsert({
      parameter_set_id: input.parameterSetId,
      metric_key: input.metric_key,
      target_default: input.target_default,
      market_average: input.market_average,
      best_practice: input.best_practice,
      red_threshold: input.red_threshold,
      yellow_threshold: input.yellow_threshold,
      green_threshold: input.green_threshold,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'parameter_set_id,metric_key' })
  return { error: error?.message ?? null }
}

// ── Overrides de parâmetro por cliente ────────────────────────────────────────

export type ClientOverrideRow = {
  id: string
  client_id: string
  parameter_set_id: string | null
  metric_key: string
  reference_year: number
  month: number | null
  override_value: number
  default_value_snapshot: number | null
  reason: string
  status: string
}

export async function fetchClientOverrides(clientId: string, referenceYear: number): Promise<{ rows: ClientOverrideRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('overrides_parametros_cliente')
    .select('*')
    .eq('client_id', clientId)
    .eq('reference_year', referenceYear)
    .order('created_at', { ascending: false })
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as ClientOverrideRow[], error: null }
}

/**
 * Salva um override: encerra os ativos anteriores do mesmo parâmetro/ano/escopo
 * e insere o novo com justificativa. Retorna a lista de linhas a gravar.
 */
export async function saveClientOverride(params: {
  clientId: string
  parameterSetId: string | null
  metricKey: string
  referenceYear: number
  rows: Array<{ month: number | null; override_value: number; reason: string }>
  defaultValueSnapshot: number | null
  createdBy: string | null
}): Promise<{ error: string | null }> {
  const { clientId, parameterSetId, metricKey, referenceYear, rows, defaultValueSnapshot, createdBy } = params
  if (rows.length === 0) return { error: 'Nenhuma linha de override para gravar.' }

  const { error: closeError } = await supabase
    .from('overrides_parametros_cliente')
    .update({ status: 'encerrado', updated_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('metric_key', metricKey)
    .eq('reference_year', referenceYear)
    .eq('status', 'ativo')
  if (closeError) return { error: closeError.message }

  const { error: insertError } = await supabase
    .from('overrides_parametros_cliente')
    .insert(rows.map(row => ({
      client_id: clientId,
      parameter_set_id: parameterSetId,
      metric_key: metricKey,
      reference_year: referenceYear,
      month: row.month,
      override_value: row.override_value,
      default_value_snapshot: defaultValueSnapshot,
      reason: row.reason.trim(),
      status: 'ativo',
      created_by: createdBy,
    })))
  if (insertError) return { error: insertError.message }
  return { error: null }
}

export async function restoreParameterToDefault(clientId: string, metricKey: string, referenceYear: number): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('overrides_parametros_cliente')
    .update({ status: 'encerrado', updated_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('metric_key', metricKey)
    .eq('reference_year', referenceYear)
    .eq('status', 'ativo')
  return { error: error?.message ?? null }
}

// ── Metas e realizados (planejamento por loja) ────────────────────────────────

export type StorePlanningRow = {
  id: string
  loja_id: string
  indicator_code: string
  year: number
  month: number
  meta: number | null
  realizado: number | null
  ano_anterior: number | null
}

export type PlanningHistoryRow = {
  id: string
  loja_id: string
  indicator_code: string
  year: number
  previous_values: unknown
  new_values: unknown
  note: string | null
  changed_by: string | null
  created_at: string
}

export async function fetchStorePlanningValues(lojaId: string, year: number): Promise<{ rows: StorePlanningRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('valores_indicadores_planejamento_vigentes')
    .select('id, loja_id, indicator_code, year, month, meta, realizado, ano_anterior')
    .eq('loja_id', lojaId)
    .eq('year', year)
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as StorePlanningRow[], error: null }
}

export async function fetchPlanningHistory(lojaId: string, indicatorCode: string, year: number): Promise<{ rows: PlanningHistoryRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('historico_valores_indicadores_planejamento')
    .select('id, loja_id, indicator_code, year, previous_values, new_values, note, changed_by, created_at')
    .eq('loja_id', lojaId)
    .eq('indicator_code', indicatorCode)
    .eq('year', year)
    .order('created_at', { ascending: false })
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as PlanningHistoryRow[], error: null }
}

/** Salva as metas de um indicador de uma loja via RPC oficial (gera histórico). */
export async function saveIndicatorTargets(params: {
  lojaId: string
  indicatorCode: string
  year: number
  values: Array<number | null>
  note?: string | null
}): Promise<{ error: string | null; data: unknown }> {
  const { data, error } = await supabase.rpc('salvar_metas_indicador_planejamento', {
    p_store_id: params.lojaId,
    p_indicator_code: params.indicatorCode,
    p_year: params.year,
    p_values: params.values,
    p_note: params.note ?? null,
  })
  return { error: error?.message ?? null, data }
}

export async function restorePlanningHistory(historyId: string, note?: string | null): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('restaurar_metas_indicador_planejamento', {
    p_history_id: historyId,
    p_note: note ?? null,
  })
  return { error: error?.message ?? null }
}

export async function canManageStoreTargets(lojaId: string): Promise<{ allowed: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('pode_gerir_metas_planejamento', { p_store_id: lojaId })
  if (error) return { allowed: false, error: error.message }
  return { allowed: data === true, error: null }
}

/**
 * Executa mutações de cópia de metas. Agrupa por loja + indicador e usa a RPC
 * oficial (gera histórico e respeita o índice único por loja/indicador/ano/mês).
 */
export async function applyStoreCopyMutations(mutations: Array<{ loja_id: string; indicator_code: string; year: number; month: number; meta: number }>): Promise<{ error: string | null; applied: number }> {
  const byStoreIndicator = new Map<string, Array<{ month: number; meta: number }>>()
  for (const mutation of mutations) {
    const key = `${mutation.loja_id}|${mutation.indicator_code}|${mutation.year}`
    if (!byStoreIndicator.has(key)) byStoreIndicator.set(key, [])
    byStoreIndicator.get(key)?.push({ month: mutation.month, meta: mutation.meta })
  }

  let applied = 0
  for (const [key, values] of byStoreIndicator) {
    const [lojaId, indicatorCode, yearText] = key.split('|')
    const year = Number(yearText)
    const valuesByMonth = new Map(values.map(value => [value.month, value.meta]))
    const fullYear = Array.from({ length: 12 }, (_, index) => valuesByMonth.get(index + 1) ?? null)
    const { error } = await supabase.rpc('salvar_metas_indicador_planejamento', {
      p_store_id: lojaId,
      p_indicator_code: indicatorCode,
      p_year: year,
      p_values: fullYear,
      p_note: 'Cópia de metas entre lojas',
    })
    if (error) return { error: error.message, applied }
    applied += values.length
  }
  return { error: null, applied }
}

// ── Exportar valores para planilha (tabela reutilizada pelo tester) ───────────

export { evaluateFormula }
