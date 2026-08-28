import { supabase } from '@/lib/supabase'

export type ConsultingOverviewStatus = 'nao_iniciado' | 'agendado' | 'concluido' | 'reagendado' | 'cancelado'
export type ConsultingOverviewModality = 'online' | 'presencial' | 'a_definir'

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
}

export function normalizeConsultingStatus(value: string | null | undefined): ConsultingOverviewStatus {
  const normalized = String(value ?? '').trim().toLowerCase().replaceAll(' ', '_')
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
  const normalized = String(value ?? '').trim().toLowerCase()
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
  const term = filters.search.trim().toLocaleLowerCase('pt-BR')
  return rows.filter(row => {
    if (filters.status !== 'todos' && row.status !== filters.status) return false
    if (filters.modality !== 'todas' && row.modality !== filters.modality) return false
    if (!term) return true
    return [row.clientName, row.title, row.objective, row.consultantName, row.productName, String(row.visitNumber)]
      .some(value => value.toLocaleLowerCase('pt-BR').includes(term))
  })
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
