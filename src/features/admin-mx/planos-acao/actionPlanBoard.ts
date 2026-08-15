import { supabase } from '@/lib/supabase'

export type PlanStatus =
  | 'pendente'
  | 'em_andamento'
  | 'atrasado'
  | 'concluido'
  | 'validando_eficacia'
  | 'cancelada'
  | 'aguardando_decisao'
  | 'bloqueada'

export const STATUS_LABEL: Record<PlanStatus, string> = {
  pendente: 'Não iniciada',
  em_andamento: 'Em andamento',
  atrasado: 'Atrasada',
  concluido: 'Concluída',
  validando_eficacia: 'Validando eficácia',
  cancelada: 'Cancelada',
  aguardando_decisao: 'Aguardando decisão',
  bloqueada: 'Bloqueada',
}

/** Colunas do kanban, na ordem do Base44. */
export const BOARD_COLUMNS: PlanStatus[] = ['pendente', 'em_andamento', 'atrasado', 'concluido']

export type BoardPlan = {
  id: string
  codigo: string | null
  problema: string | null
  acao: string | null
  status: PlanStatus | null
  prioridade: string | null
  prazo: string | null
  progresso: number | null
  departamento: string | null
  indicador: string | null
  responsavel_id: string | null
  concluido_at: string | null
  scope_id: string | null
}

export type PlanHistoryEntry = {
  id: string
  event_type: string | null
  event_note: string | null
  changed_at: string
  changed_by: string | null
}

export type PlanEvidence = {
  id: string
  tipo: string | null
  nome_arquivo: string | null
  nota: string | null
  evidence_url: string | null
  created_at: string
}

/**
 * Coluna do kanban em que o plano aparece. Prazo vencido em plano aberto
 * vira "Atrasada" mesmo quando o status gravado ainda é pendente/andamento —
 * é assim que a equipe enxerga o board.
 */
export function resolveBoardColumn(plan: Pick<BoardPlan, 'status' | 'prazo'>, today = new Date()): PlanStatus {
  const status = (plan.status ?? 'pendente') as PlanStatus
  if (status === 'concluido' || status === 'cancelada' || status === 'validando_eficacia') return status
  if (plan.prazo && plan.prazo < today.toISOString().slice(0, 10)) return 'atrasado'
  return status
}

export function groupPlansByColumn(plans: BoardPlan[], today = new Date()): Record<PlanStatus, BoardPlan[]> {
  const groups = Object.fromEntries(BOARD_COLUMNS.map(column => [column, [] as BoardPlan[]])) as Record<PlanStatus, BoardPlan[]>
  for (const plan of plans) {
    const column = resolveBoardColumn(plan, today)
    if (groups[column]) groups[column].push(plan)
  }
  return groups
}

/** Transições oferecidas no card, espelhando as ações do Base44. */
export function allowedPlanTransitions(status: PlanStatus | null): PlanStatus[] {
  const current = (status ?? 'pendente') as PlanStatus
  if (current === 'pendente') return ['em_andamento', 'cancelada']
  if (current === 'em_andamento' || current === 'atrasado') return ['concluido', 'bloqueada', 'cancelada']
  if (current === 'bloqueada') return ['em_andamento', 'cancelada']
  if (current === 'concluido') return ['em_andamento']
  return []
}

/** Concluir exige data efetiva; o banco tem CHECK ligando status e concluido_at. */
export function validateCompletion(effectiveDate: string): string | null {
  if (!effectiveDate) return 'Informe a data efetiva de conclusão.'
  if (effectiveDate > new Date().toISOString().slice(0, 10)) return 'A conclusão não pode ser no futuro.'
  return null
}

export function validateDueDateChange(newDate: string, reason: string): string | null {
  if (!newDate) return 'Informe a nova data prevista.'
  if (!reason.trim()) return 'Justifique a alteração do prazo.'
  return null
}

export function boardMetrics(plans: BoardPlan[], today = new Date()) {
  const groups = groupPlansByColumn(plans, today)
  return {
    total: plans.length,
    naoIniciadas: groups.pendente.length,
    emAndamento: groups.em_andamento.length,
    atrasadas: groups.atrasado.length,
    concluidas: groups.concluido.length,
  }
}

export async function changePlanStatus(planId: string, status: PlanStatus, extra: { concluido_at?: string | null; note?: string } = {}): Promise<{ error: string | null }> {
  const payload: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'concluido') {
    payload.concluido_at = extra.concluido_at ?? new Date().toISOString()
    payload.progresso = 100
  }
  if (status === 'em_andamento') {
    payload.concluido_at = null
    payload.iniciado_at = new Date().toISOString()
  }
  if (extra.note) payload.progress_note = extra.note
  const { error } = await supabase.from('planos_acao').update(payload).eq('id', planId)
  return { error: error?.message ?? null }
}

export async function reschedulePlan(planId: string, newDate: string, reason: string, userId: string): Promise<{ error: string | null }> {
  const invalid = validateDueDateChange(newDate, reason)
  if (invalid) return { error: invalid }
  const { error } = await supabase
    .from('planos_acao')
    .update({
      prazo: newDate,
      reschedule_reason: reason.trim(),
      rescheduled_at: new Date().toISOString(),
      rescheduled_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
  return { error: error?.message ?? null }
}

export async function fetchPlanHistory(planId: string): Promise<PlanHistoryEntry[]> {
  const { data } = await supabase
    .from('historico_planos_acao')
    .select('id, event_type, event_note, changed_at, changed_by')
    .eq('plano_id', planId)
    .order('changed_at', { ascending: false })
    .limit(50)
  return (data ?? []) as PlanHistoryEntry[]
}

export async function fetchPlanEvidence(planId: string): Promise<PlanEvidence[]> {
  const { data } = await supabase
    .from('evidencias_planos_acao')
    .select('id, tipo, nome_arquivo, nota, evidence_url, created_at')
    .eq('plano_id', planId)
    .order('created_at', { ascending: false })
  return (data ?? []) as PlanEvidence[]
}
