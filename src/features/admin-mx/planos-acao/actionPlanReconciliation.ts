import { supabase } from '@/lib/supabase'

export type PartialApplicationIssue =
  | 'MISSING_TEMPLATE_VERSION'
  | 'MISSING_RESPONSIBLE'
  | 'NO_ITEMS'

type TemplateApplicationRow = {
  id: string
  scope_id: string
  origem_ref_id: string | null
  responsavel_id: string | null
  transition_metadata: unknown
}

type ReconciliationCandidateRow = TemplateApplicationRow & {
  status: string
}

export type PotentialDuplicateApplicationGroup = {
  groupKey: string
  versionId: string
  storeId: string
  requestIds: string[]
  planIdsByRequest: Record<string, string[]>
}

export type DuplicateReconciliationUpdate = {
  planId: string
  transitionMetadata: Record<string, unknown>
}

type ApplicationReconciliationRpcResult = {
  candidate_count?: number
  reconciled_count?: number
  plan_ids?: string[]
}

type DraftReconciliationRpcResult = {
  candidate_count?: number
  archived_count?: number
  version_ids?: string[]
}

type TemplateDraftVersionRow = {
  id: string
  template_id: string
  versao: number
  status: string
  notas: string | null
  updated_at: string
  itemCount: number
}

export type DuplicateDraftGroup = {
  templateId: string
  canonicalId: string
  duplicateIds: string[]
}

export type PartialTemplateApplication = {
  applicationKey: string
  requestId: string | null
  versionId: string | null
  storeId: string
  planIds: string[]
  issues: PartialApplicationIssue[]
  expectedItemCount: number
  materializedItemCount: number
  missingItemIds: string[]
}

function metadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function logicalApplicationKey(row: TemplateApplicationRow): string {
  const requestId = metadataString(row.transition_metadata, 'template_application_request_id')
  if (requestId) return `${requestId}|${row.origem_ref_id ?? 'NONE'}|${row.scope_id}`

  // Aplicações anteriores à idempotência não possuem request id. Agrupar por
  // versão e unidade ainda permite diagnosticar o conjunto sem tratar cada
  // item materializado como uma aplicação independente.
  return `legacy|${row.origem_ref_id ?? 'NONE'}|${row.scope_id}`
}

/**
 * Detecta aplicações incompletas no modelo MX, em que cada item do template é
 * uma linha de `planos_acao` (não uma entidade filha do plano).
 */
export function detectPartialApplicationRows(
  rows: TemplateApplicationRow[],
  expectedItemsByVersion: ReadonlyMap<string, ReadonlySet<string>>,
): PartialTemplateApplication[] {
  const groups = new Map<string, TemplateApplicationRow[]>()
  for (const row of rows) {
    const key = logicalApplicationKey(row)
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  const partial: PartialTemplateApplication[] = []
  for (const [applicationKey, group] of groups) {
    const first = group[0]
    const versionId = first.origem_ref_id
    const requestId = metadataString(first.transition_metadata, 'template_application_request_id')
    const expected = versionId ? expectedItemsByVersion.get(versionId) ?? new Set<string>() : new Set<string>()
    const materialized = new Set(
      group
        .map(row => metadataString(row.transition_metadata, 'template_item_id'))
        .filter((itemId): itemId is string => Boolean(itemId)),
    )
    const missingItemIds = [...expected].filter(itemId => !materialized.has(itemId))
    const issues: PartialApplicationIssue[] = []

    if (!versionId) issues.push('MISSING_TEMPLATE_VERSION')
    if (group.some(row => !row.responsavel_id)) issues.push('MISSING_RESPONSIBLE')
    if (materialized.size === 0 || expected.size === 0 || missingItemIds.length > 0) issues.push('NO_ITEMS')

    if (issues.length > 0) {
      partial.push({
        applicationKey,
        requestId,
        versionId,
        storeId: first.scope_id,
        planIds: group.map(row => row.id),
        issues,
        expectedItemCount: expected.size,
        materializedItemCount: materialized.size,
        missingItemIds,
      })
    }
  }

  return partial
}

/** Leitura diagnóstica. Não altera, cancela nem exclui planos. */
export async function detectPartialApplications(input: { limit?: number } = {}): Promise<{
  partialCount: number
  partial: PartialTemplateApplication[]
  error: string | null
}> {
  const { data: plans, error } = await supabase
    .from('planos_acao')
    .select('id, scope_id, origem_ref_id, responsavel_id, transition_metadata')
    .eq('origem_ref_table', 'planos_acao_template_versoes')
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 500)

  if (error) return { partialCount: 0, partial: [], error: error.message }

  const rows = (plans ?? []) as TemplateApplicationRow[]
  const versionIds = [...new Set(rows.map(row => row.origem_ref_id).filter((id): id is string => Boolean(id)))]
  const { data: items, error: itemsError } = versionIds.length
    ? await supabase.from('planos_acao_template_itens').select('id, version_id').in('version_id', versionIds)
    : { data: [] as Array<{ id: string; version_id: string }>, error: null }

  if (itemsError) return { partialCount: 0, partial: [], error: itemsError.message }

  const expectedItemsByVersion = new Map<string, Set<string>>()
  for (const item of items ?? []) {
    expectedItemsByVersion.set(item.version_id, new Set([...(expectedItemsByVersion.get(item.version_id) ?? []), item.id]))
  }

  const partial = detectPartialApplicationRows(rows, expectedItemsByVersion)
  return { partialCount: partial.length, partial, error: null }
}

function metadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...(metadata as Record<string, unknown>) }
    : {}
}

/**
 * Sinaliza grupos que merecem revisão humana, sem afirmar que são duplicados.
 * Request IDs diferentes podem representar reaplicações deliberadas.
 */
export function findPotentialDuplicateApplications(rows: ReconciliationCandidateRow[]): PotentialDuplicateApplicationGroup[] {
  const groups = new Map<string, Map<string, string[]>>()
  for (const row of rows) {
    if (row.status === 'cancelada' || !row.origem_ref_id) continue
    if (metadataString(row.transition_metadata, 'reconcile_status') === 'DUPLICATE_RECONCILED') continue
    const requestId = metadataString(row.transition_metadata, 'template_application_request_id')
    if (!requestId) continue
    const groupKey = `${row.origem_ref_id}|${row.scope_id}`
    const requests = groups.get(groupKey) ?? new Map<string, string[]>()
    requests.set(requestId, [...(requests.get(requestId) ?? []), row.id])
    groups.set(groupKey, requests)
  }

  return [...groups.entries()].flatMap(([groupKey, requests]) => {
    if (requests.size <= 1) return []
    const [versionId, storeId] = groupKey.split('|')
    return [{
      groupKey,
      versionId,
      storeId,
      requestIds: [...requests.keys()].sort(),
      planIdsByRequest: Object.fromEntries([...requests.entries()].sort(([a], [b]) => a.localeCompare(b))),
    }]
  })
}

/** Leitura diagnóstica de possíveis duplicatas; nunca altera planos. */
export async function detectPotentialDuplicateApplications(input: { limit?: number } = {}): Promise<{
  groups: PotentialDuplicateApplicationGroup[]
  error: string | null
}> {
  const { data, error } = await supabase
    .from('planos_acao')
    .select('id, scope_id, origem_ref_id, responsavel_id, transition_metadata, status')
    .eq('origem_ref_table', 'planos_acao_template_versoes')
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 500)

  if (error) return { groups: [], error: error.message }
  return { groups: findPotentialDuplicateApplications((data ?? []) as ReconciliationCandidateRow[]), error: null }
}

/**
 * Produz as marcações de reconciliação sem apagar histórico. A seleção exige
 * request IDs explícitos: versões iguais podem ser reaplicadas de propósito e
 * não devem ser classificadas como duplicadas apenas por semelhança.
 */
export function buildDuplicateReconciliationUpdates(input: {
  rows: ReconciliationCandidateRow[]
  canonicalRequestId: string
  duplicateRequestIds: string[]
  requestedBy: string
  reconciledAt: string
}): DuplicateReconciliationUpdate[] {
  const duplicateIds = new Set(input.duplicateRequestIds.filter(id => id !== input.canonicalRequestId))
  return input.rows.flatMap(row => {
    if (row.status === 'cancelada') return []
    const requestId = metadataString(row.transition_metadata, 'template_application_request_id')
    if (!requestId || !duplicateIds.has(requestId)) return []

    return [{
      planId: row.id,
      transitionMetadata: {
        ...metadataRecord(row.transition_metadata),
        reconcile_status: 'DUPLICATE_RECONCILED',
        duplicate_of_request_id: input.canonicalRequestId,
        reconciled_at: input.reconciledAt,
        reconciled_by: input.requestedBy,
      },
    }]
  })
}

/**
 * Reconcilia somente aplicações escolhidas explicitamente. As linhas são
 * canceladas e recebem metadata auditável; nenhuma linha é excluída.
 */
