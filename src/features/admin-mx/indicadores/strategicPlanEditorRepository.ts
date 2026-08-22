import { supabase } from '@/lib/supabase'
import { fetchClientUnits } from '@/features/strategic-plan/clientPlanningRepository'
import type { ClientUnit } from '@/features/strategic-plan/clientUnits'
import {
  reviseCycle,
  transitionCycle,
  validateCycleReadiness,
  type PlanCycle,
} from '@/features/strategic-plan/planCycleRepository'
import type { PlanCycleStatus, PlanReadiness } from '@/features/strategic-plan/planCycle'
import type { CatalogIndicator } from './indicatorCatalog'
import { overlayCanonicalCatalog } from './canonicalBase44Catalog'
import type { EditorField, EditorPlanningRow } from './strategicPlanEditor'

const CYCLE_COLUMNS = 'id, client_id, year, status, version_number, package_version_id, revised_from_id, published_at, published_by, created_at, updated_at'
const CATALOG_COLUMNS = 'metric_key, label, area, descricao, value_type, direction, source_scope, status, frequencia, casas_decimais, visivel_dono, ano_inicial, ano_final, formula_expression, target_calculation_mode, created_origin, sort_order, active, unit_entry_mode, unit_rollup_method, weight_indicator_code'

export type StrategicPlanEditorClient = {
  id: string
  name: string
  status: string | null
  primaryStoreId: string | null
}

export type StrategicPlanEditorIndicator = CatalogIndicator & {
  rosterId: string
  enabled: boolean
  visible_to_owner: boolean
  display_order: number
  origin: 'pacote' | 'adicionado_mx'
  unit_entry_mode: string | null
  unit_rollup_method: string | null
  weight_indicator_code: string | null
}

export type StrategicPlanEditorData = {
  cycle: PlanCycle
  client: StrategicPlanEditorClient
  units: ClientUnit[]
  indicators: StrategicPlanEditorIndicator[]
  catalog: CatalogIndicator[]
  values: EditorPlanningRow[]
}

export type StrategicPlanHistoryRow = {
  id: string
  cycleId: string | null
  lojaId: string
  indicatorCode: string
  year: number
  field: EditorField
  previousValues: Array<number | null>
  newValues: Array<number | null>
  note: string | null
  changedBy: string | null
  userName: string
  createdAt: string
}

type Row = Record<string, unknown>

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function asNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function mapCatalogRow(row: Row): CatalogIndicator {
  return {
    metric_key: asString(row.metric_key),
    label: asString(row.label, asString(row.metric_key)),
    area: asString(row.area, 'Sem área'),
    descricao: row.descricao == null ? null : asString(row.descricao),
    value_type: asString(row.value_type, 'number'),
    direction: asString(row.direction, 'increase'),
    source_scope: asString(row.source_scope, 'loja'),
    status: asString(row.status, 'publicado') as CatalogIndicator['status'],
    frequencia: asString(row.frequencia, 'mensal') as CatalogIndicator['frequencia'],
    casas_decimais: asNumber(row.casas_decimais),
    visivel_dono: row.visivel_dono !== false,
    ano_inicial: row.ano_inicial == null ? null : asNumber(row.ano_inicial),
    ano_final: row.ano_final == null ? null : asNumber(row.ano_final),
    formula_expression: row.formula_expression == null ? null : asString(row.formula_expression),
    target_calculation_mode: row.target_calculation_mode == null ? null : asString(row.target_calculation_mode),
    created_origin: row.created_origin === 'criado_mx' ? 'criado_mx' : 'mx_padrao',
    sort_order: asNumber(row.sort_order, 9999),
    active: row.active !== false,
    targets: 0,
    annual_target: null,
  }
}

