import { supabase } from '@/lib/supabase'
import { activeUnits, fetchClientOfStore, fetchClientUnits, type ClientUnit } from '@/features/strategic-plan'
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
  storeIds: string[]
  requestId: string
  items: PersistedTemplateItem[]
}): Promise<boolean> {
  const { data, error } = await supabase
    .from('planos_acao')
    .select('id, scope_id, transition_metadata')
    .eq('scope_type', 'store')
    .in('scope_id', input.storeIds)
    .eq('origem_ref_id', input.versionId)
    .eq('origem_ref_table', 'planos_acao_template_versoes')
    .contains('transition_metadata', { template_application_request_id: input.requestId })

  if (error) return false

  // Um replay só é replay se TODAS as unidades da requisição tiverem TODOS os
  // itens materializados. Confirmar por unidade isolada esconderia uma aplicação
  // que parou no meio.
  const materialized = new Set(
    (data ?? [])
      .map(row => {
        const itemId = metadataItemId(row.transition_metadata)
        return itemId ? `${row.scope_id}|${itemId}` : null
      })
      .filter((value): value is string => Boolean(value)),
  )
  return input.storeIds.every(storeId => input.items.every(item => materialized.has(`${storeId}|${item.id}`)))
}

/**
 * Monta as linhas de `planos_acao` de uma aplicação.
 *
 * Um plano padrão é aplicado ao cliente, não a uma loja avulsa: cada unidade
 * ativa recebe a sua materialização dos mesmos itens, todas compartilhando o
 * mesmo `template_application_request_id`. É uma aplicação lógica com N
 * materializações — o trabalho é executado na loja, mas a decisão é do cliente.
 *
 * O escopo continua `store` porque `score_scope_type` não tem valor de cliente;
 * o vínculo com o cliente se lê pela hierarquia matriz/filial das unidades.
 */
export function buildTemplateApplicationRows(input: {
  items: PersistedTemplateItem[]
  storeIds: string[]
  versionId: string
  requestId: string
  userId: string
  appliedAt: Date
  responsibleId?: string | null
  deadlineDays?: number | null
  indicator?: string | null
}) {
  const deadline = input.deadlineDays && input.deadlineDays > 0
    ? resolveItemDueDate(input.appliedAt, input.deadlineDays)
    : null
  const rows = []
  for (const storeId of input.storeIds) {
    for (const item of input.items) {
      rows.push({
        scope_type: 'store' as const,
        scope_id: storeId,
        departamento: item.departamento || 'Geral',
        indicador: input.indicator || item.indicador || 'Não definido',
        problema: item.problema,
        acao: item.acao,
        como: item.como || null,
        prazo: deadline || resolveItemDueDate(input.appliedAt, item.prazo_dias),
        prioridade: item.prioridade,
        origem: 'consultor' as const,
        origem_ref_id: input.versionId,
        origem_ref_table: 'planos_acao_template_versoes',
        evidence_required: item.evidencia_requerida,
        created_by: input.userId,
        responsavel_id: input.responsibleId || null,
        transition_metadata: {
          template_application_request_id: input.requestId,
          template_item_id: item.id,
        },
      })
    }
  }
  return rows
}

/**
 * Unidades que devem receber a aplicação de um plano padrão a partir da loja
 * escolhida: todas as unidades ativas do cliente dono dela.
 *
 * Loja sem cliente vinculado aplica só nela mesma — é o comportamento anterior,
 * preservado para não travar quem ainda não tem cliente cadastrado.
 */
export async function resolveApplicationTargets(
  storeId: string,
): Promise<{ units: ClientUnit[]; storeIds: string[]; clientId: string | null }> {
  const client = await fetchClientOfStore(storeId)
  if (!client.clientId) return { units: [], storeIds: [storeId], clientId: null }

  const result = await fetchClientUnits(client.clientId)
  const actives = activeUnits(result.units)
  if (actives.length === 0) return { units: [], storeIds: [storeId], clientId: client.clientId }

  return { units: actives, storeIds: actives.map(unit => unit.id), clientId: client.clientId }
}

/** Resolve diretamente o cliente escolhido no wizard, sem aceitar loja de outro cliente. */
export async function resolveClientApplicationTargets(
  clientId: string,
): Promise<{ units: ClientUnit[]; storeIds: string[]; clientId: string; error: string | null }> {
  const result = await fetchClientUnits(clientId)
  if (result.error) return { units: [], storeIds: [], clientId, error: result.error }

  const units = activeUnits(result.units)
  if (!units.length) {
    return { units: [], storeIds: [], clientId, error: 'O cliente não possui matriz ou filial ativa vinculada.' }
  }

  return { units, storeIds: units.map(unit => unit.id), clientId, error: null }
}

/**
 * Materializa uma versão publicada de Plano Padrão com idempotência por
 * requestId. O banco possui índice UNIQUE parcial por request/item; um retry
 * após timeout recebe 23505 e só é tratado como replay se todos os itens da
 * requisição anterior puderem ser comprovados no banco.
 */
export async function applyTemplateToStoresIdempotent(input: {
  versionId: string
  storeIds: string[]
  userId: string
  requestId: string
  appliedAt?: Date
  responsibleId?: string | null
  deadlineDays?: number | null
  indicator?: string | null
}): Promise<{ error: string | null; created: number; replayed: boolean }> {
  if (input.storeIds.length === 0) {
    return { error: 'Nenhuma unidade de destino para aplicar.', created: 0, replayed: false }
  }

  const rawItems = await fetchTemplateItems(input.versionId)
  if (!rawItems.length) return { error: 'A versão selecionada não tem itens.', created: 0, replayed: false }
  if (!rawItems.every(isPersistedTemplateItem)) {
    return { error: 'A versão possui item sem identificador persistido. Recarregue a biblioteca e tente novamente.', created: 0, replayed: false }
  }

  const items = rawItems as PersistedTemplateItem[]
  const rows = buildTemplateApplicationRows({
    items,
    storeIds: input.storeIds,
    versionId: input.versionId,
    requestId: input.requestId,
    userId: input.userId,
    appliedAt: input.appliedAt ?? new Date(),
    responsibleId: input.responsibleId,
    deadlineDays: input.deadlineDays,
    indicator: input.indicator,
  })

  const { error } = await supabase.from('planos_acao').insert(rows)

  if (!error) return { error: null, created: rows.length, replayed: false }

  if (error.code === '23505') {
    const replayConfirmed = await resolveConfirmedReplay({
      versionId: input.versionId,
      storeIds: input.storeIds,
      requestId: input.requestId,
      items,
    })
    if (replayConfirmed) return { error: null, created: rows.length, replayed: true }
  }

  return { error: error.message, created: 0, replayed: false }
}

/** Aplicação a uma única unidade. Mantida para chamadas que já resolveram o destino. */
export async function applyTemplateToStoreIdempotent(input: {
  versionId: string
  storeId: string
  userId: string
  requestId: string
  appliedAt?: Date
}): Promise<{ error: string | null; created: number; replayed: boolean }> {
  return applyTemplateToStoresIdempotent({
    versionId: input.versionId,
    storeIds: [input.storeId],
    userId: input.userId,
    requestId: input.requestId,
    appliedAt: input.appliedAt,
  })
}
