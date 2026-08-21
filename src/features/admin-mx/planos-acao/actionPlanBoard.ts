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
  checklist: BoardChecklistItem[]
}

export async function fetchBoardPlanById(id: string): Promise<{ plan: BoardPlan | null; error: string | null }> {
  const { data, error } = await supabase
    .from('planos_acao')
    .select('id, codigo, problema, acao, status, prioridade, prazo, progresso, departamento, indicador, responsavel_id, concluido_at, scope_id, checklist')
    .eq('id', id)
    .maybeSingle()
  if (error) return { plan: null, error: error.message }
  if (!data) return { plan: null, error: 'Plano de ação não encontrado.' }
  return {
    plan: {
      id: data.id,
      codigo: data.codigo,
      problema: data.problema,
      acao: data.acao,
      status: data.status as PlanStatus | null,
      prioridade: data.prioridade,
      prazo: data.prazo,
      progresso: data.progresso,
      departamento: data.departamento,
      indicador: data.indicador,
      responsavel_id: data.responsavel_id,
      concluido_at: data.concluido_at,
      scope_id: data.scope_id,
      checklist: normalizeBoardChecklist(data.checklist),
    },
    error: null,
  }
}

export type BoardChecklistItem = {
  titulo: string
  como: string | null
  peso_bp: number
  peso_pct: string
  status: string
}

export function normalizeBoardChecklist(value: unknown): BoardChecklistItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const row = item as Record<string, unknown>
    const titulo = typeof row.titulo === 'string' ? row.titulo.trim() : ''
    if (!titulo) return []
    const pesoBp = Number(row.peso_bp)
    return [{
      titulo,
      como: typeof row.como === 'string' ? row.como : null,
      peso_bp: Number.isFinite(pesoBp) && pesoBp >= 0 ? pesoBp : 0,
      peso_pct: typeof row.peso_pct === 'string' ? row.peso_pct : '0%',
      status: typeof row.status === 'string' ? row.status : 'pendente',
    }]
  })
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

const COMPLETED_CHECKLIST_STATUSES = new Set(['concluido', 'concluida', 'realizado', 'cancelado', 'cancelada'])

export function countPendingChecklistItems(checklist: BoardChecklistItem[]): number {
  return checklist.filter(item => !COMPLETED_CHECKLIST_STATUSES.has(String(item.status ?? '').toLowerCase())).length
}

export function calculateChecklistProgress(checklist: BoardChecklistItem[]): number {
  if (!checklist.length) return 0
  const totalWeight = checklist.reduce((sum, item) => sum + Math.max(0, Number(item.peso_bp) || 0), 0)
  const completed = checklist.filter(item => ['concluido', 'concluida', 'realizado'].includes(item.status.toLowerCase()))
  if (totalWeight > 0) {
    const completedWeight = completed.reduce((sum, item) => sum + Math.max(0, Number(item.peso_bp) || 0), 0)
    return Math.round((completedWeight / totalWeight) * 100)
  }
  return Math.round((completed.length / checklist.length) * 100)
}

export function validateChecklistCompletion(input: {
  checklist: BoardChecklistItem[]
  overrideRequested: boolean
  overrideReason: string
  canOverride: boolean
}): string | null {
  const pendingCount = countPendingChecklistItems(input.checklist)
  if (pendingCount === 0) return input.overrideRequested ? 'O override não é necessário: não existem itens pendentes.' : null
  if (!input.overrideRequested) return `Este plano possui ${pendingCount} item(ns) pendente(s). Conclua ou cancele os itens antes de finalizar.`
  if (!input.canOverride) return 'Somente Administrador Geral ou Administrador MX pode concluir com itens pendentes.'
  if (!input.overrideReason.trim()) return 'Justifique a conclusão administrativa com itens pendentes.'
  return null
}

export function validateDueDateChange(newDate: string, reason: string): string | null {
  if (!newDate) return 'Informe a nova data prevista.'
  if (!reason.trim()) return 'Justifique a alteração do prazo.'
  return null
}

