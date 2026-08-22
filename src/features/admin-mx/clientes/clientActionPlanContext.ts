import { supabase } from '@/lib/supabase'
import { fetchClientUnits } from '@/features/strategic-plan/clientPlanningRepository'

export type ClientActionPlanRow = {
  id: string
  codigo: string | null
  acao: string
  objetivo: string | null
  indicador: string
  departamento: string
  prazo: string | null
  status: string
  progresso: number
  scope_id: string
  scope_type: string
  responsavel_id: string | null
  updated_at: string
  scope_name: string | null
  checklist: unknown
}

export type ClientActionPlanSummary = {
  total: number
  open: number
  completed: number
  blocked: number
  cancelled: number
  averageProgress: number
}

export function normalizeActionPlanStatus(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase()
}

export function actionPlanStatusLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    pendente: 'Pendente',
    em_andamento: 'Em andamento',
    bloqueada: 'Bloqueada',
    bloqueado: 'Bloqueada',
    concluida: 'Concluída',
    concluído: 'Concluída',
    cancelada: 'Cancelada',
    em_validacao: 'Em validação',
  }
  const normalized = normalizeActionPlanStatus(value)
  return labels[normalized] ?? (value?.trim() || 'Sem status')
}

export function summarizeClientActionPlans(rows: Array<Pick<ClientActionPlanRow, 'status' | 'progresso'>>): ClientActionPlanSummary {
  const completed = rows.filter(row => ['concluida', 'concluído'].includes(normalizeActionPlanStatus(row.status))).length
  const blocked = rows.filter(row => ['bloqueada', 'bloqueado'].includes(normalizeActionPlanStatus(row.status))).length
  const cancelled = rows.filter(row => ['cancelada', 'cancelado'].includes(normalizeActionPlanStatus(row.status))).length
  const open = rows.length - completed - blocked - cancelled
  const averageProgress = rows.length ? Math.round(rows.reduce((sum, row) => sum + Math.max(0, Math.min(100, row.progresso ?? 0)), 0) / rows.length) : 0
  return { total: rows.length, open, completed, blocked, cancelled, averageProgress }
}

/** Resumo leve para a Visão geral, sem deixar a ficha com texto fixo. */
export async function fetchClientActionPlanSummary(
  clientId: string,
  primaryStoreId?: string | null,
): Promise<{ summary: ClientActionPlanSummary; error: string | null }> {
  const unitsResult = await fetchClientUnits(clientId)
  const scopeIds = [...new Set(unitsResult.units.map(unit => unit.id).concat(primaryStoreId ? [primaryStoreId] : []))]
  if (!scopeIds.length) return { summary: summarizeClientActionPlans([]), error: unitsResult.error }

  const { data, error } = await supabase
    .from('planos_acao')
    .select('status, progresso')
    .eq('scope_type', 'store')
    .in('scope_id', scopeIds)
    .limit(300)
  if (error) return { summary: summarizeClientActionPlans([]), error: error.message }
  return {
    summary: summarizeClientActionPlans((data ?? []) as Array<Pick<ClientActionPlanRow, 'status' | 'progresso'>>),
    error: unitsResult.error,
  }
}
