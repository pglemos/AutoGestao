import { supabase } from '@/lib/supabase'
import { buildStoreRiskReasons, calculateTraceableProgress } from '../lib/networkCockpitCalculations'
import type {
  NetworkCockpitStore,
  NetworkDateRange,
  PersonEvolution,
  TraceableMetric,
} from '../types'

type RpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>
}

type RawMetric = {
  value?: unknown
  universe?: unknown
  percentage?: unknown
  periodStart?: unknown
  periodEnd?: unknown
  source?: unknown
}

type RawPerson = {
  userId?: unknown
  name?: unknown
  role?: unknown
  status?: unknown
  metrics?: unknown
  reasons?: unknown
}

type RawStore = Record<string, unknown>

type RawPayload = {
  period?: { start?: unknown; end?: unknown }
  stores?: unknown
}

const numberValue = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const nullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const textValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim() ? value : fallback

const arrayValue = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : []

function mapTraceableMetric(
  value: unknown,
  fallback: { value: number; universe: number; source: string },
  range: NetworkDateRange,
): TraceableMetric {
  const raw = value && typeof value === 'object' ? value as RawMetric : {}
  const metricValue = nullableNumber(raw.value) ?? fallback.value
  const universe = nullableNumber(raw.universe) ?? fallback.universe
  const calculated = calculateTraceableProgress({ completed: metricValue, total: universe })
  return {
    value: metricValue,
    universe,
    percentage: nullableNumber(raw.percentage) ?? calculated.percentage,
    periodStart: textValue(raw.periodStart, range.start),
    periodEnd: textValue(raw.periodEnd, range.end),
    source: textValue(raw.source, fallback.source),
  }
}

function mapMetricRecord(value: unknown, range: NetworkDateRange): Record<string, TraceableMetric> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, metric]) => [
    key,
    mapTraceableMetric(metric, { value: 0, universe: 0, source: 'fonte não informada' }, range),
  ]))
}

function mapPerson(value: unknown, range: NetworkDateRange): PersonEvolution | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as RawPerson
  const role = raw.role === 'gerente' || raw.role === 'dono' ? raw.role : raw.role === 'vendedor' ? 'vendedor' : null
  if (!role) return null
  const status = raw.status === 'healthy' || raw.status === 'attention' || raw.status === 'critical' || raw.status === 'without_data'
    ? raw.status
    : 'without_data'
  return {
    userId: textValue(raw.userId),
    name: textValue(raw.name, 'Nome não informado'),
    role,
    status,
    metrics: mapMetricRecord(raw.metrics, range),
    reasons: arrayValue<unknown>(raw.reasons).filter((item): item is string => typeof item === 'string' && Boolean(item.trim())),
  }
}

function mapPeople(value: unknown, range: NetworkDateRange): PersonEvolution[] {
  return arrayValue<unknown>(value).map(item => mapPerson(item, range)).filter((item): item is PersonEvolution => Boolean(item))
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function mapStore(raw: RawStore, range: NetworkDateRange): NetworkCockpitStore {
  const actions = objectValue(raw.actions)
  const strategic = objectValue(raw.strategic)
  const consulting = objectValue(raw.consulting)
  const sources = Object.fromEntries(
    Object.entries(objectValue(raw.sources)).map(([key, value]) => [key, textValue(value, 'fonte não informada')]),
  )

  const sales = numberValue(raw.sales)
  const leads = numberValue(raw.leads)
  const agd = numberValue(raw.agd)
  const goal = numberValue(raw.goal)
  const projectedSales = numberValue(raw.projectedSales)
  const disciplinePct = numberValue(raw.disciplinePct)
  const overdueActions = numberValue(actions.overdue)
  const blockedActions = numberValue(actions.blocked)
  const pendingClosures = numberValue(raw.pendingClosures)
  const consultingEvidencePending = numberValue(consulting.evidencePending)
  const consultingParticipantsPending = numberValue(consulting.participantsPending)
  const projectionPct = goal > 0 ? (projectedSales / goal) * 100 : 0

  const strategicCompleted = numberValue(strategic.completed)
  const strategicTotal = numberValue(strategic.total)
  const consultingCompleted = numberValue(consulting.completed)
  const consultingTotal = numberValue(consulting.total)
  const deliveryCompleted = numberValue(consulting.deliveryCompleted)
  const deliveryTotal = numberValue(consulting.deliveryTotal)

  return {
    id: textValue(raw.id),
    name: textValue(raw.name, 'Loja sem nome'),
    leads,
    agd,
    vis: numberValue(raw.vis),
    sales,
    goal,
    gap: Math.max(goal - sales, 0),
    proj: projectedSales,
    ritmo: projectionPct,
    efficiency: leads > 0 ? (agd / leads) * 100 : 0,
    sellers: numberValue(raw.sellerCount),
    checkedInToday: numberValue(raw.checkedInToday),
    disciplinePct,
    pendingClosures,
    overdueActions,
    blockedActions,
    awaitingValidationActions: numberValue(actions.awaitingValidation),
    completedActions: numberValue(actions.completed),
    totalActions: numberValue(actions.total),
    strategicProgress: mapTraceableMetric(strategic, {
      value: strategicCompleted,
      universe: strategicTotal,
      source: sources.strategic || 'valores_indicadores_planejamento',
    }, range),
    consultingProgress: mapTraceableMetric(consulting, {
      value: consultingCompleted,
      universe: consultingTotal,
      source: sources.consulting || 'visitas_consultoria',
    }, range),
    consultingDeliveryProgress: mapTraceableMetric({
      value: deliveryCompleted,
      universe: deliveryTotal,
      periodStart: range.start,
      periodEnd: range.end,
      source: 'consultoria_itens_entrega',
    }, {
      value: deliveryCompleted,
      universe: deliveryTotal,
      source: 'consultoria_itens_entrega',
    }, range),
    consultingEvidencePending,
    consultingParticipantsPending,
    sellersEvolution: mapPeople(raw.sellersEvolution, range),
    managersEvolution: mapPeople(raw.managersEvolution, range),
    ownerEvolution: mapPerson(raw.ownerEvolution, range),
    riskReasons: buildStoreRiskReasons({
      disciplinePct,
      projectionPct,
      overdueActions,
      blockedActions,
      pendingClosures,
      consultingEvidencePending,
      consultingParticipantsPending,
    }),
    sources,
  }
}

export function mapNetworkCockpitPayload(data: unknown, requestedRange: NetworkDateRange): NetworkCockpitStore[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Resposta inválida do cockpit da rede.')
  }
  const payload = data as RawPayload
  const range = {
    start: textValue(payload.period?.start, requestedRange.start),
    end: textValue(payload.period?.end, requestedRange.end),
  }
  return arrayValue<unknown>(payload.stores)
    .filter((item): item is RawStore => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map(item => mapStore(item, range))
    .filter(item => Boolean(item.id))
}

export function createNetworkCockpitRepository(client: RpcClient) {
  return {
    async load(range: NetworkDateRange): Promise<NetworkCockpitStore[]> {
      const { data, error } = await client.rpc('get_internal_mx_network_cockpit', {
        p_start_date: range.start,
        p_end_date: range.end,
      })
      if (error) throw new Error(error.message || 'Não foi possível carregar o cockpit da rede.')
      return mapNetworkCockpitPayload(data, range)
    },
  }
}

export const networkCockpitRepository = createNetworkCockpitRepository(supabase as unknown as RpcClient)