function toEditorIndicator(roster: Row, catalog: CatalogIndicator): StrategicPlanEditorIndicator {
  return {
    ...catalog,
    rosterId: asString(roster.id),
    enabled: roster.enabled !== false,
    visible_to_owner: roster.visible_to_owner !== false,
    display_order: asNumber(roster.display_order, catalog.sort_order),
    origin: roster.origin === 'adicionado_mx' ? 'adicionado_mx' : 'pacote',
    unit_entry_mode: roster.unit_entry_mode_snapshot == null ? null : asString(roster.unit_entry_mode_snapshot),
    unit_rollup_method: roster.unit_rollup_method_snapshot == null ? null : asString(roster.unit_rollup_method_snapshot),
    weight_indicator_code: roster.weight_indicator_code_snapshot == null ? null : asString(roster.weight_indicator_code_snapshot),
  }
}

async function fetchCatalog(): Promise<{ rows: CatalogIndicator[]; error: string | null }> {
  const { data, error } = await supabase
    .from('catalogo_metricas_consultoria')
    .select(CATALOG_COLUMNS)
    .order('sort_order', { ascending: true })

  if (error) return { rows: [], error: error.message }
  return { rows: overlayCanonicalCatalog(((data ?? []) as Row[]).map(mapCatalogRow)), error: null }
}

async function fetchCycleRoster(cycle: PlanCycle): Promise<{ rows: Row[]; error: string | null }> {
  const result = await supabase
    .from('ciclos_plano_estrategico_indicadores')
    .select('id, ciclo_id, metric_key, enabled, visible_to_owner, display_order, origin, label_snapshot, area_snapshot, value_type_snapshot, calculation_mode_snapshot, unit_entry_mode_snapshot, unit_rollup_method_snapshot, weight_indicator_code_snapshot')
    .eq('ciclo_id', cycle.id)
    .order('display_order', { ascending: true })

  if (!result.error) return { rows: (result.data ?? []) as Row[], error: null }

  // Compatibilidade durante a janela em que o frontend chega antes da migration
  // do roster por ciclo: a versão do pacote continua sendo a fonte de leitura,
  // mas as ações de adicionar/visibilidade permanecem desabilitadas pela API.
  if (!cycle.package_version_id) return { rows: [], error: result.error.message }
  const fallback = await supabase
    .from('pacotes_indicadores_itens')
    .select('id, metric_key, ordem_snapshot, label_snapshot, area_snapshot, input_mode_snapshot')
    .eq('version_id', cycle.package_version_id)
    .order('ordem_snapshot', { ascending: true })
  if (fallback.error) return { rows: [], error: result.error.message }
  return {
    rows: ((fallback.data ?? []) as Row[]).map((row, index) => ({
      id: `package:${asString(row.id)}`,
      ciclo_id: cycle.id,
      metric_key: row.metric_key,
      enabled: true,
      visible_to_owner: true,
      display_order: asNumber(row.ordem_snapshot, (index + 1) * 10),
      origin: 'pacote',
      label_snapshot: row.label_snapshot,
      area_snapshot: row.area_snapshot,
      value_type_snapshot: null,
      calculation_mode_snapshot: row.input_mode_snapshot,
      unit_entry_mode_snapshot: null,
      unit_rollup_method_snapshot: null,
      weight_indicator_code_snapshot: null,
    })),
    error: null,
  }
}

