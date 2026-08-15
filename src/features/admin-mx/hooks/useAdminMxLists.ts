import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type QueryState<T> = { rows: T[]; loading: boolean; error: string | null; refetch: () => Promise<void> }

function useSupabaseList<T>(key: string, run: () => Promise<T[]>): QueryState<T> {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await run())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Falha ao carregar ${key}.`)
      setRows([])
    } finally {
      setLoading(false)
    }
    // run é recriado a cada render nas chamadas; a key estabiliza o efeito.
  }, [key])

  useEffect(() => { void fetchRows() }, [fetchRows])

  return { rows, loading, error, refetch: fetchRows }
}

export type AdminTeamMember = {
  id: string
  name: string | null
  email: string | null
  role: string | null
  active: boolean | null
  phone: string | null
  assignments: number
}

export function useAdminTeam(): QueryState<AdminTeamMember> {
  return useSupabaseList<AdminTeamMember>('equipe MX', async () => {
    const { data: users, error } = await supabase
      .from('usuarios')
      .select('id, name, email, role, active, phone')
      .in('role', ['administrador_geral', 'administrador_mx', 'consultor_mx'])
      .order('name', { ascending: true })
    if (error) throw new Error(error.message)
    const { data: assignments } = await supabase
      .from('atribuicoes_consultoria')
      .select('user_id, active')
      .eq('active', true)
    const counters = new Map<string, number>()
    for (const item of assignments ?? []) {
      const userId = (item as { user_id: string | null }).user_id
      if (!userId) continue
      counters.set(userId, (counters.get(userId) ?? 0) + 1)
    }
    return (users ?? []).map(user => ({ ...user, assignments: counters.get(user.id) ?? 0 })) as AdminTeamMember[]
  })
}

export type AdminConsultingProduct = {
  program_key: string
  name: string | null
  total_visits: number | null
  active: boolean | null
  clients: number
}

export function useAdminConsultingProducts(): QueryState<AdminConsultingProduct> {
  return useSupabaseList<AdminConsultingProduct>('produtos de consultoria', async () => {
    const { data: programs, error } = await supabase
      .from('programas_visita_consultoria')
      .select('program_key, name, total_visits, active')
      .order('name', { ascending: true })
    if (error) throw new Error(error.message)
    const { data: clients } = await supabase
      .from('clientes_consultoria')
      .select('program_template_key, status')
      .neq('status', 'arquivado')
    const counters = new Map<string, number>()
    for (const client of clients ?? []) {
      const key = (client as { program_template_key: string | null }).program_template_key
      if (!key) continue
      counters.set(key, (counters.get(key) ?? 0) + 1)
    }
    return (programs ?? []).map(program => ({ ...program, clients: counters.get(program.program_key) ?? 0 })) as AdminConsultingProduct[]
  })
}

export type ConsultingProductInput = { program_key: string; name: string; total_visits: number; active: boolean }

/** Cria ou atualiza um produto de consultoria pela chave do programa. */
export async function saveConsultingProduct(input: ConsultingProductInput): Promise<{ error: string | null }> {
  const key = input.program_key.trim()
  if (!key) return { error: 'Informe a chave do programa.' }
  if (!input.name.trim()) return { error: 'Informe o nome do produto.' }
  if (!Number.isFinite(input.total_visits) || input.total_visits < 1) return { error: 'A jornada precisa de ao menos 1 encontro.' }
  const { error } = await supabase
    .from('programas_visita_consultoria')
    .upsert({ program_key: key, name: input.name.trim(), total_visits: input.total_visits, active: input.active }, { onConflict: 'program_key' })
  return { error: error?.message ?? null }
}

export type AvailableStore = { id: string; name: string }

/**
 * Lojas que ainda podem receber um cliente: o índice parcial
 * `clientes_consultoria_one_active_per_store_uidx` só admite um cliente ativo
 * por loja, então oferecer as ocupadas garantiria um 409 na gravação.
 */
export function useStoresWithoutActiveClient(): QueryState<AvailableStore> {
  return useSupabaseList<AvailableStore>('lojas disponíveis', async () => {
    const [{ data: stores, error }, { data: taken }] = await Promise.all([
      supabase.from('lojas').select('id, name').order('name', { ascending: true }),
      supabase.from('clientes_consultoria').select('primary_store_id, status'),
    ])
    if (error) throw new Error(error.message)
    const busy = new Set(
      (taken ?? [])
        .filter(client => ['ativo', 'ativa', 'active'].includes(String(client.status ?? '').toLowerCase()))
        .map(client => client.primary_store_id)
        .filter((id): id is string => Boolean(id)),
    )
    return (stores ?? []).filter(store => !busy.has(store.id)) as AvailableStore[]
  })
}

export type AdminIndicator = {
  metric_key: string
  label: string | null
  area: string | null
  value_type: string | null
  direction: string | null
  source_scope: string | null
  active: boolean | null
  targets: number
}

export function useAdminIndicators(): QueryState<AdminIndicator> {
  return useSupabaseList<AdminIndicator>('indicadores', async () => {
    const { data: catalog, error } = await supabase
      .from('catalogo_metricas_consultoria')
      .select('metric_key, label, area, value_type, direction, source_scope, active, sort_order')
      .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    const { data: targets } = await supabase.from('metas_metricas_cliente').select('metric_key')
    const counters = new Map<string, number>()
    for (const target of targets ?? []) {
      const key = (target as { metric_key: string | null }).metric_key
      if (!key) continue
      counters.set(key, (counters.get(key) ?? 0) + 1)
    }
    return (catalog ?? []).map(item => ({ ...item, targets: counters.get(item.metric_key) ?? 0 })) as AdminIndicator[]
  })
}

export type IndicatorInput = {
  metric_key: string
  label: string
  area: string
  value_type: string
  direction: string
  source_scope: string
  active: boolean
}

// O catálogo é NOT NULL em area/value_type/direction/source_scope e tem CHECK
// nos dois últimos — os valores abaixo são os aceitos pelo banco.
export const INDICATOR_DIRECTIONS = ['increase', 'decrease'] as const
export const INDICATOR_VALUE_TYPES = ['number', 'percent', 'currency'] as const
export const INDICATOR_SOURCE_SCOPES = [
  'manual', 'computed', 'sales', 'marketing', 'inventory', 'dre', 'daily_tracking', 'diagnostic', 'target', 'training',
] as const

/** Erro bloqueante do indicador, ou null. Espelha os NOT NULL e CHECKs da tabela. */
export function validateIndicatorInput(input: IndicatorInput): string | null {
  const key = input.metric_key.trim()
  if (!key) return 'Informe a chave da métrica.'
  if (!/^[a-z0-9_]+$/.test(key)) return 'A chave aceita apenas minúsculas, números e underline.'
  if (!input.label.trim()) return 'Informe o nome do indicador.'
  if (!input.area.trim()) return 'Informe a área do indicador.'
  if (!INDICATOR_DIRECTIONS.includes(input.direction as (typeof INDICATOR_DIRECTIONS)[number])) {
    return 'Selecione a direção de leitura do indicador.'
  }
  if (!INDICATOR_VALUE_TYPES.includes(input.value_type as (typeof INDICATOR_VALUE_TYPES)[number])) {
    return 'Selecione o tipo de valor do indicador.'
  }
  return null
}

/** Cria ou atualiza um indicador do catálogo pela chave da métrica. */
export async function saveIndicator(input: IndicatorInput): Promise<{ error: string | null }> {
  const invalid = validateIndicatorInput(input)
  if (invalid) return { error: invalid }
  const key = input.metric_key.trim()
  const { error } = await supabase
    .from('catalogo_metricas_consultoria')
    .upsert({
      metric_key: key,
      label: input.label.trim(),
      area: input.area.trim(),
      value_type: input.value_type,
      direction: input.direction,
      source_scope: input.source_scope || 'manual',
      active: input.active,
    }, { onConflict: 'metric_key' })
  return { error: error?.message ?? null }
}

export type AdminActionPlan = {
  id: string
  codigo: string | null
  problema: string | null
  acao: string | null
  status: string | null
  prioridade: string | null
  prazo: string | null
  progresso: number | null
  departamento: string | null
  scope_type: string | null
  scope_id: string | null
  indicador: string | null
}

export function useAdminActionPlans(): QueryState<AdminActionPlan> {
  return useSupabaseList<AdminActionPlan>('planos de ação', async () => {
    const { data, error } = await supabase
      .from('planos_acao')
      .select('id, codigo, problema, acao, status, prioridade, prazo, progresso, departamento, scope_type, scope_id, indicador')
      .order('prazo', { ascending: true, nullsFirst: false })
      .limit(500)
    if (error) throw new Error(error.message)
    return (data ?? []) as AdminActionPlan[]
  })
}

export type AdminVisit = {
  id: string
  client_id: string | null
  client_name: string | null
  visit_number: number | null
  status: string | null
  modality: string | null
  scheduled_at: string | null
  effective_visit_date: string | null
  consultant_id: string | null
  product_name: string | null
  deliverables: number
  deliverables_done: number
}

export function useAdminConsultingVisits(): QueryState<AdminVisit> {
  return useSupabaseList<AdminVisit>('jornada de consultoria', async () => {
    const { data: visits, error } = await supabase
      .from('visitas_consultoria')
      .select('id, client_id, visit_number, status, modality, scheduled_at, effective_visit_date, consultant_id, product_name')
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .limit(300)
    if (error) throw new Error(error.message)
    const clientIds = [...new Set((visits ?? []).map(visit => visit.client_id).filter((id): id is string => Boolean(id)))]
    const visitIds = (visits ?? []).map(visit => visit.id)
    const [{ data: clients }, { data: items }] = await Promise.all([
      clientIds.length ? supabase.from('clientes_consultoria').select('id, name').in('id', clientIds) : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
      visitIds.length ? supabase.from('consultoria_itens_entrega').select('visit_id, status').in('visit_id', visitIds) : Promise.resolve({ data: [] as { visit_id: string | null; status: string | null }[] }),
    ])
    const names = new Map((clients ?? []).map(client => [client.id, client.name]))
    const totals = new Map<string, { total: number; done: number }>()
    for (const item of items ?? []) {
      const visitId = (item as { visit_id: string | null }).visit_id
      if (!visitId) continue
      const current = totals.get(visitId) ?? { total: 0, done: 0 }
      current.total += 1
      if ((item as { status: string | null }).status === 'concluido') current.done += 1
      totals.set(visitId, current)
    }
    return (visits ?? []).map(visit => {
      const counter = totals.get(visit.id) ?? { total: 0, done: 0 }
      return { ...visit, client_name: (visit.client_id ? names.get(visit.client_id) : null) ?? null, deliverables: counter.total, deliverables_done: counter.done }
    }) as AdminVisit[]
  })
}
