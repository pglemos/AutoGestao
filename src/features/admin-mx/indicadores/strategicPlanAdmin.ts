import { supabase } from '@/lib/supabase'
import { ensureCycle } from '@/features/strategic-plan/planCycleRepository'
import { fetchClientProductPackage } from '@/features/strategic-plan/clientPlanningRepository'
import { fillOfficialDemoForCycle } from './strategicPlanEditorRepository'

export type StrategicPlanAdminRow = {
  cycleId: string
  clientId: string
  clientName: string
  clientStatus: string | null
  primaryStoreId: string | null
  year: number
  versionNumber: number
  status: string
  indicatorCount: number
  unitCount: number
  responsibleName: string
  packageName: string | null
  publishedAt: string | null
  updatedAt: string
}

export type StrategicPlanClientOption = {
  id: string
  name: string
  status: string | null
  primaryStoreId: string | null
}

export type PlanStatusFilter = 'todos' | 'rascunho' | 'em_validacao' | 'publicado' | 'revisado'

export type StrategicPlanAdminFilters = {
  search: string
  year: string
  status: PlanStatusFilter
}

export type HistoryCategory = 'todas' | 'catalogo' | 'indicador' | 'parametro' | 'plano' | 'meta'

export type IndicatorHistoryRow = {
  id: string
  createdAt: string
  userName: string
  action: string
  resource: string
  after: string
  before: string
  category: Exclude<HistoryCategory, 'todas'>
}

export type HistoryFilters = {
  search: string
  category: HistoryCategory
}

type Row = Record<string, unknown>

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : value == null ? fallback : String(value)
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function stringifyValue(value: unknown) {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function uniqueStrings(values: unknown[]) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))]
}

function classifyHistory(resource: string, action: string, source: 'mx' | 'audit' | 'values'): Exclude<HistoryCategory, 'todas'> {
  const value = `${resource} ${action}`.toLocaleLowerCase('pt-BR')
  if (source === 'values' || /meta|target|valor|monthly|realizado|ano_anterior/.test(value)) return 'meta'
  if (/param/.test(value)) return 'parametro'
  if (/plano|cycle|ciclo|strategic/.test(value)) return 'plano'
  if (/indicador|indicator|metric/.test(value)) return 'indicador'
  return 'catalogo'
}

export function filterStrategicPlanRows(rows: StrategicPlanAdminRow[], filters: StrategicPlanAdminFilters) {
  const term = filters.search.trim().toLocaleLowerCase('pt-BR')
  return rows.filter(row => {
    if (filters.year !== 'todos' && String(row.year) !== filters.year) return false
    if (filters.status !== 'todos' && row.status !== filters.status) return false
    if (!term) return true
    return [row.clientName, row.responsibleName, row.packageName, row.status, String(row.year)]
      .some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(term))
  })
}

export function filterHistoryRows(rows: IndicatorHistoryRow[], filters: HistoryFilters) {
  const term = filters.search.trim().toLocaleLowerCase('pt-BR')
  return rows.filter(row => {
    if (filters.category !== 'todas' && row.category !== filters.category) return false
    if (!term) return true
    return [row.userName, row.action, row.resource, row.after, row.before]
      .some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(term))
  })
}

export async function fetchStrategicPlanClients(): Promise<{ rows: StrategicPlanClientOption[]; error: string | null }> {
  const { data, error } = await supabase
    .from('clientes_consultoria')
    .select('id, name, legal_name, status, primary_store_id')
    .or('status.is.null,status.neq.arquivado')
    .order('name', { ascending: true })

  if (error) return { rows: [], error: error.message }
  return {
    rows: ((data ?? []) as Row[]).map(row => ({
      id: asString(row.id),
      name: asString(row.name || row.legal_name, asString(row.id)),
      status: row.status == null ? null : asString(row.status),
      primaryStoreId: row.primary_store_id == null ? null : asString(row.primary_store_id),
    })),
    error: null,
  }
}

