import { supabase } from '@/lib/supabase'

export type ConsultingOverviewStatus = 'nao_iniciado' | 'agendado' | 'concluido' | 'reagendado' | 'cancelado'
export type ConsultingOverviewModality = 'online' | 'presencial' | 'a_definir'
export type ConsultingOverviewPeriod = 'todos' | 'hoje' | 'proximos_7_dias' | 'atrasados'
export type ConsultingOverviewSort = 'prioridade' | 'data_proxima' | 'recentes' | 'cliente'

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

export type ConsultingOverviewFilters = {
  search: string
  status: 'todos' | ConsultingOverviewStatus
  modality: 'todas' | ConsultingOverviewModality
  period?: ConsultingOverviewPeriod
  sort?: ConsultingOverviewSort
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

export function isConsultingOverviewRowOverdue(row: ConsultingOverviewRow, referenceDate = new Date()): boolean {
  if (!['nao_iniciado', 'agendado', 'reagendado'].includes(row.status)) return false
  const date = getConsultingOverviewRowDate(row)
  return Boolean(date && date.getTime() < referenceDate.getTime())
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

export function filterConsultingOverviewRows(rows: ConsultingOverviewRow[], filters: ConsultingOverviewFilters): ConsultingOverviewRow[] {
  const term = normalizeLookupValue(filters.search)
  const today = new Date()
  const period = filters.period ?? 'todos'
  const filtered = rows.filter(row => {
    if (filters.status !== 'todos' && row.status !== filters.status) return false
    if (filters.modality !== 'todas' && row.modality !== filters.modality) return false
    if (period === 'atrasados' && !isConsultingOverviewRowOverdue(row, today)) return false
    if (period === 'hoje') {
      const date = getConsultingOverviewRowDate(row)
      if (!date || date < startOfDay(today) || date > endOfDay(today)) return false
    }
    if (period === 'proximos_7_dias') {
      const date = getConsultingOverviewRowDate(row)
      const start = startOfDay(today)
      const end = endOfDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7))
      if (!date || date < start || date > end) return false
    }
    if (!term) return true
    return [row.clientName, row.title, row.objective, row.consultantName, row.productName, String(row.visitNumber)]
      .some(value => normalizeLookupValue(value).includes(term))
  })
  return sortConsultingOverviewRows(filtered, filters.sort ?? 'prioridade')
}

function priorityRank(row: ConsultingOverviewRow) {
  if (isConsultingOverviewRowOverdue(row)) return 0
  if (row.status === 'nao_iniciado') return 1
  if (row.status === 'reagendado') return 2
  if (row.status === 'agendado') return 3
  if (row.status === 'concluido') return 4
  return 5
}

export function sortConsultingOverviewRows(rows: ConsultingOverviewRow[], sort: ConsultingOverviewSort): ConsultingOverviewRow[] {
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
        const byPriority = priorityRank(a.row) - priorityRank(b.row)
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

export function summarizeConsultingOverview(rows: ConsultingOverviewRow[]) {
  return {
    agendados: rows.filter(row => row.status === 'agendado').length,
    concluidos: rows.filter(row => row.status === 'concluido').length,
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