export async function fetchStrategicPlanEditorData(cycleId: string): Promise<{ data: StrategicPlanEditorData | null; error: string | null }> {
  const { data: cycleData, error: cycleError } = await supabase
    .from('ciclos_plano_estrategico')
    .select(CYCLE_COLUMNS)
    .eq('id', cycleId)
    .maybeSingle()
  if (cycleError) return { data: null, error: cycleError.message }
  if (!cycleData) return { data: null, error: 'Ciclo do plano estratégico não encontrado.' }

  const cycle = cycleData as unknown as PlanCycle
  const [clientResult, rosterResult, catalogResult] = await Promise.all([
    supabase.from('clientes_consultoria').select('id, name, legal_name, status, primary_store_id').eq('id', cycle.client_id).maybeSingle(),
    fetchCycleRoster(cycle),
    fetchCatalog(),
  ])
  if (clientResult.error) return { data: null, error: clientResult.error.message }
  if (!clientResult.data) return { data: null, error: 'Cliente do ciclo não encontrado.' }
  if (rosterResult.error) return { data: null, error: rosterResult.error }
  if (catalogResult.error) return { data: null, error: catalogResult.error }

  const client: StrategicPlanEditorClient = {
    id: asString((clientResult.data as Row).id, cycle.client_id),
    name: asString((clientResult.data as Row).name || (clientResult.data as Row).legal_name, cycle.client_id),
    status: (clientResult.data as Row).status == null ? null : asString((clientResult.data as Row).status),
    primaryStoreId: (clientResult.data as Row).primary_store_id == null ? null : asString((clientResult.data as Row).primary_store_id),
  }
  const catalogByKey = new Map(catalogResult.rows.map(row => [row.metric_key, row]))
  const indicators = rosterResult.rows
    .map(row => {
      const catalog = catalogByKey.get(asString(row.metric_key))
      return catalog ? toEditorIndicator(row, catalog) : null
    })
    .filter((row): row is StrategicPlanEditorIndicator => Boolean(row))

  const unitsResult = await fetchClientUnits(client.id)
  if (unitsResult.error) return { data: null, error: unitsResult.error }
  const unitIds = unitsResult.units.map(unit => unit.id)
  const values = await fetchCyclePlanningValues(cycle.id, cycle.year, unitIds)
  if (values.error) return { data: null, error: values.error }

  return {
    data: { cycle, client, units: unitsResult.units, indicators, catalog: catalogResult.rows, values: values.rows },
    error: null,
  }
}

export async function fetchCyclePlanningValues(
  cycleId: string,
  year: number,
  unitIds: string[],
): Promise<{ rows: EditorPlanningRow[]; error: string | null }> {
  if (unitIds.length === 0) return { rows: [], error: null }
  const { data, error } = await supabase
    .from('valores_indicadores_planejamento')
    .select('loja_id, indicator_code, year, month, meta, realizado, ano_anterior')
    .eq('ciclo_id', cycleId)
    .eq('year', year)
    .in('loja_id', unitIds)
  if (error) return { rows: [], error: error.message }
  return {
    rows: ((data ?? []) as Row[]).map(row => ({
      loja_id: asString(row.loja_id),
      indicator_code: asString(row.indicator_code),
      month: row.month == null ? null : asNumber(row.month),
      meta: asNullableNumber(row.meta),
      realizado: asNullableNumber(row.realizado),
      ano_anterior: asNullableNumber(row.ano_anterior),
    })),
    error: null,
  }
}

function asNumberArray(value: unknown): Array<number | null> {
  if (!Array.isArray(value)) return Array.from({ length: 12 }, () => null)
  return Array.from({ length: 12 }, (_, index) => asNullableNumber(value[index]))
}

function asEditorField(value: unknown): EditorField {
  return value === 'realizado' || value === 'ano_anterior' ? value : 'meta'
}

/** Histórico versionado por ciclo, unidade, indicador e campo. */
export async function fetchCycleHistory(params: {
  cycleId: string
  unitIds?: string[]
  indicatorCode?: string
  limit?: number
}): Promise<{ rows: StrategicPlanHistoryRow[]; error: string | null }> {
  let query = supabase
    .from('historico_valores_indicadores_planejamento')
    .select('id, ciclo_id, loja_id, indicator_code, year, field, previous_values, new_values, note, changed_by, created_at')
    .eq('ciclo_id', params.cycleId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 500)

  if (params.unitIds?.length) query = query.in('loja_id', params.unitIds)
  if (params.indicatorCode) query = query.eq('indicator_code', params.indicatorCode)

  const { data, error } = await query
  if (error) return { rows: [], error: error.message }

  const rawRows = (data ?? []) as Row[]
  const changedByIds = [...new Set(rawRows.map(row => asString(row.changed_by)).filter(Boolean))]
  const usersResult = changedByIds.length
    ? await supabase.from('usuarios').select('id, name').in('id', changedByIds)
    : { data: [], error: null }
  const users = new Map(((usersResult.data ?? []) as Row[]).map(row => [asString(row.id), asString(row.name, 'Usuário não identificado')]))

  return {
    rows: rawRows.map(row => {
      const changedBy = row.changed_by == null ? null : asString(row.changed_by)
      return {
        id: asString(row.id),
        cycleId: row.ciclo_id == null ? null : asString(row.ciclo_id),
        lojaId: asString(row.loja_id),
        indicatorCode: asString(row.indicator_code),
        year: asNumber(row.year),
        field: asEditorField(row.field),
        previousValues: asNumberArray(row.previous_values),
        newValues: asNumberArray(row.new_values),
        note: row.note == null ? null : asString(row.note),
        changedBy,
        userName: changedBy ? users.get(changedBy) ?? changedBy : 'Usuário não identificado',
        createdAt: asString(row.created_at),
      }
    }),
    error: null,
  }
}

