import { supabase } from '@/lib/supabase'

export const INDICATOR_STATUSES = ['rascunho', 'em_revisao', 'publicado', 'desabilitado', 'arquivado'] as const
export const INDICATOR_FREQUENCIES = ['diaria', 'semanal', 'mensal', 'trimestral', 'anual'] as const

export type IndicatorStatus = (typeof INDICATOR_STATUSES)[number]
export type IndicatorFrequency = (typeof INDICATOR_FREQUENCIES)[number]

export const INDICATOR_STATUS_LABEL: Record<IndicatorStatus, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em revisão',
  publicado: 'Publicado',
  desabilitado: 'Desabilitado',
  arquivado: 'Arquivado',
}

export const INDICATOR_FREQUENCY_LABEL: Record<IndicatorFrequency, string> = {
  diaria: 'Diária',
  semanal: 'Semanal',
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  anual: 'Anual',
}

export type CatalogIndicator = {
  metric_key: string
  label: string
  area: string
  descricao: string | null
  value_type: string
  direction: string
  source_scope: string
  status: IndicatorStatus
  frequencia: IndicatorFrequency
  casas_decimais: number
  visivel_dono: boolean
  ano_inicial: number | null
  ano_final: number | null
  formula_expression: string | null
  target_calculation_mode: string | null
  sort_order: number
  active: boolean
  targets: number
}

export type IndicatorParameter = {
  metric_key: string
  market_average: number | null
  best_practice: number | null
  target_default: number | null
  red_threshold: number | null
  yellow_threshold: number | null
  green_threshold: number | null
  notes: string | null
}

/** Transições de status do indicador, espelhando o drawer do Base44. */
export function allowedIndicatorTransitions(status: IndicatorStatus): IndicatorStatus[] {
  if (status === 'rascunho') return ['em_revisao', 'publicado', 'arquivado']
  if (status === 'em_revisao') return ['publicado', 'rascunho', 'arquivado']
  if (status === 'publicado') return ['desabilitado', 'arquivado']
  if (status === 'desabilitado') return ['publicado', 'arquivado']
  return ['rascunho']
}

/** Só indicador publicado entra em plano estratégico e no Módulo Dono. */
export function isUsableIndicator(indicator: Pick<CatalogIndicator, 'status' | 'active'>) {
  return indicator.status === 'publicado' && indicator.active !== false
}

export function validateIndicatorVigencia(anoInicial: number | null, anoFinal: number | null): string | null {
  if (anoInicial !== null && (anoInicial < 2000 || anoInicial > 2100)) return 'Ano inicial fora do intervalo suportado.'
  if (anoFinal !== null && anoInicial !== null && anoFinal < anoInicial) return 'Ano final anterior ao inicial.'
  return null
}

export function validateDecimals(casas: number): string | null {
  if (!Number.isInteger(casas) || casas < 0 || casas > 4) return 'Casas decimais deve ser um inteiro de 0 a 4.'
  return null
}

/**
 * Nova ordem oficial após mover um indicador. Devolve a lista inteira
 * renumerada de 10 em 10, deixando espaço para inserções manuais.
 */
export function reorderIndicators(keys: string[], metricKey: string, direction: 'up' | 'down'): Array<{ metric_key: string; sort_order: number }> {
  const index = keys.indexOf(metricKey)
  if (index === -1) return keys.map((key, position) => ({ metric_key: key, sort_order: (position + 1) * 10 }))
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= keys.length) return keys.map((key, position) => ({ metric_key: key, sort_order: (position + 1) * 10 }))
  const next = [...keys]
  next[index] = keys[target]
  next[target] = keys[index]
  return next.map((key, position) => ({ metric_key: key, sort_order: (position + 1) * 10 }))
}

