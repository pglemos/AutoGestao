import { supabase } from '@/lib/supabase'
import { collapseClientActionPlanRows } from './clientActionPlanContext'

type RawPlanRow = {
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
}

function metadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** Marca duplicatas óbvias do wizard (mesmo request + unidade) sem apagar histórico. */
export async function reconcileClientActionPlanDuplicates(
  scopeIds: string[],
  userId: string,
): Promise<{ reconciled: number; error: string | null }> {
  if (!scopeIds.length) return { reconciled: 0, error: null }

  const { data, error } = await supabase
    .from('planos_acao')
    .select('id, acao, status, progresso, scope_id, indicador, checklist, origem_ref_id, transition_metadata, updated_at')
    .eq('scope_type', 'store')
    .in('scope_id', scopeIds)
    .limit(500)

  if (error) return { reconciled: 0, error: error.message }

  const rows = (data ?? []) as RawPlanRow[]
  const visible = rows.filter(row => metadataString(row.transition_metadata, 'reconcile_status') !== 'DUPLICATE_RECONCILED')
  const groups = new Map<string, RawPlanRow[]>()

  for (const row of visible) {
    const requestId = metadataString(row.transition_metadata, 'client_application_request_id')
      ?? metadataString(row.transition_metadata, 'template_application_request_id')
    const key = requestId
      ? `${requestId}|${row.scope_id}`
      : `${row.scope_id}|${String(row.acao).trim().toLowerCase()}|${String(row.indicador ?? '').trim().toLowerCase()}`
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  const collapsed = collapseClientActionPlanRows(visible.map(row => ({ ...row, linked_plan_ids: [row.id] })))
  const canonicalIds = new Set(collapsed.flatMap(row => row.linked_plan_ids ?? [row.id]))
  let reconciled = 0

  for (const group of groups.values()) {
    if (group.length <= 1) continue
    const canonical = group.find(row => canonicalIds.has(row.id)) ?? group[0]
    for (const row of group) {
      if (row.id === canonical.id) continue
      const { error: patchError } = await supabase.rpc('atualizar_plano_acao_patch', {
        p_plano_id: row.id,
        p_patch: {
          status: 'cancelada',
          transition_metadata: {
            ...(typeof row.transition_metadata === 'object' && row.transition_metadata && !Array.isArray(row.transition_metadata)
              ? row.transition_metadata as Record<string, unknown>
              : {}),
            reconcile_status: 'DUPLICATE_RECONCILED',
            duplicate_of_plan_id: canonical.id,
            reconciled_at: new Date().toISOString(),
            reconciled_by: userId,
          },
        },
      })
      if (patchError) return { reconciled, error: patchError.message }
      reconciled += 1
    }
  }

  return { reconciled, error: null }
}