export async function addCycleIndicator(cycleId: string, metricKey: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('adicionar_indicador_ciclo_plano', {
    p_cycle_id: cycleId,
    p_metric_key: metricKey,
  })
  return { error: error?.message ?? null }
}

export async function toggleCycleIndicatorVisibility(
  cycleId: string,
  metricKey: string,
  visible: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('atualizar_visibilidade_indicador_ciclo', {
    p_cycle_id: cycleId,
    p_metric_key: metricKey,
    p_visible: visible,
  })
  return { error: error?.message ?? null }
}

export async function saveIndicatorPreviousYear(params: {
  lojaId: string
  indicatorCode: string
  year: number
  values: Array<number | null>
  note?: string | null
}): Promise<{ error: string | null; data: unknown }> {
  const { data, error } = await supabase.rpc('salvar_ano_anterior_indicador_planejamento', {
    p_store_id: params.lojaId,
    p_indicator_code: params.indicatorCode,
    p_year: params.year,
    p_values: params.values,
    p_note: params.note ?? null,
  })
  return { error: error?.message ?? null, data }
}

/** Salva os doze meses de um campo sem sobrescrever os outros campos. */
export async function saveIndicatorField(params: {
  lojaId: string
  indicatorCode: string
  year: number
  field: EditorField
  values: Array<number | null>
  note?: string | null
}): Promise<{ error: string | null; data: unknown }> {
  if (params.field === 'meta') {
    const { data, error } = await supabase.rpc('salvar_metas_indicador_planejamento', {
      p_store_id: params.lojaId,
      p_indicator_code: params.indicatorCode,
      p_year: params.year,
      p_values: params.values,
      p_note: params.note ?? null,
    })
    return { error: error?.message ?? null, data }
  }

  if (params.field === 'realizado') {
    const { data, error } = await supabase.rpc('salvar_realizado_indicador_planejamento', {
      p_store_id: params.lojaId,
      p_indicator_code: params.indicatorCode,
      p_year: params.year,
      p_values: params.values,
      p_source: 'manual',
      p_note: params.note ?? null,
    })
    return { error: error?.message ?? null, data }
  }

  return saveIndicatorPreviousYear({
    lojaId: params.lojaId,
    indicatorCode: params.indicatorCode,
    year: params.year,
    values: params.values,
    note: params.note,
  })
}

export async function restoreCycleHistory(params: { historyId: string; note?: string | null }): Promise<{ error: string | null; data: unknown }> {
  const { data, error } = await supabase.rpc('restaurar_metas_indicador_planejamento', {
    p_history_id: params.historyId,
    p_note: params.note ?? null,
  })
  return { error: error?.message ?? null, data }
}

export async function validateEditorCycle(cycleId: string): Promise<{ readiness: PlanReadiness | null; error: string | null }> {
  return validateCycleReadiness(cycleId)
}

export async function transitionEditorCycle(params: {
  cycle: PlanCycle
  to: PlanCycleStatus
}): Promise<{ cycle: PlanCycle | null; error: string | null }> {
  if (params.to === 'revisado') return reviseCycle({ cycle: params.cycle })
  return transitionCycle({ cycle: params.cycle, to: params.to })
}
