import { supabase } from '@/lib/supabase'

export type ConsultingOverviewStatus = 'nao_iniciado' | 'agendado' | 'concluido' | 'reagendado' | 'cancelado'
export type ConsultingOverviewModality = 'online' | 'presencial' | 'a_definir'
export type ConsultingOverviewPeriod = 'todos' | 'hoje' | 'proximos_7_dias' | 'atrasados'
export type ConsultingOverviewSort = 'prioridade' | 'data_proxima' | 'recentes' | 'cliente'
export type ConsultingOverviewOperationalState =
  | 'revisar_status'
  | 'atrasado'
  | 'hoje'
  | 'agenda_ativa'
  | 'sem_agenda'
  | 'concluido'
  | 'cancelado'

export type ConsultingOverviewGroupKey =
  | 'revisar_status'
  | 'atrasados'
  | 'hoje'
  | 'proximos_7_dias'
  | 'agenda_futura'
  | 'sem_agenda'
  | 'concluidos'
  | 'cancelados'

export type ConsultingOverviewRow = {
  id: string
  clientId: string
  clientName: string
  clientSlug: string
  primaryStoreId: string | null
  visitNumber: number
  title: string
  objective: string
  consultantName: string
  consultantId: string | null
  modality: ConsultingOverviewModality
  status: ConsultingOverviewStatus
  scheduledAt: string | null
  effectiveVisitDate: string | null
  productName: string
  deliverables: number
  deliverablesDone: number
}

export type ConsultingOverviewGroup = {
  key: ConsultingOverviewGroupKey
  label: string
  description: string
  rows: ConsultingOverviewRow[]
}

export type ConsultingOverviewFilters = {
  search: string
  status: 'todos' | ConsultingOverviewStatus
  modality: 'todas' | ConsultingOverviewModality
  period?: ConsultingOverviewPeriod
  sort?: ConsultingOverviewSort
  referenceDate?: Date
}

export const CONSULTING_PERIOD_LABELS: Record<ConsultingOverviewPeriod, string> = {
  todos: 'Todos os períodos',
  hoje: 'Hoje',
  proximos_7_dias: 'Próximos 7 dias',
  atrasados: 'Atrasados',
}

export const CONSULTING_SORT_LABELS: Record<ConsultingOverviewSort, string> = {
  prioridade: 'Prioridade',
  data_proxima: 'Data mais próxima',
  recentes: 'Mais recentes',
  cliente: 'Cliente A–Z',
}

function normalizeLookupValue(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
}