export function validateStatusTransition(from: PlanStatus | null, to: PlanStatus, reason: string): string | null {
  if (from === 'concluido' && to === 'em_andamento' && !reason.trim()) {
    return 'Justifique a reabertura do plano.'
  }
  if (from === 'bloqueada' && to === 'em_andamento' && !reason.trim()) {
    return 'Justifique o desbloqueio do plano.'
  }
  if (to === 'bloqueada' && !reason.trim()) return 'Justifique o bloqueio do plano.'
  if (to === 'cancelada' && !reason.trim()) return 'Justifique o cancelamento do plano.'
  return null
}

export function validateCompletionDateCorrection(effectiveDate: string, reason: string): string | null {
  if (!effectiveDate) return 'Informe a nova data efetiva de conclusão.'
  const invalidDate = validateCompletion(effectiveDate)
  if (invalidDate) return invalidDate
  if (!reason.trim()) return 'Justifique a correção da data de conclusão.'
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

export function buildStatusTransitionPatch(
  status: PlanStatus,
  extra: {
    from?: PlanStatus | null
    concluido_at?: string | null
    note?: string
    completionOverride?: boolean
    completionOverrideReason?: string
    checklist?: BoardChecklistItem[]
  } = {},
  now = new Date(),
): Record<string, unknown> {
  const note = extra.note?.trim() || null
  const eventType = status === 'bloqueada'
    ? 'blocked'
    : status === 'cancelada'
      ? 'cancelled'
      : extra.from === 'concluido' && status === 'em_andamento'
        ? 'reopened'
        : extra.from === 'bloqueada' && status === 'em_andamento'
          ? 'unblocked'
          : status === 'concluido'
            ? 'completed'
            : 'status_changed'
  const patch: Record<string, unknown> = {
    status,
    transition_metadata: {
      eventType,
      note,
      changedAt: now.toISOString(),
      ...(status === 'concluido' && extra.completionOverride
        ? {
            completionOverride: true,
            completionOverrideReason: extra.completionOverrideReason?.trim() || null,
          }
        : {}),
    },
  }
  if (status === 'concluido') {
    patch.concluido_at = extra.concluido_at ?? now.toISOString()
    patch.progresso = 100
  }
  if (status === 'em_andamento') {
    patch.concluido_at = null
    if (extra.from !== 'concluido' && extra.from !== 'bloqueada') patch.iniciado_at = now.toISOString()
    if (extra.from === 'concluido') patch.progresso = calculateChecklistProgress(extra.checklist ?? [])
    if (extra.from === 'concluido' && note) {
      patch.reopen_reason = note
      patch.reopen_note = note
    }
    if (extra.from === 'bloqueada' && note) patch.unblock_note = note
  }
  if (status === 'bloqueada' && note) {
    patch.blocked_reason = note
    patch.block_note = note
  }
  if (status === 'cancelada' && note) {
    patch.cancel_reason = note
    patch.cancel_note = note
  }
  if (note) patch.progress_note = note
  return patch
}

export function buildCompletionDateCorrectionPatch(effectiveDate: string, reason: string, now = new Date()) {
  const note = reason.trim()
  return {
    concluido_at: `${effectiveDate}T12:00:00.000Z`,
    progress_note: note,
    transition_metadata: {
      eventType: 'completion_date_corrected',
      note,
      changedAt: now.toISOString(),
    },
  }
}

export function buildChecklistProgressPatch(
  checklist: BoardChecklistItem[],
  itemIndex: number,
  completed: boolean,
  currentStatus: PlanStatus | null,
  now = new Date(),
): { checklist: BoardChecklistItem[]; progresso: number; status?: PlanStatus; iniciado_at?: string; transition_metadata: Record<string, unknown> } | null {
  if (itemIndex < 0 || itemIndex >= checklist.length) return null
  const nextChecklist = checklist.map((item, index) => index === itemIndex
    ? { ...item, status: completed ? 'concluido' : 'pendente' }
    : item)
  const completedCount = nextChecklist.filter(item => ['concluido', 'concluida', 'realizado'].includes(item.status.toLowerCase())).length
  const progresso = calculateChecklistProgress(nextChecklist)
  const patch = {
    checklist: nextChecklist,
    progresso,
    transition_metadata: {
      eventType: completed ? 'checklist_item_completed' : 'checklist_item_reopened',
      note: nextChecklist[itemIndex].titulo,
      changedAt: now.toISOString(),
      checklistItemIndex: itemIndex,
    },
  } as { checklist: BoardChecklistItem[]; progresso: number; status?: PlanStatus; iniciado_at?: string; transition_metadata: Record<string, unknown> }
  if (completed && currentStatus === 'pendente' && completedCount > 0) {
    patch.status = 'em_andamento'
    patch.iniciado_at = now.toISOString()
  }
  return patch
}

export async function toggleChecklistItem(input: {
  planId: string
  checklist: BoardChecklistItem[]
  itemIndex: number
  completed: boolean
  currentStatus: PlanStatus | null
}): Promise<{ checklist: BoardChecklistItem[]; progresso: number; status: PlanStatus | null; error: string | null }> {
  const { data, error } = await supabase.rpc('toggle_action_plan_checklist_item', {
    p_plan_id: input.planId,
    p_item_index: input.itemIndex,
    p_completed: input.completed,
  })
  if (error || !data) {
    return {
      checklist: input.checklist,
      progresso: calculateChecklistProgress(input.checklist),
      status: input.currentStatus,
      error: error?.message ?? 'Não foi possível atualizar o checklist.',
    }
  }
  const persisted = data as { checklist?: unknown; progresso?: number | null; status?: PlanStatus | null }
  return {
    checklist: normalizeBoardChecklist(persisted.checklist),
    progresso: persisted.progresso ?? 0,
    status: persisted.status ?? input.currentStatus,
    error: null,
  }
}

export async function changePlanStatus(planId: string, status: PlanStatus, extra: {
  from?: PlanStatus | null
  concluido_at?: string | null
  note?: string
  completionOverride?: boolean
  completionOverrideReason?: string
  checklist?: BoardChecklistItem[]
} = {}): Promise<{ error: string | null }> {
  const transitionError = validateStatusTransition(extra.from ?? null, status, extra.note ?? '')
  if (transitionError) return { error: transitionError }
  const { error } = await supabase.rpc('atualizar_plano_acao_patch', {
    p_plano_id: planId,
    p_patch: buildStatusTransitionPatch(status, extra),
  })
  return { error: error?.message ?? null }
}

export async function correctPlanCompletionDate(planId: string, effectiveDate: string, reason: string): Promise<{ error: string | null }> {
  const invalid = validateCompletionDateCorrection(effectiveDate, reason)
  if (invalid) return { error: invalid }
  const { error } = await supabase.rpc('atualizar_plano_acao_patch', {
    p_plano_id: planId,
    p_patch: buildCompletionDateCorrectionPatch(effectiveDate, reason),
  })
  return { error: error?.message ?? null }
}

export async function reschedulePlan(planId: string, newDate: string, reason: string, userId: string): Promise<{ error: string | null }> {
  const invalid = validateDueDateChange(newDate, reason)
  if (invalid) return { error: invalid }
  const changedAt = new Date().toISOString()
  const { error } = await supabase.rpc('atualizar_plano_acao_patch', {
    p_plano_id: planId,
    p_patch: {
      prazo: newDate,
      reschedule_reason: reason.trim(),
      reschedule_note: reason.trim(),
      rescheduled_at: changedAt,
      rescheduled_by: userId,
      transition_metadata: { eventType: 'rescheduled', note: reason.trim(), changedAt },
    },
  })
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
