import { supabase } from '@/lib/supabase'
import { fetchTemplateItems, resolveItemDueDate, type ActionPlanTemplateItem } from './actionPlanTemplates'

const APPLICATION_STORAGE_PREFIX = 'mx:action-template-apply'

type PersistedTemplateItem = ActionPlanTemplateItem & { id: string }

function isPersistedTemplateItem(item: ActionPlanTemplateItem): item is PersistedTemplateItem {
  return typeof item.id === 'string' && item.id.length > 0
}

function metadataItemId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const value = (metadata as Record<string, unknown>).template_item_id
  return typeof value === 'string' ? value : null
}

export function buildTemplateApplicationStorageKey(versionId: string, storeId: string): string {
  return `${APPLICATION_STORAGE_PREFIX}:${versionId}:${storeId}`
}

export function createTemplateApplicationRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

async function resolveConfirmedReplay(input: {
  versionId: string
  storeId: string
  requestId: string
  items: PersistedTemplateItem[]
}): Promise<boolean> {
  const { data, error } = await supabase
    .from('planos_acao')
    .select('id, transition_metadata')
    .eq('scope_type', 'store')
    .eq('scope_id', input.storeId)
    .eq('origem_ref_id', input.versionId)
    .eq('origem_ref_table', 'planos_acao_template_versoes')
    .contains('transition_metadata', { template_application_request_id: input.requestId })

  if (error) return false

  const materializedItemIds = new Set((data ?? []).map(row => metadataItemId(row.transition_metadata)).filter((value): value is string => Boolean(value)))
  return input.items.every(item => materializedItemIds.has(item.id))
}

/**
 * Materializa uma versão publicada de Plano Padrão com idempotência por
 * requestId. O banco possui índice UNIQUE parcial por request/item; um retry
 * após timeout recebe 23505 e só é tratado como replay se todos os itens da
 * requisição anterior puderem ser comprovados no banco.
 */
export async function applyTemplateToStoreIdempotent(input: {
  versionId: string
  storeId: string
  userId: string
  requestId: string
  appliedAt?: Date
}): Promise<{ error: string | null; created: number; replayed: boolean }> {
  const rawItems = await fetchTemplateItems(input.versionId)
  if (!rawItems.length) return { error: 'A versão selecionada não tem itens.', created: 0, replayed: false }
  if (!rawItems.every(isPersistedTemplateItem)) {
    return { error: 'A versão possui item sem identificador persistido. Recarregue a biblioteca e tente novamente.', created: 0, replayed: false }
  }

  const items = rawItems as PersistedTemplateItem[]
  const appliedAt = input.appliedAt ?? new Date()
  const { error } = await supabase.from('planos_acao').insert(
    items.map(item => ({
      scope_type: 'store' as const,
      scope_id: input.storeId,
      departamento: item.departamento || 'Geral',
      indicador: item.indicador || 'Não definido',
      problema: item.problema,
      acao: item.acao,
      como: item.como || null,
      prazo: resolveItemDueDate(appliedAt, item.prazo_dias),
      prioridade: item.prioridade,
      origem: 'consultor' as const,
      origem_ref_id: input.versionId,
      origem_ref_table: 'planos_acao_template_versoes',
      evidence_required: item.evidencia_requerida,
      created_by: input.userId,
      transition_metadata: {
        template_application_request_id: input.requestId,
        template_item_id: item.id,
      },
    })),
  )

  if (!error) return { error: null, created: items.length, replayed: false }

  if (error.code === '23505') {
    const replayConfirmed = await resolveConfirmedReplay({
      versionId: input.versionId,
      storeId: input.storeId,
      requestId: input.requestId,
      items,
    })
    if (replayConfirmed) return { error: null, created: items.length, replayed: true }
  }

  return { error: error.message, created: 0, replayed: false }
}
