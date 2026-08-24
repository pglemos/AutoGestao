import { supabase } from '@/lib/supabase'
import {
  officialCatalogOrder,
  overlayCanonicalCatalog,
  matchCanonicalIndicator,
  rewriteCanonicalFormula,
  buildCatalogKeyMap,
  normalizeCatalogKey,
} from './canonicalBase44Catalog'

export const INDICATOR_STATUSES = ['rascunho', 'em_revisao', 'publicado', 'desabilitado', 'arquivado'] as const
export const INDICATOR_FREQUENCIES = ['diaria', 'semanal', 'mensal', 'trimestral', 'anual'] as const
export const INDICATOR_CALCULATION_MODES = ['MANUAL', 'CALCULATED_LOCKED', 'CALCULATED_ADJUSTABLE'] as const

export const INDICATOR_CALCULATION_MODE_LABEL: Record<(typeof INDICATOR_CALCULATION_MODES)[number], string> = {
  MANUAL: 'Manual',
  CALCULATED_LOCKED: 'Calculado bloqueado',
  CALCULATED_ADJUSTABLE: 'Calculado ajustável',
}

export const INDICATOR_VALUE_TYPE_LABEL: Record<string, string> = {
  number: 'Número',
  percent: 'Percentual',
  currency: 'Moeda',
}

export type IndicatorStatus = (typeof INDICATOR_STATUSES)[number]
export type IndicatorFrequency = (typeof INDICATOR_FREQUENCIES)[number]
export type IndicatorCalculationMode = (typeof INDICATOR_CALCULATION_MODES)[number]

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
  created_origin: 'mx_padrao' | 'criado_mx'
  sort_order: number
  active: boolean
  targets: number
  annual_target: number | null
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

export function indicatorCalculationMode(indicator: Pick<CatalogIndicator, 'target_calculation_mode' | 'formula_expression'>): IndicatorCalculationMode {
  if (indicator.target_calculation_mode === 'MANUAL') return 'MANUAL'
  if (indicator.target_calculation_mode === 'CALCULATED_LOCKED') return 'CALCULATED_LOCKED'
  if (indicator.target_calculation_mode === 'CALCULATED_ADJUSTABLE') return 'CALCULATED_ADJUSTABLE'
  if (indicator.formula_expression) return 'CALCULATED_ADJUSTABLE'
  return 'MANUAL'
}

export function indicatorIsCalculated(indicator: Pick<CatalogIndicator, 'target_calculation_mode' | 'formula_expression'>) {
  return indicatorCalculationMode(indicator) !== 'MANUAL'
}

