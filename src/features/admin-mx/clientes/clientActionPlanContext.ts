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
  linked_plan_ids?: string[]
}

export type ClientActionPlanSummary = {
  total: number
  open: number
  completed: number
  blocked: number
  cancelled: number
  averageProgress: number
  naoIniciadas: number
  emAndamento: number
  atrasadas: number
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
    concluido: 'Concluída',
    cancelada: 'Cancelada',
    em_validacao: 'Em validação',
  }
  const normalized = normalizeActionPlanStatus(value)
  return labels[normalized] ?? (value?.trim() || 'Status não informado')
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

const COMPLETED_PLAN_STATUSES = new Set(['concluida', 'concluído', 'concluido'])

function actionFingerprint(row: { scope_id: string; acao: string; indicador?: string | null }): string {
  return `${row.scope_id}|${String(row.acao ?? '').trim().toLowerCase()}|${String(row.indicador ?? '').trim().toLowerCase()}`
}

function statusRank(status: string): number {
  const normalized = normalizeActionPlanStatus(status)
  if (COMPLETED_PLAN_STATUSES.has(normalized)) return 4
  if (normalized === 'em_andamento') return 3
  if (normalized === 'atrasado') return 2
  if (normalized === 'bloqueada' || normalized === 'bloqueado') return 1
  return 0
}

/**
 * Um plano aplicado = um card.
 * Modelo novo: 1 linha/loja com checklist.
 * Modelo legado: 1 linha por item do template → colapsar por request+loja
 * (ou versão+loja) e sintetizar checklist.
 * Retries do wizard na mesma loja/ação/indicador viram um card.
 */
export function collapseClientActionPlanRows<T extends {
  id: string
  acao: string
  status: string
  progresso: number
  scope_id: string
  indicador?: string | null
  checklist?: unknown
  origem_ref_id?: string | null
  transition_metadata?: unknown
  updated_at?: string
  scope_name?: string | null
  linked_plan_ids?: string[]
}>(rows: T[]): T[] {
  const visible = rows.filter(row => {
    const reconcile = metadataString(row.transition_metadata, 'reconcile_status')
    return reconcile !== 'DUPLICATE_RECONCILED'
  })

  const clientAppScopes = new Map<string, Set<string>>()
  for (const row of visible) {
    const clientAppId = metadataString(row.transition_metadata, 'client_application_request_id')
    if (!clientAppId) continue
    const scopes = clientAppScopes.get(clientAppId) ?? new Set<string>()
    scopes.add(row.scope_id)
    clientAppScopes.set(clientAppId, scopes)
  }

  const groups = new Map<string, T[]>()
  for (const row of visible) {
    const clientAppId = metadataString(row.transition_metadata, 'client_application_request_id')
    const requestId = metadataString(row.transition_metadata, 'template_application_request_id')
    const itemId = metadataString(row.transition_metadata, 'template_item_id')
    const hasChecklist = Array.isArray(row.checklist) && row.checklist.length > 0
    const multiStoreApp = Boolean(clientAppId && (clientAppScopes.get(clientAppId)?.size ?? 0) > 1)
    const key = multiStoreApp
      ? `clientapp|${clientAppId}`
      : requestId
        ? `${requestId}|${row.origem_ref_id ?? 'NONE'}|${row.scope_id}|${hasChecklist && !itemId ? row.id : 'legacy'}`
        : itemId
          ? `legacy|${row.origem_ref_id ?? 'NONE'}|${row.scope_id}`
          : `fingerprint|${actionFingerprint(row)}`
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  const collapsed: T[] = []
  for (const group of groups.values()) {
    if (group.length === 1) {
      collapsed.push({ ...group[0], linked_plan_ids: [group[0].id] })
      continue
    }
    const byUpdated = [...group].sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')))
    const isLegacySplit = group.some(row => Boolean(metadataString(row.transition_metadata, 'template_item_id')))
    const canonical = isLegacySplit
      ? byUpdated[0]
      : [...group].sort((a, b) => {
        const rank = statusRank(b.status) - statusRank(a.status)
        if (rank !== 0) return rank
        const progress = (b.progresso ?? 0) - (a.progresso ?? 0)
        if (progress !== 0) return progress
        return String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? ''))
      })[0]
    if (!isLegacySplit) {
      const names = [...new Set(group.map(row => row.scope_name).filter((name): name is string => Boolean(name)))]
      collapsed.push({
        ...canonical,
        linked_plan_ids: group.map(row => row.id),
        scope_name: names.join(' · ') || canonical.scope_name,
      })
      continue
    }
    const checklist = byUpdated.map(row => ({
      titulo: row.acao,
      status: COMPLETED_PLAN_STATUSES.has(normalizeActionPlanStatus(row.status))
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
      linked_plan_ids: group.map(row => row.id),
    })
  }

  return collapsed
}

export function summarizeClientActionPlans(rows: Array<Pick<ClientActionPlanRow, 'status' | 'progresso' | 'prazo'>>): ClientActionPlanSummary {
  const today = new Date().toISOString().slice(0, 10)
  const completed = rows.filter(row => COMPLETED_PLAN_STATUSES.has(normalizeActionPlanStatus(row.status))).length
  const blocked = rows.filter(row => ['bloqueada', 'bloqueado'].includes(normalizeActionPlanStatus(row.status))).length
  const cancelled = rows.filter(row => ['cancelada', 'cancelado'].includes(normalizeActionPlanStatus(row.status))).length
  const naoIniciadas = rows.filter(row => normalizeActionPlanStatus(row.status) === 'pendente').length
  const emAndamento = rows.filter(row => normalizeActionPlanStatus(row.status) === 'em_andamento').length
  const atrasadas = rows.filter(row => {
    const status = normalizeActionPlanStatus(row.status)
    if (COMPLETED_PLAN_STATUSES.has(status) || ['cancelada', 'cancelado', 'bloqueada', 'bloqueado'].includes(status)) return false
    return Boolean(row.prazo && row.prazo < today)
  }).length
  const open = rows.length - completed - blocked - cancelled
  const averageProgress = rows.length ? Math.round(rows.reduce((sum, row) => sum + Math.max(0, Math.min(100, row.progresso ?? 0)), 0) / rows.length) : 0
  return { total: rows.length, open, completed, blocked, cancelled, averageProgress, naoIniciadas, emAndamento, atrasadas }
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
    .select('id, status, progresso, prazo, scope_id, acao, indicador, checklist, origem_ref_id, transition_metadata, updated_at')
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