export async function fetchStrategicPlanAdminRows(): Promise<{ rows: StrategicPlanAdminRow[]; error: string | null }> {
  const { data: cycles, error: cyclesError } = await supabase
    .from('ciclos_plano_estrategico')
    .select('id, client_id, year, status, version_number, package_version_id, published_at, updated_at')
    .order('year', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(500)

  if (cyclesError) return { rows: [], error: cyclesError.message }
  const cycleRows = (cycles ?? []) as Row[]
  const clientIds = uniqueStrings(cycleRows.map(row => row.client_id))
  const packageVersionIds = uniqueStrings(cycleRows.map(row => row.package_version_id))
  const cyclesWithoutPackageIds = cycleRows
    .filter(row => !asString(row.package_version_id))
    .map(row => asString(row.id))
    .filter(Boolean)
  if (cycleRows.length === 0) return { rows: [], error: null }

  const [clientsResult, indicatorCountsResult, unitsResult, packageResult] = await Promise.all([
    supabase.from('clientes_consultoria').select('id, name, legal_name, status, primary_store_id, implementation_owner_id').in('id', clientIds),
    cyclesWithoutPackageIds.length
      ? supabase.rpc('get_strategic_plan_indicator_counts', { p_cycle_ids: cyclesWithoutPackageIds })
      : Promise.resolve({ data: [], error: null }),
    supabase.from('unidades_cliente_consultoria').select('client_id, id').in('client_id', clientIds),
    packageVersionIds.length
      ? supabase.from('pacotes_indicadores_versoes').select('id, nome, total_indicadores').in('id', packageVersionIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  // Responsible IDs are on clients; load them after the first batch so this
  // screen stays compatible with older generated schema snapshots.
  const clientRows = (clientsResult.data ?? []) as Row[]
  const responsibleIds = uniqueStrings(clientRows.map(row => row.implementation_owner_id))
  const responsibleResult = responsibleIds.length
    ? await supabase.from('usuarios').select('id, name').in('id', responsibleIds)
    : { data: [], error: null }

  const firstError = [clientsResult.error, indicatorCountsResult.error, unitsResult.error, packageResult.error, responsibleResult.error]
    .find(Boolean)
  if (firstError) return { rows: [], error: firstError.message }

  const clients = new Map(clientRows.map(row => [asString(row.id), row]))
  const users = new Map(((responsibleResult.data ?? []) as Row[]).map(row => [asString(row.id), asString(row.name, 'Não atribuído')]))
  const packages = new Map(((packageResult.data ?? []) as Row[]).map(row => [asString(row.id), row]))
  const indicatorCountsByCycle = new Map(
    ((indicatorCountsResult.data ?? []) as Row[]).map(row => [asString(row.cycle_id), asNumber(row.indicator_count)]),
  )
  const unitsByClient = new Map<string, Set<string>>()

  for (const unit of (unitsResult.data ?? []) as Row[]) {
    const clientId = asString(unit.client_id)
    const unitId = asString(unit.id)
    if (clientId && unitId) {
      const set = unitsByClient.get(clientId) ?? new Set<string>()
      set.add(unitId)
      unitsByClient.set(clientId, set)
    }
  }

  return {
    rows: cycleRows.map(cycle => {
      const client = clients.get(asString(cycle.client_id))
      const packageVersion = packages.get(asString(cycle.package_version_id))
      const indicatorCount = packageVersion
        ? asNumber(packageVersion.total_indicadores)
        : indicatorCountsByCycle.get(asString(cycle.id)) ?? 0
      return {
        cycleId: asString(cycle.id),
        clientId: asString(cycle.client_id),
        clientName: asString(client?.name || client?.legal_name, asString(cycle.client_id)),
        clientStatus: client?.status == null ? null : asString(client.status),
        primaryStoreId: client?.primary_store_id == null ? null : asString(client.primary_store_id),
        year: asNumber(cycle.year),
        versionNumber: asNumber(cycle.version_number, 1),
        status: asString(cycle.status, 'rascunho'),
        indicatorCount,
        unitCount: unitsByClient.get(asString(cycle.client_id))?.size ?? 0,
        responsibleName: users.get(asString(client?.implementation_owner_id)) ?? 'Não atribuído',
        packageName: packageVersion?.nome == null ? null : asString(packageVersion.nome),
        publishedAt: cycle.published_at == null ? null : asString(cycle.published_at),
        updatedAt: asString(cycle.updated_at),
      }
    }),
    error: null,
  }
}

export async function seedStrategicPlanDemo(year = new Date().getFullYear()) {
  const clients = await fetchStrategicPlanClients()
  if (clients.error) return { error: clients.error, cycle: null, created: false, packageName: null, packageWarning: null }
  const demo = clients.rows.find(row => /demonstra|demo/i.test(row.name)) ?? clients.rows[0]
  if (!demo) return { error: 'Nenhum cliente disponível para o demo.', cycle: null, created: false, packageName: null, packageWarning: null }
  const created = await ensureAdminStrategicPlan({ clientId: demo.id, year })
  if (created.cycle) {
    const filled = await fillOfficialDemoForCycle(created.cycle.id)
    if (filled.error) return { ...created, error: filled.error }
  }
  return created
}

export async function ensureAdminStrategicPlan(input: { clientId: string; year: number }) {
  const packageResult = await fetchClientProductPackage(input.clientId)
  const result = await ensureCycle({
    clientId: input.clientId,
    year: input.year,
    packageVersionId: packageResult.ok ? packageResult.resolution.packageVersion.id : null,
  })
  return {
    ...result,
    packageName: packageResult.ok ? packageResult.resolution.packageVersion.nome : null,
    packageWarning: packageResult.ok ? null : packageResult.message,
  }
}

export async function fetchIndicatorHistory(options: { limit?: number; metricKey?: string } = {}): Promise<{ rows: IndicatorHistoryRow[]; error: string | null }> {
  const limit = options.limit ?? 500
  let valuesQuery = supabase
    .from('historico_valores_indicadores_planejamento')
    .select('id, created_at, changed_by, field, indicator_code, new_values, previous_values, note, ciclo_id')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (options.metricKey) valuesQuery = valuesQuery.eq('indicator_code', options.metricKey)

  const [mxResult, auditResult, valuesResult] = await Promise.all([
    supabase.from('logs_auditoria_consultoria_mx').select('id, created_at, user_name, action, resource, value_after, value_before').order('created_at', { ascending: false }).limit(limit),
    supabase.from('logs_auditoria').select('id, created_at, user_id, action, entity, entity_id, details_json').order('created_at', { ascending: false }).limit(limit),
    valuesQuery,
  ])

  const userIds = uniqueStrings([
    ...((auditResult.data ?? []) as Row[]).map(row => row.user_id),
    ...((valuesResult.data ?? []) as Row[]).map(row => row.changed_by),
  ])
  const usersResult = userIds.length ? await supabase.from('usuarios').select('id, name').in('id', userIds) : { data: [], error: null }

  const sourceErrors = [mxResult.error, auditResult.error, valuesResult.error].filter(Boolean)
  if (sourceErrors.length === 3) return { rows: [], error: sourceErrors[0]?.message ?? 'Não foi possível carregar o histórico.' }

  const userNames = new Map(((usersResult.data ?? []) as Row[]).map(row => [asString(row.id), asString(row.name, 'Usuário não identificado')]))
  const rows: IndicatorHistoryRow[] = []

  for (const row of (mxResult.data ?? []) as Row[]) {
    const resource = asString(row.resource, 'Catálogo MX')
    const action = asString(row.action, 'Alteração')
    rows.push({
      id: `mx-${asString(row.id)}`,
      createdAt: asString(row.created_at),
      userName: asString(row.user_name, 'Usuário não identificado'),
      action,
      resource,
      after: stringifyValue(row.value_after),
      before: stringifyValue(row.value_before),
      category: classifyHistory(resource, action, 'mx'),
    })
  }
  for (const row of (auditResult.data ?? []) as Row[]) {
    const resource = asString(row.entity, 'Auditoria MX')
    const action = asString(row.action, 'Alteração')
    rows.push({
      id: `audit-${asString(row.id)}`,
      createdAt: asString(row.created_at),
      userName: userNames.get(asString(row.user_id)) ?? 'Usuário não identificado',
      action,
      resource: row.entity_id ? `${resource} · ${asString(row.entity_id)}` : resource,
      after: stringifyValue(row.details_json),
      before: '—',
      category: classifyHistory(resource, action, 'audit'),
    })
  }
  for (const row of (valuesResult.data ?? []) as Row[]) {
    const resource = asString(row.indicator_code, 'Indicador')
    const action = asString(row.field, 'Atualização de valor')
    rows.push({
      id: `value-${asString(row.id)}`,
      createdAt: asString(row.created_at),
      userName: userNames.get(asString(row.changed_by)) ?? 'Usuário não identificado',
      action,
      resource,
      after: stringifyValue(row.new_values),
      before: stringifyValue(row.previous_values),
      category: classifyHistory(resource, action, 'values'),
    })
  }

  return {
    rows: rows.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, limit),
    error: sourceErrors.length ? 'Histórico carregado parcialmente; algumas fontes não responderam.' : null,
  }
}