export async function reconcileDuplicatedTemplateApplications(input: {
  versionId: string
  storeIds: string[]
  canonicalRequestId: string
  duplicateRequestIds: string[]
  reason: string
  dryRun?: boolean
}): Promise<{ candidateCount: number; reconciledCount: number; planIds: string[]; error: string | null }> {
  if (!input.reason.trim()) {
    return { candidateCount: 0, reconciledCount: 0, planIds: [], error: 'Informe o motivo da reconciliação.' }
  }
  if (!input.storeIds.length || !input.duplicateRequestIds.length) {
    return { candidateCount: 0, reconciledCount: 0, planIds: [], error: null }
  }

  const { data, error } = await supabase.rpc('reconcile_action_plan_applications', {
    p_version_id: input.versionId,
    p_store_ids: input.storeIds,
    p_canonical_request_id: input.canonicalRequestId,
    p_duplicate_request_ids: input.duplicateRequestIds,
    p_reason: input.reason.trim(),
    p_dry_run: input.dryRun !== false,
  })
  if (error) return { candidateCount: 0, reconciledCount: 0, planIds: [], error: error.message }

  const result = (data ?? {}) as ApplicationReconciliationRpcResult
  return {
    candidateCount: result.candidate_count ?? 0,
    reconciledCount: result.reconciled_count ?? 0,
    planIds: result.plan_ids ?? [],
    error: null,
  }
}

/**
 * Escolhe um único rascunho por template. Prefere a versão com mais itens e,
 * em empate, maior número de versão e atualização mais recente.
 */
export function findDuplicatedTemplateDrafts(rows: TemplateDraftVersionRow[]): DuplicateDraftGroup[] {
  const byTemplate = new Map<string, TemplateDraftVersionRow[]>()
  for (const row of rows) {
    if (row.status !== 'rascunho') continue
    byTemplate.set(row.template_id, [...(byTemplate.get(row.template_id) ?? []), row])
  }

  return [...byTemplate.entries()].flatMap(([templateId, drafts]) => {
    if (drafts.length <= 1) return []
    const ordered = [...drafts].sort((a, b) =>
      b.itemCount - a.itemCount
      || b.versao - a.versao
      || Date.parse(b.updated_at) - Date.parse(a.updated_at),
    )
    return [{ templateId, canonicalId: ordered[0].id, duplicateIds: ordered.slice(1).map(row => row.id) }]
  })
}

/** Diagnóstico read-only de rascunhos duplicados. */
export async function detectDuplicatedActionPlanDrafts(): Promise<{
  groups: DuplicateDraftGroup[]
  error: string | null
}> {
  const { data: versions, error } = await supabase
    .from('planos_acao_template_versoes')
    .select('id, template_id, versao, status, notas, updated_at, planos_acao_template_itens(id)')
    .eq('status', 'rascunho')
  if (error) return { groups: [], error: error.message }

  const rows: TemplateDraftVersionRow[] = (versions ?? []).map(version => ({
    id: version.id,
    template_id: version.template_id,
    versao: version.versao,
    status: version.status,
    notas: version.notas,
    updated_at: version.updated_at,
    itemCount: version.planos_acao_template_itens?.length ?? 0,
  }))
  return { groups: findDuplicatedTemplateDrafts(rows), error: null }
}

/** Arquiva apenas os rascunhos escolhidos, por RPC atômica e dry-run por padrão. */
export async function reconcileDuplicatedActionPlanDrafts(input: {
  templateId: string
  canonicalId: string
  duplicateIds: string[]
  reason: string
  dryRun?: boolean
}): Promise<{ candidateCount: number; archivedCount: number; versionIds: string[]; error: string | null }> {
  if (!input.reason.trim()) {
    return { candidateCount: 0, archivedCount: 0, versionIds: [], error: 'Informe o motivo da reconciliação.' }
  }
  if (!input.duplicateIds.length) {
    return { candidateCount: 0, archivedCount: 0, versionIds: [], error: null }
  }

  const { data, error } = await supabase.rpc('reconcile_action_plan_template_drafts', {
    p_template_id: input.templateId,
    p_canonical_version_id: input.canonicalId,
    p_duplicate_version_ids: input.duplicateIds,
    p_reason: input.reason.trim(),
    p_dry_run: input.dryRun !== false,
  })
  if (error) return { candidateCount: 0, archivedCount: 0, versionIds: [], error: error.message }

  const result = (data ?? {}) as DraftReconciliationRpcResult
  return {
    candidateCount: result.candidate_count ?? 0,
    archivedCount: result.archived_count ?? 0,
    versionIds: result.version_ids ?? [],
    error: null,
  }
}