export function indicatorHasParameter(indicator: Pick<CatalogIndicator, 'formula_expression'>) {
  return /\bPAR\s*\(/i.test(indicator.formula_expression ?? '')
}

export type CatalogFilterKey =
  | 'manual'
  | 'calculado_bloqueado'
  | 'calculado_ajustavel'
  | 'digitaveis'
  | 'calculaveis'
  | 'com_parametro'
  | 'sem_parametro'
  | 'padrao_mx'
  | 'criados_mx'
  | 'publicados'
  | 'rascunhos'
  | 'ocultos_dono'
  | 'desabilitados'
  | 'arquivados'

export function indicatorMatchesFilter(indicator: CatalogIndicator, filter: CatalogFilterKey): boolean {
  const mode = indicatorCalculationMode(indicator)
  switch (filter) {
    case 'manual': return mode === 'MANUAL'
    case 'calculado_bloqueado': return mode === 'CALCULATED_LOCKED'
    case 'calculado_ajustavel': return mode === 'CALCULATED_ADJUSTABLE'
    case 'digitaveis': return mode === 'MANUAL'
    case 'calculaveis': return mode !== 'MANUAL'
    case 'com_parametro': return indicatorHasParameter(indicator)
    case 'sem_parametro': return !indicatorHasParameter(indicator)
    case 'padrao_mx': return indicator.created_origin === 'mx_padrao'
    case 'criados_mx': return indicator.created_origin === 'criado_mx'
    case 'publicados': return indicator.status === 'publicado' && indicator.active !== false
    case 'rascunhos': return indicator.status === 'rascunho'
    case 'ocultos_dono': return !indicator.visivel_dono
    case 'desabilitados': return indicator.status === 'desabilitado' || indicator.active === false
    case 'arquivados': return indicator.status === 'arquivado'
  }
}

export function formatIndicatorValueType(valueType: string) {
  return INDICATOR_VALUE_TYPE_LABEL[valueType] ?? valueType
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
  const rank = (item: CatalogIndicator) => {
    const official = officialCatalogOrder(item.metric_key)
    if (item.status === 'arquivado') return 10_000 + official
    return official
  }
  return [...rows]
    .sort((left, right) => rank(left) - rank(right) || left.label.localeCompare(right.label, 'pt-BR'))
    .map((item, index) => ({ metric_key: item.metric_key, sort_order: officialCatalogOrder(item.metric_key, (index + 1) * 10) }))
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
  const currentYear = new Date().getFullYear()
  const [{ data, error }, { data: targets, error: targetsError }] = await Promise.all([
    supabase
      .from('catalogo_metricas_consultoria')
      .select('metric_key, label, area, descricao, value_type, direction, source_scope, status, frequencia, casas_decimais, visivel_dono, ano_inicial, ano_final, formula_expression, target_calculation_mode, created_origin, sort_order, active')
      .order('sort_order', { ascending: true }),
    supabase.rpc('get_admin_indicator_target_aggregates', { p_year: currentYear }),
  ])
  if (error || targetsError) return { rows: [], error: (error ?? targetsError)?.message ?? 'Não foi possível carregar os indicadores.' }
  const counters = new Map<string, number>()
  const annualTotals = new Map<string, number>()
  for (const target of targets ?? []) {
    if (!target.metric_key) continue
    counters.set(target.metric_key, Number(target.target_count) || 0)
    const value = Number(target.annual_target)
    if (Number.isFinite(value)) annualTotals.set(target.metric_key, (annualTotals.get(target.metric_key) ?? 0) + value)
  }
  return {
    rows: overlayCanonicalCatalog((data ?? []).map(item => ({
      ...item,
      created_origin: item.created_origin === 'criado_mx' ? 'criado_mx' : 'mx_padrao',
      targets: counters.get(item.metric_key) ?? 0,
      annual_target: annualTotals.get(item.metric_key) ?? null,
    })) as CatalogIndicator[]),
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

export async function toggleOwnerVisibility(
  metricKey: string,
  visible: boolean,
  audit?: { motivo: string; anoInicial: number },
): Promise<{ error: string | null }> {
  if (audit) {
    // Auditoria antes da mutação: falha de auditoria não pode deixar a
    // alteração aplicada sem registro (e a UI consistente).
    // ponytail: escopo fixo "todos os clientes"; seleção por cliente quando houver recorte por Dono
    let userId: string | null = null
    let userName: string | null = null
    try {
      const { data } = await supabase.auth.getUser()
      userId = data.user?.id ?? null
    } catch { /* sessão indisponível: auditoria segue sem usuário */ }
    if (userId) {
      const { data: profile } = await supabase.from('usuarios').select('name').eq('id', userId).maybeSingle()
      userName = (profile as { name?: string | null } | null)?.name ?? null
    }
    const { error: auditError } = await supabase.from('logs_auditoria_consultoria_mx').insert({
      action: visible ? 'indicador_reativado_dono' : 'indicador_ocultado_dono',
      origin: 'admin-mx',
      resource: `catalogo_metricas_consultoria:${metricKey}`,
      user_id: userId,
      user_name: userName,
      value_before: visible ? 'oculto no Dono' : 'visível no Dono',
      value_after: visible
        ? `visível no Dono a partir de ${audit.anoInicial}`
        : `oculto no Dono a partir de ${audit.anoInicial} — motivo: ${audit.motivo}`,
    })
    if (auditError) return { error: auditError.message }
  }
  const { error } = await supabase
    .from('catalogo_metricas_consultoria')
    .update({ visivel_dono: visible, updated_at: new Date().toISOString() })
    .eq('metric_key', metricKey)
  if (error) return { error: error.message }
  return { error: null }
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

export async function fetchIndicatorParameters(): Promise<{ rows: IndicatorParameter[]; setName: string | null; error: string | null }> {
  const { data: set, error: setError } = await supabase
    .from('conjuntos_parametros_consultoria')
    .select('id, name')
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (setError) return { rows: [], setName: null, error: setError.message }
  if (!set) return { rows: [], setName: null, error: null }
  const { data, error } = await supabase
    .from('valores_parametros_consultoria')
    .select('metric_key, market_average, best_practice, target_default, red_threshold, yellow_threshold, green_threshold, notes')
    .eq('parameter_set_id', set.id)
  return { rows: (data ?? []) as IndicatorParameter[], setName: set.name, error: error?.message ?? null }
}

export async function applyCanonicalFormulas(): Promise<{ updated: number; error: string | null }> {
  const {
    BASE44_STANDARD_INDICATORS,
    officialDirection,
    officialValueType,
  } = await import('./canonicalBase44Catalog')
  const { data, error } = await supabase.from('catalogo_metricas_consultoria').select('metric_key, label, area, status')
  if (error) return { updated: 0, error: error.message }
  const keys = (data ?? []).map(row => String(row.metric_key))
  const keyMap = buildCatalogKeyMap(keys)
  let updated = 0
  for (const item of BASE44_STANDARD_INDICATORS) {
    const metricKey = keyMap.get(normalizeCatalogKey(item.code))
      ?? keys.find(key => matchCanonicalIndicator(key)?.code === item.code)
      ?? item.code.toLowerCase()
    const formula = item.formula_expression
      ? rewriteCanonicalFormula(item.formula_expression, code => keyMap.get(normalizeCatalogKey(code)) ?? code.toLowerCase())
      : null
    const payload = {
      metric_key: metricKey,
      label: item.name,
      area: item.area,
      value_type: officialValueType(item.code),
      direction: officialDirection(item.code),
      source_scope: formula ? 'computed' : 'manual',
      formula_expression: formula,
      target_calculation_mode: item.target_calculation_mode,
      sort_order: officialCatalogOrder(item.code),
      status: 'publicado',
      active: true,
      visivel_dono: true,
      created_origin: 'mx_padrao',
      frequencia: 'mensal',
      updated_at: new Date().toISOString(),
    }
    const { error: upsertError } = await supabase
      .from('catalogo_metricas_consultoria')
      .upsert(payload, { onConflict: 'metric_key' })
    if (upsertError) return { updated, error: upsertError.message }
    keyMap.set(normalizeCatalogKey(item.code), metricKey)
    updated += 1
  }
  for (const row of data ?? []) {
    const key = String(row.metric_key)
    if (matchCanonicalIndicator(key) || matchCanonicalIndicator(String(row.label ?? ''))) continue
    const { error: archiveError } = await supabase
      .from('catalogo_metricas_consultoria')
      .update({ status: 'arquivado', active: false, updated_at: new Date().toISOString() })
      .eq('metric_key', key)
    if (archiveError) return { updated, error: archiveError.message }
  }
  return { updated, error: null }
}