/**
 * Restauração da ordem padrão MX. Como o catálogo MX não tem uma sequência
 * canônica fixa por chave (diferente dos 45 indicadores do Base44), a
 * restauração normaliza a ordem oficial numa sequência limpa de 10 em 10,
 * preservando a ordem relativa atual e o ciclo de vida (não arquivados na
 * frente, arquivados ao final).
 */
export function restoreDefaultOrder(rows: CatalogIndicator[]): Array<{ metric_key: string; sort_order: number }> {
  const active = rows.filter(item => item.status !== 'arquivado')
  const archived = rows.filter(item => item.status === 'arquivado')
  const ordered = [...active, ...archived]
  return ordered.map((item, index) => ({ metric_key: item.metric_key, sort_order: (index + 1) * 10 }))
}

/** Faixas precisam ser monotônicas na direção do indicador. */
export function validateThresholds(parameter: Pick<IndicatorParameter, 'red_threshold' | 'yellow_threshold' | 'green_threshold'>, direction: string): string | null {
  const { red_threshold: red, yellow_threshold: yellow, green_threshold: green } = parameter
  if (red === null || yellow === null || green === null) return null
  if (direction === 'increase' && !(red <= yellow && yellow <= green)) {
    return 'Para indicador de aumento, as faixas devem crescer: vermelho ≤ amarelo ≤ verde.'
  }
  if (direction === 'decrease' && !(red >= yellow && yellow >= green)) {
    return 'Para indicador de redução, as faixas devem decrescer: vermelho ≥ amarelo ≥ verde.'
  }
  return null
}

export async function fetchCatalogIndicators(): Promise<{ rows: CatalogIndicator[]; error: string | null }> {
  const [{ data, error }, { data: targets }] = await Promise.all([
    supabase
      .from('catalogo_metricas_consultoria')
      .select('metric_key, label, area, descricao, value_type, direction, source_scope, status, frequencia, casas_decimais, visivel_dono, ano_inicial, ano_final, formula_expression, target_calculation_mode, sort_order, active')
      .order('sort_order', { ascending: true }),
    supabase.from('metas_metricas_cliente').select('metric_key'),
  ])
  if (error) return { rows: [], error: error.message }
  const counters = new Map<string, number>()
  for (const target of targets ?? []) {
    if (!target.metric_key) continue
    counters.set(target.metric_key, (counters.get(target.metric_key) ?? 0) + 1)
  }
  return {
    rows: (data ?? []).map(item => ({ ...item, targets: counters.get(item.metric_key) ?? 0 })) as CatalogIndicator[],
    error: null,
  }
}

export async function changeIndicatorStatus(metricKey: string, status: IndicatorStatus): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('catalogo_metricas_consultoria')
    .update({ status, active: status === 'publicado', updated_at: new Date().toISOString() })
    .eq('metric_key', metricKey)
  return { error: error?.message ?? null }
}

export async function toggleOwnerVisibility(metricKey: string, visible: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('catalogo_metricas_consultoria')
    .update({ visivel_dono: visible, updated_at: new Date().toISOString() })
    .eq('metric_key', metricKey)
  return { error: error?.message ?? null }
}

export async function persistIndicatorOrder(order: Array<{ metric_key: string; sort_order: number }>): Promise<{ error: string | null }> {
  for (const item of order) {
    const { error } = await supabase
      .from('catalogo_metricas_consultoria')
      .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
      .eq('metric_key', item.metric_key)
    if (error) return { error: error.message }
  }
  return { error: null }
}

export async function fetchIndicatorParameters(): Promise<{ rows: IndicatorParameter[]; setName: string | null }> {
  const { data: set } = await supabase
    .from('conjuntos_parametros_consultoria')
    .select('id, name')
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!set) return { rows: [], setName: null }
  const { data } = await supabase
    .from('valores_parametros_consultoria')
    .select('metric_key, market_average, best_practice, target_default, red_threshold, yellow_threshold, green_threshold, notes')
    .eq('parameter_set_id', set.id)
  return { rows: (data ?? []) as IndicatorParameter[], setName: set.name }
}
