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
  origem_ref_id?: string | null
  transition_metadata?: unknown
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

function metadataRecord(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  return metadata as Record<string, unknown>
}

function metadataString(metadata: unknown, key: string): string | null {
  const record = metadataRecord(metadata)
  if (!record) return null
  const value = record[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Um plano aplicado = um card.
 * Modelo novo: 1 linha/loja com checklist.
 * Modelo legado: 1 linha por item do template → colapsar por request+loja
 * (ou versão+loja) e sintetizar checklist.
 */
export function collapseClientActionPlanRows<T extends {
  id: string
  acao: string
  status: string
  progresso: number
  scope_id: string
  checklist?: unknown
  origem_ref_id?: string | null
  transition_metadata?: unknown
  updated_at?: string
}>(rows: T[]): T[] {
  const visible = rows.filter(row => {
    const reconcile = metadataString(row.transition_metadata, 'reconcile_status')
    return reconcile !== 'DUPLICATE_RECONCILED'
  })

  const groups = new Map<string, T[]>()
  for (const row of visible) {
    const requestId = metadataString(row.transition_metadata, 'template_application_request_id')
    const itemId = metadataString(row.transition_metadata, 'template_item_id')
    const hasChecklist = Array.isArray(row.checklist) && row.checklist.length > 0
    // Só colapsa legado item-a-item. Linha com checklist já é o card canônico.
    const key = requestId
      ? `${requestId}|${row.origem_ref_id ?? 'NONE'}|${row.scope_id}|${hasChecklist && !itemId ? row.id : 'legacy'}`
      : itemId
        ? `legacy|${row.origem_ref_id ?? 'NONE'}|${row.scope_id}`
        : `solo|${row.id}`
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  const collapsed: T[] = []
  for (const group of groups.values()) {
    if (group.length === 1) {
      collapsed.push(group[0])
      continue
    }
    const sorted = [...group].sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')))
    const canonical = sorted[0]
    const checklist = sorted.map(row => ({
      titulo: row.acao,
      status: ['concluida', 'concluído', 'concluido'].includes(normalizeActionPlanStatus(row.status))
        ? 'concluida'
        : 'pendente',
      template_item_id: metadataString(row.transition_metadata, 'template_item_id'),
    }))
    const done = checklist.filter(item => item.status === 'concluida').length
    const progresso = checklist.length ? Math.round((done / checklist.length) * 100) : canonical.progresso
    collapsed.push({
      ...canonical,
      checklist,
      progresso,
      status: done === checklist.length && checklist.length > 0 ? 'concluida' : canonical.status,
    })
  }

  return collapsed
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
    .select('id, status, progresso, scope_id, acao, checklist, origem_ref_id, transition_metadata, updated_at')
    .eq('scope_type', 'store')
    .in('scope_id', scopeIds)
    .limit(300)
  if (error) return { summary: summarizeClientActionPlans([]), error: error.message }
  const collapsed = collapseClientActionPlanRows((data ?? []) as ClientActionPlanRow[])
  return {
    summary: summarizeClientActionPlans(collapsed),
    error: unitsResult.error,
  }
}
