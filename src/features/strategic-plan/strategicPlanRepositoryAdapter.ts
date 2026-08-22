import { supabase } from '@/lib/supabase'
import { strategicPlanRepository } from '@/components/owner/strategic/strategicPlanLiveRepository'
import { MONTHS, consolidateValues, getConsolidatedLabel, SELECTED_MONTH_INDEX } from '@/components/owner/strategic/strategicUtils'
import {
  BASE44_STANDARD_INDICATORS,
  catalogAliasKeys,
  matchCanonicalIndicator,
} from '@/features/admin-mx/indicadores/canonicalBase44Catalog'
import { buildOfficialMonthlyGrid, readOfficialMonthValue } from '@/features/admin-mx/indicadores/metasRealizados'
import { planSalesOtherRepairs, repairOwnerStrategicPlanData } from './repairOwnerStrategicPlanData'
import {
  ownerStrategicPlanQueryKey,
  type OwnerStrategicPlanQueryScope,
} from './ownerStrategicPlanQueryKey'
import type {
  StrategicActionPayload,
  StrategicHistoryEntry,
  StrategicPlanLoadInput,
  StrategicPlanRepository,
  StrategicSeries,
} from './strategicPlan.types'

type UnknownRepository = Record<string, unknown>
type QueryResult<T> = { data: T | null; error: unknown }
type SupabaseLike = {
  from(table: string): any
  rpc(name: string, args: Record<string, unknown>): Promise<QueryResult<any>>
}

const REQUIRED_METHODS = [
  'load',
  'getOverviewData',
  'getIndicatorById',
  'getIndicatorSeries',
  'getActionItems',
  'getTargetHistory',
  'restoreHistoryVersion',
  'getPreferences',
  'setPreferences',
  'updateTargets',
  'createActionItem',
  'exportIndicatorData',
  'exportOverviewData',
] as const

function assertRepository(source: unknown): asserts source is StrategicPlanRepository {
  if (!source || typeof source !== 'object') throw new Error('Repositório estratégico inválido')
  const candidate = source as UnknownRepository
  for (const method of REQUIRED_METHODS) {
    if (typeof candidate[method] !== 'function') throw new Error(`Repositório estratégico sem método ${method}`)
  }
}

export function createStrategicPlanRepositoryAdapter(source: unknown): StrategicPlanRepository {
  assertRepository(source)
  let queue: Promise<void> = Promise.resolve()

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.catch(() => undefined).then(operation)
    queue = result.then(() => undefined, () => undefined)
    return result
  }

  return {
    load: input => enqueue(async () => { await source.load(input) }),
    getOverviewData: year => source.getOverviewData(year),
    getIndicatorById: id => source.getIndicatorById(id),
    getIndicatorSeries: (id, year) => source.getIndicatorSeries(id, year),
    getActionItems: id => source.getActionItems(id),
    getTargetHistory: (id, year) => source.getTargetHistory(id, year),
    restoreHistoryVersion: (id, actor) => enqueue(() => source.restoreHistoryVersion(id, actor)),
    getPreferences: () => source.getPreferences(),
    setPreferences: input => source.setPreferences(input),
    updateTargets: (id, year, values, actor, note) => enqueue(() => source.updateTargets(id, year, values, actor, note)),
    createActionItem: payload => enqueue(() => source.createActionItem(payload)),
    exportIndicatorData: (id, year) => source.exportIndicatorData(id, year),
    exportOverviewData: year => source.exportOverviewData(year),
  }
}

type PersistedValueRow = {
  indicator_code: string
  month: number | null
  meta: number | string | null
  realizado: number | string | null
  ano_anterior: number | string | null
}