function startOfDay(date: Date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function endOfDay(date: Date) {
  const result = startOfDay(date)
  result.setHours(23, 59, 59, 999)
  return result
}

export function parseConsultingOverviewDate(value: string | null): Date | null {
  if (!value) return null
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getConsultingOverviewRowDate(row: ConsultingOverviewRow): Date | null {
  return parseConsultingOverviewDate(row.scheduledAt) ?? parseConsultingOverviewDate(row.effectiveVisitDate)
}

export function hasEffectiveDateConflict(row: ConsultingOverviewRow): boolean {
  return Boolean(row.effectiveVisitDate && ['agendado', 'reagendado', 'nao_iniciado'].includes(row.status))
}

export function isConsultingOverviewRowOverdue(row: ConsultingOverviewRow, referenceDate = new Date()): boolean {
  if (hasEffectiveDateConflict(row) || !['nao_iniciado', 'agendado', 'reagendado'].includes(row.status)) return false
  const date = getConsultingOverviewRowDate(row)
  return Boolean(date && date.getTime() < referenceDate.getTime())
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function isSameLocalDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

function isOpenConsultingStatus(status: ConsultingOverviewStatus) {
  return ['nao_iniciado', 'agendado', 'reagendado'].includes(status)
}

export function getConsultingOverviewRowState(row: ConsultingOverviewRow, referenceDate = new Date()): ConsultingOverviewOperationalState {
  if (hasEffectiveDateConflict(row)) return 'revisar_status'
  if (row.status === 'concluido') return 'concluido'
  if (row.status === 'cancelado') return 'cancelado'
  if (isConsultingOverviewRowOverdue(row, referenceDate)) return 'atrasado'
  const date = getConsultingOverviewRowDate(row)
  if (!date) return 'sem_agenda'
  if (isSameLocalDay(date, referenceDate)) return 'hoje'
  return 'agenda_ativa'
}

export function normalizeConsultingStatus(value: string | null | undefined): ConsultingOverviewStatus {
  const normalized = normalizeLookupValue(value)
  if (['concluido', 'concluida', 'completed', 'finalizado', 'finalizada'].includes(normalized)) return 'concluido'
  if (['reagendado', 'reagendada', 'rescheduled'].includes(normalized)) return 'reagendado'
  // Sem este ramo, 'cancelada' caía no default e virava 'Não iniciado' — o
  // oposto do que é. Em produção há 4 visitas canceladas sendo exibidas como
  // trabalho pendente.
  if (['cancelado', 'cancelada', 'canceled', 'cancelled'].includes(normalized)) return 'cancelado'
  if (['agendado', 'agendada', 'scheduled', 'em_andamento', 'in_progress'].includes(normalized)) return 'agendado'
  return 'nao_iniciado'
}

export function normalizeConsultingModality(value: string | null | undefined): ConsultingOverviewModality {
  const normalized = normalizeLookupValue(value)
  if (normalized.includes('pres')) return 'presencial'
  if (normalized.includes('online') || normalized.includes('remot')) return 'online'
  return 'a_definir'
}

export const CONSULTING_STATUS_LABELS: Record<ConsultingOverviewStatus, string> = {
  nao_iniciado: 'Não iniciado',
  agendado: 'Agendado',
  concluido: 'Concluído',
  reagendado: 'Reagendado',
  cancelado: 'Cancelado',
}

export const CONSULTING_MODALITY_LABELS: Record<ConsultingOverviewModality, string> = {
  online: 'Online',
  presencial: 'Presencial',
  a_definir: 'A definir',
}

export const CONSULTING_PERIOD_FILTER_LABELS: Record<ConsultingOverviewPeriod, string> = {
  todos: 'Todos',
  hoje: 'Hoje',
  proximos_7_dias: 'Próximos 7 dias',
  atrasados: 'Atrasados',
}

export const CONSULTING_STATUS_FILTER_LABELS: Record<'todos' | ConsultingOverviewStatus, string> = {
  todos: 'Todos',
  ...CONSULTING_STATUS_LABELS,
}

export const CONSULTING_MODALITY_FILTER_LABELS: Record<'todas' | ConsultingOverviewModality, string> = {
  todas: 'Todas',
  ...CONSULTING_MODALITY_LABELS,
}

export function filterConsultingOverviewRows(rows: ConsultingOverviewRow[], filters: ConsultingOverviewFilters): ConsultingOverviewRow[] {
  const term = normalizeLookupValue(filters.search)
  const today = filters.referenceDate ?? new Date()
  const period = filters.period ?? 'todos'
  const filtered = rows.filter(row => {
    if (filters.status !== 'todos' && row.status !== filters.status) return false
    if (filters.modality !== 'todas' && row.modality !== filters.modality) return false
    const rowDate = getConsultingOverviewRowDate(row)
    const rowState = getConsultingOverviewRowState(row, today)
    if (period === 'atrasados' && !['revisar_status', 'atrasado'].includes(rowState)) return false
    if (period === 'hoje') {
      if (!isOpenConsultingStatus(row.status) || !rowDate || rowDate < startOfDay(today) || rowDate > endOfDay(today)) return false
    }
    if (period === 'proximos_7_dias') {
      const end = endOfDay(addDays(today, 7))
      if (!isOpenConsultingStatus(row.status) || !rowDate || rowDate <= endOfDay(today) || rowDate > end) return false
    }
    if (!term) return true
    return [row.clientName, row.title, row.objective, row.consultantName, row.productName, String(row.visitNumber)]
      .some(value => normalizeLookupValue(value).includes(term))
  })
  return sortConsultingOverviewRows(filtered, filters.sort ?? 'prioridade', today)
}

function getConsultingOverviewGroupKey(row: ConsultingOverviewRow, referenceDate = new Date()): ConsultingOverviewGroupKey {
  const state = getConsultingOverviewRowState(row, referenceDate)
  if (state === 'revisar_status') return 'revisar_status'
  if (state === 'atrasado') return 'atrasados'
  if (state === 'hoje') return 'hoje'
  if (state === 'concluido') return 'concluidos'
  if (state === 'cancelado') return 'cancelados'
  if (state === 'sem_agenda') return 'sem_agenda'

  const date = getConsultingOverviewRowDate(row)
  if (date && date <= endOfDay(addDays(referenceDate, 7))) return 'proximos_7_dias'
  return 'agenda_futura'
}

const CONSULTING_GROUP_DEFINITIONS: Record<ConsultingOverviewGroupKey, Omit<ConsultingOverviewGroup, 'rows'>> = {
  revisar_status: {
    key: 'revisar_status',
    label: 'Revisar status',
    description: 'Há uma data efetiva, mas o status persistido ainda está pendente.',
  },
  atrasados: {
    key: 'atrasados',
    label: 'Atrasados',
    description: 'Encontros pendentes cuja agenda prevista já passou.',
  },
  hoje: {
    key: 'hoje',
    label: 'Hoje',
    description: 'Encontros previstos para o dia atual.',
  },
  proximos_7_dias: {
    key: 'proximos_7_dias',
    label: 'Próximos 7 dias',
    description: 'Agenda ativa para a próxima semana.',
  },
  agenda_futura: {
    key: 'agenda_futura',
    label: 'Agenda futura',
    description: 'Encontros além dos próximos 7 dias.',
  },
  sem_agenda: {
    key: 'sem_agenda',
    label: 'Sem agenda',
    description: 'Registros pendentes sem data prevista.',
  },
  concluidos: {
    key: 'concluidos',
    label: 'Concluídos',
    description: 'Encontros com execução encerrada.',
  },
  cancelados: {
    key: 'cancelados',
    label: 'Cancelados',
    description: 'Encontros retirados da agenda operacional.',
  },
}

const CONSULTING_GROUP_ORDER: ConsultingOverviewGroupKey[] = [
  'revisar_status',
  'atrasados',
  'hoje',
  'proximos_7_dias',
  'agenda_futura',
  'sem_agenda',
  'concluidos',
  'cancelados',
]

export function groupConsultingOverviewRows(rows: ConsultingOverviewRow[], referenceDate = new Date()): ConsultingOverviewGroup[] {
  const grouped = new Map<ConsultingOverviewGroupKey, ConsultingOverviewRow[]>()
  for (const row of rows) {
    const key = getConsultingOverviewGroupKey(row, referenceDate)
    const groupRows = grouped.get(key) ?? []
    groupRows.push(row)
    grouped.set(key, groupRows)
  }

  return CONSULTING_GROUP_ORDER
    .filter(key => grouped.has(key))
    .map(key => ({ ...CONSULTING_GROUP_DEFINITIONS[key], rows: grouped.get(key) ?? [] }))
}

function priorityRank(row: ConsultingOverviewRow, referenceDate: Date) {
  return CONSULTING_GROUP_ORDER.indexOf(getConsultingOverviewGroupKey(row, referenceDate))
}

export function sortConsultingOverviewRows(rows: ConsultingOverviewRow[], sort: ConsultingOverviewSort, referenceDate = new Date()): ConsultingOverviewRow[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const dateA = getConsultingOverviewRowDate(a.row)?.getTime() ?? null
      const dateB = getConsultingOverviewRowDate(b.row)?.getTime() ?? null
      if (sort === 'cliente') {
        const byClient = a.row.clientName.localeCompare(b.row.clientName, 'pt-BR', { sensitivity: 'base' })
        if (byClient !== 0) return byClient
      } else if (sort === 'recentes') {
        if (dateA !== dateB) {
          if (dateA === null) return 1
          if (dateB === null) return -1
          return dateB - dateA
        }
      } else if (sort === 'data_proxima') {
        if (dateA !== dateB) {
          if (dateA === null) return 1
          if (dateB === null) return -1
          return dateA - dateB
        }
      } else {
        const byPriority = priorityRank(a.row, referenceDate) - priorityRank(b.row, referenceDate)
        if (byPriority !== 0) return byPriority
        if (dateA !== dateB) {
          if (dateA === null) return 1
          if (dateB === null) return -1
          return dateA - dateB
        }
      }
      return a.index - b.index
    })
    .map(({ row }) => row)
}

export function summarizeConsultingOverview(rows: ConsultingOverviewRow[], referenceDate = new Date()) {
  const rowState = (row: ConsultingOverviewRow) => getConsultingOverviewRowState(row, referenceDate)
  return {
    total: rows.length,
    filaRevisao: rows.filter(row => ['revisar_status', 'atrasado'].includes(rowState(row))).length,
    atrasados: rows.filter(row => rowState(row) === 'atrasado').length,
    revisarStatus: rows.filter(row => rowState(row) === 'revisar_status').length,
    agendaAtiva: rows.filter(row => isOpenConsultingStatus(row.status) && !['revisar_status', 'atrasado'].includes(rowState(row))).length,
    hoje: rows.filter(row => getConsultingOverviewGroupKey(row, referenceDate) === 'hoje').length,
    proximos7Dias: rows.filter(row => getConsultingOverviewGroupKey(row, referenceDate) === 'proximos_7_dias').length,
    agendados: rows.filter(row => row.status === 'agendado').length,
    concluidos: rows.filter(row => row.status === 'concluido').length,
    cancelados: rows.filter(row => row.status === 'cancelado').length,
    presenciais: rows.filter(row => row.modality === 'presencial').length,
    naoIniciados: rows.filter(row => row.status === 'nao_iniciado').length,
  }
}

type Row = Record<string, unknown>

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : value == null ? fallback : String(value)
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asNumber(value: unknown, fallback = 0): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export async function fetchConsultingOverview(): Promise<{ rows: ConsultingOverviewRow[]; error: string | null }> {
  const visits: Row[] = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error: visitsError } = await supabase
      .from('visitas_consultoria')
      .select('id, client_id, visit_number, objective, visit_reason, status, modality, scheduled_at, effective_visit_date, consultant_id, consultant_name_manual, product_name')
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .range(offset, offset + pageSize - 1)
    if (visitsError) return { rows: [], error: visitsError.message }
    visits.push(...((data ?? []) as unknown as Row[]))
    if (!data || data.length < pageSize) break
  }

  const visitRows = visits
  const clientIds = [...new Set(visitRows.map(row => asString(row.client_id)).filter(Boolean))]
  const consultantIds = [...new Set(visitRows.map(row => asString(row.consultant_id)).filter(Boolean))]
  const visitIds = visitRows.map(row => asString(row.id)).filter(Boolean)
  const [clientsResult, consultantsResult, deliveriesResult] = await Promise.all([
    clientIds.length ? supabase.from('clientes_consultoria').select('id, name, slug, primary_store_id, product_name').in('id', clientIds) : Promise.resolve({ data: [], error: null }),
    consultantIds.length ? supabase.from('usuarios').select('id, name').in('id', consultantIds) : Promise.resolve({ data: [], error: null }),
    visitIds.length ? supabase.from('consultoria_itens_entrega').select('visit_id, status').in('visit_id', visitIds) : Promise.resolve({ data: [], error: null }),
  ])
  const secondaryError = clientsResult.error ?? consultantsResult.error ?? deliveriesResult.error
  if (secondaryError) return { rows: [], error: secondaryError.message }

  const clients = new Map((clientsResult.data ?? []).map(client => [client.id, client]))
  const consultants = new Map((consultantsResult.data ?? []).map(consultant => [consultant.id, consultant.name]))
  const deliveries = new Map<string, { total: number; done: number }>()
  for (const delivery of deliveriesResult.data ?? []) {
    const current = deliveries.get(delivery.visit_id ?? '') ?? { total: 0, done: 0 }
    current.total += 1
    if (['concluido', 'completed'].includes(String(delivery.status ?? '').toLowerCase())) current.done += 1
    deliveries.set(delivery.visit_id ?? '', current)
  }

  return {
    rows: visitRows
      .map(row => {
        const client = clients.get(asString(row.client_id))
        if (!client) return null
        const delivery = deliveries.get(asString(row.id)) ?? { total: 0, done: 0 }
        const title = asString(row.objective || row.visit_reason || row.product_name, 'Encontro ' + asNumber(row.visit_number))
        return {
          id: asString(row.id),
          clientId: asString(row.client_id),
          clientName: asString(client.name, 'Cliente sem nome'),
          clientSlug: asString(client.slug, asString(client.id)),
          primaryStoreId: asNullableString(client.primary_store_id),
          visitNumber: asNumber(row.visit_number),
          title,
          objective: asString(row.objective || row.visit_reason, 'Objetivo não definido.'),
          consultantName: asString(row.consultant_name_manual || consultants.get(asString(row.consultant_id)), 'Consultor não atribuído'),
          consultantId: asNullableString(row.consultant_id),
          modality: normalizeConsultingModality(asString(row.modality)),
          status: normalizeConsultingStatus(asString(row.status)),
          scheduledAt: asNullableString(row.scheduled_at),
          effectiveVisitDate: asNullableString(row.effective_visit_date),
          productName: asString(row.product_name || client.product_name, 'Produto não informado'),
          deliverables: delivery.total,
          deliverablesDone: delivery.done,
        }
      })
      .filter((row): row is ConsultingOverviewRow => Boolean(row)),
    error: null,
  }
}
