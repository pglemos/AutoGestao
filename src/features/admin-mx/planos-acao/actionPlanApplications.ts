import { supabase } from '@/lib/supabase'

/**
 * Aplicações de templates nos clientes (Base44 `ApplicationsTab`), com a
 * lógica de progresso ponderado em função pura (testável) e o acesso a dados
 * separado.
 */

export type ChecklistItem = {
  titulo: string
  como: string | null
  peso_bp: number
  peso_pct: string
  status: string
}

/** Plano aplicado a partir de um template (origem consultor + rastro de versão). */
export type ApplicationPlan = {
  id: string
  codigo: string | null
  departamento: string
  indicador: string
  problema: string
  acao: string
  status: string
  prioridade: string
  prazo: string | null
  progresso: number
  eficacia_score: number | null
  eficacia_nota: string | null
  responsavel_id: string | null
  checklist: ChecklistItem[] | null
  createdAt: string
  storeId: string | null
  storeName: string | null
  clientId: string | null
  clientName: string | null
}

/**
 * Progresso do plano pelo peso das ações concluídas. Ação 'concluido' ou
 * 'concluida' conta o peso; o resto não. Sem checklist ponderado, cai no
 * progresso numérico gravado.
 */
export function calculateWeightedProgress(items: ChecklistItem[] | null, fallback: number): {
  percentage: number
  completedCount: number
  totalCount: number
} {
  if (!items?.length) {
    return { percentage: fallback ?? 0, completedCount: 0, totalCount: 0 }
  }
  const done = new Set(['concluido', 'concluida', 'realizado'])
  const completed = items.filter(item => done.has(String(item.status ?? '').toLowerCase()))
  const completedWeight = completed.reduce((sum, item) => sum + Number(item.peso_bp ?? 0), 0)
  const totalWeight = items.reduce((sum, item) => sum + Number(item.peso_bp ?? 0), 0)
  const percentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0
  return { percentage, completedCount: completed.length, totalCount: items.length }
}

export function applicationStatusLabel(status: string | null): string {
  switch (status) {
    case 'pendente': return 'Não iniciada'
    case 'em_andamento': return 'Em andamento'
    case 'atrasado': return 'Atrasada'
    case 'concluido': return 'Concluída'
    case 'validando_eficacia': return 'Validando eficácia'
    case 'cancelada': return 'Cancelada'
    case 'bloqueada': return 'Bloqueada'
    case 'aguardando_decisao': return 'Aguardando decisão'
    default: return status ?? '—'
  }
}

export function efficacyLabel(score: number | null): string | null {
  if (score === null) return null
  if (score >= 70) return 'Eficaz'
  if (score >= 40) return 'Parcialmente eficaz'
  return 'Ineficaz'
}

export function applicationMetrics(plans: ApplicationPlan[]) {
  return {
    total: plans.length,
    clients: new Set(plans.map(plan => plan.clientId).filter((id): id is string => Boolean(id))).size,
    emAndamento: plans.filter(plan => plan.status === 'em_andamento').length,
    atrasadas: plans.filter(plan => plan.status === 'atrasado').length,
    concluidas: plans.filter(plan => plan.status === 'concluido').length,
    validando: plans.filter(plan => plan.status === 'validando_eficacia').length,
  }
}

/**
 * Busca planos criados a partir de templates (origem consultor com rastro de
 * versão de template), resolve loja e cliente, e calcula progresso ponderado.
 */
export async function fetchApplications(input: { limit?: number } = {}): Promise<{
  rows: ApplicationPlan[]
  error: string | null
}> {
  const { limit = 300 } = input
  const { data: plans, error } = await supabase
    .from('planos_acao')
    .select('id, codigo, departamento, indicador, problema, acao, status, prioridade, prazo, progresso, eficacia_score, eficacia_nota, responsavel_id, checklist, created_at, scope_id, scope_type, origem_ref_table')
    .eq('origem_ref_table', 'planos_acao_template_versoes')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return { rows: [], error: error.message }

  const storeIds = [...new Set((plans ?? []).map(plan => plan.scope_id).filter((id): id is string => Boolean(id)))]
  const [{ data: stores, error: storesError }] = await Promise.all([
    storeIds.length
      ? supabase.from('lojas').select('id, name, parent_loja_id').in('id', storeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; parent_loja_id: string | null }>, error: null }),
  ])
  if (storesError) return { rows: [], error: storesError.message }

  const matrizIds = [...new Set((stores ?? []).map(store => store.parent_loja_id ?? store.id))]
  const { data: clients, error: clientsError } = matrizIds.length
    ? await supabase.from('clientes_consultoria').select('id, name, primary_store_id').in('primary_store_id', matrizIds)
    : { data: [] as Array<{ id: string; name: string; primary_store_id: string | null }>, error: null }
  if (clientsError) return { rows: [], error: clientsError.message }

  const storeNames = new Map((stores ?? []).map(store => [store.id, store.name]))
  const clientByMatriz = new Map((clients ?? []).map(client => [client.primary_store_id, client]))
  const clientByStore = new Map((stores ?? []).map(store => [store.id, clientByMatriz.get(store.parent_loja_id ?? store.id) ?? null]))

  const rows: ApplicationPlan[] = (plans ?? []).map(plan => {
    const storeId = plan.scope_type === 'store' ? plan.scope_id : null
    const client = storeId ? clientByStore.get(storeId) : null
    const progress = calculateWeightedProgress(plan.checklist as ChecklistItem[] | null, plan.progresso)
    return {
      id: plan.id,
      codigo: plan.codigo,
      departamento: plan.departamento,
      indicador: plan.indicador,
      problema: plan.problema,
      acao: plan.acao,
      status: plan.status,
      prioridade: plan.prioridade,
      prazo: plan.prazo,
      progresso: progress.percentage,
      eficacia_score: plan.eficacia_score,
      eficacia_nota: plan.eficacia_nota,
      responsavel_id: plan.responsavel_id,
      checklist: plan.checklist as ChecklistItem[] | null,
      createdAt: plan.created_at,
      storeId,
      storeName: storeId ? storeNames.get(storeId) ?? null : null,
      clientId: client?.id ?? null,
      clientName: client?.name ?? null,
    }
  })

  return { rows, error: null }
}