type HistoryRow = {
  id: string
  indicator_code: string
  year: number
  previous_values: Array<number | null>
  new_values: Array<number | null>
  note: string | null
  changed_by: string | null
  created_at: string
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const OFFICIAL_AREA: Record<string, string> = {
  Comercial: 'Vendas',
  Marketing: 'Marketing',
  'Produto e Estoque': 'Estoque',
  Financeiro: 'Financeiro',
  Operações: 'Operacional',
  'Pessoas - RH': 'Operacional',
}

function seriesLookupKeys(series: StrategicSeries): string[] {
  const keys = [series.metricCode, series.id, series.code].filter(Boolean).map(String)
  const canon = matchCanonicalIndicator(String(series.metricCode || series.code || series.id || ''))
  if (canon) keys.push(...catalogAliasKeys(canon.code))
  return [...new Set(keys)]
}

function rowsForSeries(
  series: StrategicSeries,
  byIndicator: Map<string, PersistedValueRow[]>,
): PersistedValueRow[] {
  const seen = new Set<string>()
  const rows: PersistedValueRow[] = []
  for (const key of seriesLookupKeys(series)) {
    for (const row of byIndicator.get(key) ?? []) {
      const id = `${row.month}|${row.indicator_code}`
      if (seen.has(id)) continue
      seen.add(id)
      rows.push(row)
    }
  }
  return rows
}

function overlaySeries(base: StrategicSeries, rows: PersistedValueRow[]): StrategicSeries {
  const targetValues = [...base.targetValues]
  const currentValues = [...base.currentValues]
  const previousYearValues = [...base.previousYearValues]
  for (const row of rows) {
    if (!row.month || row.month < 1 || row.month > 12) continue
    const index = row.month - 1
    if (row.meta !== null && row.meta !== undefined) targetValues[index] = numberOrNull(row.meta)
    if (row.realizado !== null && row.realizado !== undefined) currentValues[index] = numberOrNull(row.realizado)
    if (row.ano_anterior !== null && row.ano_anterior !== undefined) previousYearValues[index] = numberOrNull(row.ano_anterior)
  }
  return { ...base, targetValues, currentValues, previousYearValues }
}

function officialSeriesTemplate(code: string): StrategicSeries | null {
  const canon = matchCanonicalIndicator(code) ?? BASE44_STANDARD_INDICATORS.find(item => item.code === code)
  if (!canon) return null
  const empty = Array.from({ length: 12 }, () => null)
  return {
    id: canon.code,
    code: canon.code,
    metricCode: canon.code,
    name: canon.name,
    area: OFFICIAL_AREA[canon.area] || canon.area,
    direction: canon.target_calculation_mode === 'CALCULATED_LOCKED' ? 'increase' : 'increase',
    formula_expression: canon.formula_expression,
    displayFormat: 'integer',
    aggregationMode: 'sum',
    decimalPlaces: 0,
    unitLabel: 'unidades',
    targetValues: [...empty],
    currentValues: [...empty],
    previousYearValues: [...empty],
  }
}

function mergeOfficialPlanningSeries(
  base: StrategicSeries[],
  byIndicator: Map<string, PersistedValueRow[]>,
): StrategicSeries[] {
  const merged = base.map(item => overlaySeries(item, rowsForSeries(item, byIndicator)))
  const hasOfficial = [...byIndicator.keys()].some(key => matchCanonicalIndicator(key))
  if (!hasOfficial) return hydrateOfficialComputed(merged)

  const present = new Set(merged.flatMap(item => seriesLookupKeys(item).map(key => key.toLowerCase())))
  for (const canon of BASE44_STANDARD_INDICATORS) {
    if (present.has(canon.code.toLowerCase())) continue
    const template = officialSeriesTemplate(canon.code)
    if (!template) continue
    merged.push(overlaySeries(template, rowsForSeries(template, byIndicator)))
    present.add(canon.code.toLowerCase())
  }
  return hydrateOfficialComputed(merged)
}

function hydrateOfficialComputed(seriesList: StrategicSeries[]): StrategicSeries[] {
  if (seriesList.length === 0) return seriesList
  const indicators = seriesList.map(item => ({
    code: String(item.metricCode || item.code),
    formula_expression: typeof item.formula_expression === 'string'
      ? item.formula_expression
      : matchCanonicalIndicator(String(item.metricCode || item.code))?.formula_expression ?? null,
  }))
  const values = seriesList.flatMap(item => {
    const code = String(item.metricCode || item.code)
    return item.targetValues.map((meta, index) => ({
      loja_id: 'owner',
      indicator_code: code,
      year: 0,
      month: index + 1,
      meta,
      realizado: item.currentValues[index] ?? null,
      ano_anterior: item.previousYearValues[index] ?? null,
    }))
  })
  const grid = buildOfficialMonthlyGrid(values, indicators, 'owner')
  return seriesList.map(item => {
    const code = String(item.metricCode || item.code)
    return {
      ...item,
      targetValues: item.targetValues.map((_, index) => readOfficialMonthValue(grid, indicators, code, index + 1, 'meta')),
      currentValues: item.currentValues.map((_, index) => readOfficialMonthValue(grid, indicators, code, index + 1, 'realizado')),
      previousYearValues: item.previousYearValues.map((_, index) => readOfficialMonthValue(grid, indicators, code, index + 1, 'ano_anterior')),
    }
  })
}

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

export function createStrategicPlanLiveSource({
  client = supabase as unknown as SupabaseLike,
  legacyRepository = strategicPlanRepository,
}: {
  client?: SupabaseLike
  legacyRepository?: any
} = {}): StrategicPlanRepository {
  let cache: {
    storeId: string | null
    year: number
    input: StrategicPlanLoadInput
    queryKey: readonly unknown[]
    series: StrategicSeries[]
    histories: HistoryRow[]
    actions: Array<Record<string, unknown>>
  } = {
    storeId: null,
    year: new Date().getFullYear(),
    input: { storeId: null, year: new Date().getFullYear() },
    queryKey: [],
    series: [],
    histories: [],
    actions: [],
  }
  let preferences = legacyRepository.getPreferences?.() ?? {}

  const scopeOf = (input: StrategicPlanLoadInput): OwnerStrategicPlanQueryScope => ({
    clientAccountId: input.clientId ?? null,
    strategicPlanVersionId: input.versionId ?? null,
    referenceYear: input.year,
    referenceMonth: input.month ?? null,
    selectedValueView: input.view ?? null,
    scopeType: input.scopeType ?? (input.storeId ? 'STORE' : 'CONSOLIDATED'),
    storeId: input.storeId,
  })

  const reload = async (input: StrategicPlanLoadInput) => {
    const storeId = input.storeId
    const year = input.year
    const queryKey = ownerStrategicPlanQueryKey(scopeOf(input))
    if (!storeId) {
      cache = { storeId: null, year, input, queryKey, series: [], histories: [], actions: [] }
      return
    }

    await legacyRepository.load({ storeId, year })
    const [valuesResult, historyResult] = await Promise.all([
      client
        .from('valores_indicadores_planejamento_vigentes')
        .select('indicator_code,month,meta,realizado,ano_anterior')
        .eq('loja_id', storeId)
        .eq('year', year),
      client
        .from('historico_valores_indicadores_planejamento')
        .select('id,indicator_code,year,previous_values,new_values,note,changed_by,created_at')
        .eq('loja_id', storeId)
        .eq('year', year)
        .order('created_at', { ascending: false }),
    ]) as [QueryResult<PersistedValueRow[]>, QueryResult<HistoryRow[]>]

    if (valuesResult.error) throw valuesResult.error
    if (historyResult.error) throw historyResult.error

    const persisted = valuesResult.data ?? []
    const byIndicator = new Map<string, PersistedValueRow[]>()
    for (const row of persisted) {
      const list = byIndicator.get(row.indicator_code) ?? []
      list.push(row)
      byIndicator.set(row.indicator_code, list)
    }

    const planningRows = persisted.map(row => ({
      loja_id: storeId,
      indicator_code: row.indicator_code,
      year,
      month: row.month,
      meta: numberOrNull(row.meta),
      realizado: numberOrNull(row.realizado),
      ano_anterior: numberOrNull(row.ano_anterior),
    }))
    const planned = planSalesOtherRepairs(planningRows, [storeId], year)
    if (planned.write.length) {
      await repairOwnerStrategicPlanData({
        storeId,
        clientAccountId: input.clientId,
        strategicPlanVersionId: input.versionId,
        referenceYear: year,
        persist: true,
        values: planningRows,
        unitIds: [storeId],
      })
    }

    const base = (legacyRepository.getOverviewData(year) ?? []) as StrategicSeries[]
    cache = {
      storeId,
      year,
      input,
      queryKey,
      series: mergeOfficialPlanningSeries(base, byIndicator),
      histories: historyResult.data ?? [],
      actions: legacyRepository.getActionItems() ?? [],
    }
  }

  const findSeries = (id: string): StrategicSeries | null => (
    cache.series.find(item => item.id === id || item.code === id || item.metricCode === id) ?? null
  )
  const canonicalIndicatorCode = (id: string): string => {
    const series = findSeries(id)
    return String(series?.metricCode || series?.code || id)
  }
  const indicatorAliases = (id: string): string[] => {
    const series = findSeries(id)
    return [...new Set([id, series?.id, series?.code, series?.metricCode].filter(Boolean).map(String))]
  }

  return {
    async load(input) { await reload(input) },
    getOverviewData() { return cache.series },
    getIndicatorById(id) { return findSeries(id) },
    getIndicatorSeries(id) { return findSeries(id) },
    getActionItems(id) {
      if (!id) return cache.actions
      const aliases = indicatorAliases(id)
      return cache.actions.filter(action => aliases.includes(String(action.indicator || '')) || aliases.includes(String(action.indicatorCode || '')))
    },
    getTargetHistory(id, year): StrategicHistoryEntry[] {
      return cache.histories
        .filter(row => row.indicator_code === canonicalIndicatorCode(id) && row.year === year)
        .map(row => ({
          id: row.id,
          previousValues: row.previous_values,
          newValues: row.new_values,
          timestamp: row.created_at,
          user: row.changed_by || 'Sistema',
          note: row.note,
        }))
    },
    async restoreHistoryVersion(id, actor) {
      const result = await client.rpc('restaurar_metas_indicador_planejamento', {
        p_history_id: id,
        p_note: actor && typeof actor === 'object' && 'name' in actor
          ? `Restaurado por ${String((actor as { name?: unknown }).name || 'usuário')}`
          : null,
      })
      if (result.error) throw result.error
      await reload(cache.input)
    },
    getPreferences() { return preferences },
    setPreferences(input) {
      preferences = { ...preferences, ...input }
      legacyRepository.setPreferences?.(preferences)
    },
    async updateTargets(id, year, values, _actor, note) {
      if (!cache.storeId) throw new Error('Nenhuma unidade selecionada para atualizar a meta.')
      const result = await client.rpc('salvar_metas_indicador_planejamento', {
        p_store_id: cache.storeId,
        p_indicator_code: canonicalIndicatorCode(id),
        p_year: year,
        p_values: values,
        p_note: note || null,
      })
      if (result.error) throw result.error
      await reload({ ...cache.input, year })
    },
    async createActionItem(payload: StrategicActionPayload) {
      if (!cache.storeId) throw new Error('Nenhuma unidade selecionada para criar a ação.')
      const aliases = indicatorAliases(payload.indicatorId)
      const canonicalCode = canonicalIndicatorCode(payload.indicatorId)
      const existing = cache.actions.find(action => (
        (aliases.includes(String(action.indicator || '')) || aliases.includes(String(action.indicatorCode || '')))
        && action.status !== 'cancelled'
      ))
      if (existing) return existing

      const result = await client.rpc('criar_plano_acao_planejamento_unico', {
        p_store_id: cache.storeId,
        p_indicator_code: canonicalCode,
        p_year: cache.year,
        p_title: payload.title || payload.action,
        p_problem: payload.problem || `Desvio identificado em ${findSeries(payload.indicatorId)?.name || payload.indicatorId}`, 
        p_action: payload.action,
        p_area: payload.area || 'general',
        p_responsible_name: payload.responsible || null,
        p_deadline: payload.deadline || null,
        p_priority: payload.priority || 'medium',
        p_note: payload.note || null,
      })
      if (result.error) throw result.error
      await reload(cache.input)
      return cache.actions.find(action => aliases.includes(String(action.indicator || '')) || aliases.includes(String(action.indicatorCode || '')))
        ?? (result.data as Record<string, unknown> | null)
    },
    exportIndicatorData(id) {
      const series = cache.series.find(item => item.id === id || item.code === id)
      if (!series) return ''
      const header = ['Série', ...MONTHS, getConsolidatedLabel(series.aggregationMode, SELECTED_MONTH_INDEX)]
      const rows = [
        ['Meta', ...series.targetValues, consolidateValues(series.targetValues, series.aggregationMode, SELECTED_MONTH_INDEX)],
        ['Resultado Atual', ...series.currentValues, consolidateValues(series.currentValues, series.aggregationMode, SELECTED_MONTH_INDEX)],
        ['Ano Anterior', ...series.previousYearValues, consolidateValues(series.previousYearValues, series.aggregationMode, SELECTED_MONTH_INDEX)],
      ]
      return [header, ...rows].map(row => row.map(csvCell).join(';')).join('\n')
    },
    exportOverviewData() {
      return [
        ['Código', 'Indicador', 'Área', ...MONTHS],
        ...cache.series.map(series => [series.code, series.name, series.area, ...series.targetValues]),
      ].map(row => row.map(csvCell).join(';')).join('\n')
    },
  }
}

export const strategicPlanDataSource = createStrategicPlanRepositoryAdapter(createStrategicPlanLiveSource())
