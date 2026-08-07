/**
 * Repositório Supabase do Mentor Comercial (TAREFA A01).
 *
 * TODO: Mover a unidade transacional do Mentor para uma RPC SQL `SECURITY DEFINER`
 * no Supabase. O client supabase-js não suporta transações multi-statement no client.
 * Por isso, `runInTransaction` executa as operações em ordem e captura falhas para
 * tratamento, mas a garantia atômica definitiva será provida via RPC no banco.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseClient } from '../../../lib/supabase'
import type {
  CentralActionUpsert,
  HistoryEntry,
  MentorRepository,
  OpportunityRef,
  ScoreSnapshotEntry,
} from '../application/mentorApplicationService'
import type { CadenceState } from '../engine/cadence'
import type {
  CadenceDefinition,
  MentorDecision,
  OpportunityFacts,
  RuleCatalog,
  StatusDefinition,
  StoreSettings,
} from '../engine/engine'
import type { TransitionRule } from '../engine/transition'

export class SupabaseMentorRepository implements MentorRepository {
  private client: SupabaseClient
  private catalogCache = new Map<string, RuleCatalog>()

  constructor(client?: SupabaseClient) {
    this.client = client ?? getSupabaseClient()
  }

  async loadCatalog(ruleVersion: string): Promise<RuleCatalog> {
    const cached = this.catalogCache.get(ruleVersion)
    if (cached) return cached

    const [statusesRes, cadencesRes, stepsRes, scriptsRes, transitionsRes] = await Promise.all([
      this.client
        .from('mentor_status_definitions')
        .select('*')
        .eq('rule_version', ruleVersion)
        .eq('active', true),
      this.client
        .from('mentor_cadences')
        .select('*')
        .eq('rule_version', ruleVersion)
        .eq('active', true),
      this.client
        .from('mentor_cadence_steps')
        .select('*')
        .eq('rule_version', ruleVersion)
        .eq('active', true)
        .order('step_order', { ascending: true }),
      this.client
        .from('mentor_scripts')
        .select('*')
        .eq('rule_version', ruleVersion)
        .eq('active', true),
      this.client
        .from('mentor_transitions')
        .select('*')
        .eq('rule_version', ruleVersion)
        .eq('active', true),
    ])

    if (statusesRes.error) throw statusesRes.error
    if (cadencesRes.error) throw cadencesRes.error
    if (stepsRes.error) throw stepsRes.error
    if (scriptsRes.error) throw scriptsRes.error
    if (transitionsRes.error) throw transitionsRes.error

    const statuses: StatusDefinition[] = (statusesRes.data ?? []).map((row) => ({
      statusId: row.status_code,
      channel: row.channel,
      family: row.family,
      label: row.label,
      definition: row.definition ?? null,
      origin: row.origin ?? null,
      responsible: row.responsible,
      temperature: row.temperature ?? null,
      objective: row.objective,
      nextStep: row.next_step,
      cadenceId: row.cadence_ref ?? null,
      scriptId: row.script_ref ?? null,
      potential: row.potential ?? null,
      centralRule: row.central_rule ?? null,
      activeInPortfolio: row.active_in_portfolio ?? null,
      mentorGuidance: row.mentor_guidance ?? null,
      mainResults: row.main_results ?? null,
      notes: row.notes ?? null,
    }))

    const cadences: CadenceDefinition[] = (cadencesRes.data ?? []).map((row) => ({
      cadenceId: row.cadence_code,
      attempts: row.attempts_label ?? '',
      dayPattern: row.day_pattern ?? '',
    }))

    const cadenceSteps = (stepsRes.data ?? []).map((row) => ({
      cadenceId: row.cadence_code,
      attempt: row.attempt_label,
      offset: row.offset_label,
    }))

    const scriptIds = new Set((scriptsRes.data ?? []).map((row) => row.script_code as string))

    const transitions: TransitionRule[] = (transitionsRes.data ?? []).map((row) => ({
      family: row.family ?? null,
      fromStatusOrContext: row.from_status_or_context ?? null,
      result: row.result ?? null,
      toStatus: row.to_status ?? null,
      decisionNotes: row.decision_notes ?? null,
    }))

    const catalog: RuleCatalog = {
      version: ruleVersion,
      statuses,
      cadences,
      cadenceSteps,
      scriptIds,
      transitions,
    }

    this.catalogCache.set(ruleVersion, catalog)
    return catalog
  }

  async loadStoreSettings(storeId: string): Promise<StoreSettings> {
    const { data, error } = await this.client
      .from('store_commercial_settings')
      .select('seller_response_sla_minutes, post_sale_enabled, warranty_followup_enabled')
      .eq('loja_id', storeId)
      .maybeSingle()

    if (error || !data) {
      return {
        sellerResponseSlaMinutes: null,
        postSaleEnabled: false,
        warrantyFollowupEnabled: false,
      }
    }

    return {
      sellerResponseSlaMinutes: data.seller_response_sla_minutes ?? null,
      postSaleEnabled: data.post_sale_enabled ?? false,
      warrantyFollowupEnabled: data.warranty_followup_enabled ?? false,
    }
  }

  async loadFacts(ref: OpportunityRef): Promise<OpportunityFacts> {
    const [opRes, cadRes, flagsRes] = await Promise.all([
      this.client
        .from('oportunidades')
        .select('*')
        .eq('id', ref.opportunityId)
        .maybeSingle(),
      this.client
        .from('cadencia_estado_cliente')
        .select('*')
        .eq('oportunidade_id', ref.opportunityId)
        .eq('status', 'ativo')
        .maybeSingle(),
      this.client
        .from('mentor_pending_flags')
        .select('flag_code')
        .eq('oportunidade_id', ref.opportunityId)
        .eq('status', 'open'),
    ])

    if (opRes.error) throw opRes.error

    const op = opRes.data
    const cadRow = cadRes.data
    const flagsData = flagsRes.data ?? []

    let cadenceState: CadenceState | null = null
    if (cadRow?.historico && Array.isArray(cadRow.historico) && cadRow.historico.length > 0) {
      const rawState = cadRow.historico[cadRow.historico.length - 1] as Record<string, unknown>
      if (rawState && typeof rawState === 'object' && typeof rawState.cadenceId === 'string') {
        cadenceState = {
          cadenceId: rawState.cadenceId as string,
          currentAttempt: Number(rawState.currentAttempt ?? 1),
          totalAttempts: Number(rawState.totalAttempts ?? 1),
          pendingAttempts: Number(rawState.pendingAttempts ?? 0),
          status: (rawState.status as CadenceState['status']) ?? 'active',
          nextActionAt: rawState.nextActionAt ? new Date(rawState.nextActionAt as string) : null,
          startedAt: rawState.startedAt ? new Date(rawState.startedAt as string) : new Date(),
          responsible: (rawState.responsible as 'Vendedor' | 'Cliente') ?? 'Cliente',
          attackEligible: Boolean(rawState.attackEligible),
          steps: Array.isArray(rawState.steps) ? (rawState.steps as CadenceState['steps']) : [],
          lastIdempotencyKey: (rawState.lastIdempotencyKey as string | null) ?? null,
        }
      }
    }

    const statusCode = (op?.current_status_code as string) || (op?.status_code as string) || (op?.etapa as string) || ''
    const nextActionAt = op?.next_action_at ? new Date(op.next_action_at as string) : null
    const clientRespondedAt = op?.client_responded_at ? new Date(op.client_responded_at as string) : null
    const clientNeverResponded = Boolean(op?.client_never_responded)
    const appointmentAt = op?.appointment_at ? new Date(op.appointment_at as string) : null
    const cadenceAttempt = op?.current_cadence_step ?? cadenceState?.currentAttempt ?? 1
    const returnStatusCode = (op?.return_status_code as string) ?? null
    const pendingFlags = flagsData.map((f) => f.flag_code as string)

    const quality = {
      status: statusCode ? ('complete' as const) : ('undefined' as const),
      nextStep: op?.current_next_step && nextActionAt ? ('complete' as const) : op?.current_next_step ? ('partial' as const) : ('missing' as const),
      execution: clientRespondedAt
        ? ('awaitingSellerResponse' as const)
        : nextActionAt
        ? new Date().getTime() - nextActionAt.getTime() > 86400000
          ? ('lateOver24h' as const)
          : new Date().getTime() > nextActionAt.getTime()
          ? ('lateUnder24h' as const)
          : ('onTime' as const)
        : ('onTime' as const),
      cadence: cadenceState?.status === 'completedWithoutResponse' ? ('completedWithoutResponse' as const) : cadenceState?.status === 'active' ? ('respected' as const) : ('broken' as const),
      history: op?.last_interaction_at ? ('complete' as const) : ('stale' as const),
    }

    return {
      statusCode,
      nextActionAt,
      clientRespondedAt,
      clientNeverResponded,
      appointmentAt,
      cadenceAttempt,
      cadenceState,
      quality,
      pendingFlags,
      returnStatusCode,
    }
  }

  async saveOpportunityState(ref: OpportunityRef, decision: MentorDecision): Promise<void> {
    const { error } = await this.client
      .from('oportunidades')
      .update({
        current_status_code: decision.statusCode,
        previous_status_code: decision.previousStatusCode,
        return_status_code: decision.returnStatusCode,
        status_family: decision.family,
        current_responsible: decision.responsible,
        temperature: decision.temperature,
        current_objective: decision.objective,
        current_next_step: decision.nextStep,
        cadence_code: decision.cadenceCode,
        current_cadence_step: decision.cadenceStep,
        // ScriptResolution expõe `scriptId` e `reason`; só grava o código quando resolveu.
        current_script_code: decision.script.resolved ? decision.script.scriptId : null,
        next_action_at: decision.nextActionAt ? decision.nextActionAt.toISOString() : null,
        potential: decision.potential,
        mentor_score: decision.score.total,
        mentor_score_class: decision.score.classification,
        mentor_score_breakdown: decision.score.breakdown,
        priority_index: decision.priority.index,
        priority_class: decision.priority.classification,
        needs_mentor_classification: decision.requiresManualUpdate,
        mentor_rule_version: decision.ruleVersion,
        mentor_updated_at: new Date().toISOString(),
      })
      .eq('id', ref.opportunityId)

    if (error) throw error
  }

  async savePendingFlags(ref: OpportunityRef, flags: string[]): Promise<void> {
    const { data: existing, error: selectErr } = await this.client
      .from('mentor_pending_flags')
      .select('id, flag_code')
      .eq('oportunidade_id', ref.opportunityId)
      .eq('status', 'open')

    if (selectErr) throw selectErr

    const existingCodes = new Set((existing ?? []).map((e) => e.flag_code as string))
    const newFlags = flags.filter((f) => !existingCodes.has(f))
    const resolvedFlags = (existing ?? []).filter((e) => !flags.includes(e.flag_code as string))

    if (newFlags.length > 0) {
      const toInsert = newFlags.map((flag_code) => ({
        oportunidade_id: ref.opportunityId,
        loja_id: ref.storeId,
        seller_user_id: ref.sellerId,
        flag_code,
        status: 'open',
        opened_at: new Date().toISOString(),
      }))

      const { error: insertErr } = await this.client
        .from('mentor_pending_flags')
        .insert(toInsert)

      if (insertErr) throw insertErr
    }

    if (resolvedFlags.length > 0) {
      const resolvedIds = resolvedFlags.map((r) => r.id as string)
      const { error: updateErr } = await this.client
        .from('mentor_pending_flags')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .in('id', resolvedIds)

      if (updateErr) throw updateErr
    }
  }

  async saveCadenceState(ref: OpportunityRef, decision: MentorDecision): Promise<void> {
    if (!decision.cadenceState) return

    const cs = decision.cadenceState
    const statusDb = cs.status === 'active' ? 'ativo' : cs.status === 'interrupted' ? 'pausado' : 'concluido'

    const { data: existing, error: selectErr } = await this.client
      .from('cadencia_estado_cliente')
      .select('id')
      .eq('oportunidade_id', ref.opportunityId)
      .maybeSingle()

    if (selectErr) throw selectErr

    const payload = {
      oportunidade_id: ref.opportunityId,
      cliente_id: ref.clientId,
      loja_id: ref.storeId,
      seller_user_id: ref.sellerId,
      fluxo_id: '00000000-0000-0000-0000-000000000000',
      fluxo_version: 1,
      passo_atual_key: `attempt_${cs.currentAttempt}`,
      etapa_atual: cs.cadenceId,
      proxima_acao: decision.nextStep,
      proxima_acao_em: cs.nextActionAt ? cs.nextActionAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      status: statusDb,
      tentativas_passo: cs.currentAttempt,
      tentativa_limite: cs.totalAttempts,
      historico: [cs],
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { error } = await this.client
        .from('cadencia_estado_cliente')
        .update(payload)
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await this.client
        .from('cadencia_estado_cliente')
        .insert(payload)
      if (error) throw error
    }
  }

  async upsertCentralAction(action: CentralActionUpsert): Promise<void> {
    const mapPriority = (p: string) => {
      switch (p) {
        case 'Máxima':
          return 'urgent'
        case 'Alta':
          return 'high'
        case 'Média':
          return 'medium'
        case 'Baixa':
          return 'low'
        default:
          return 'medium'
      }
    }

    const mapActivityType = (type: string) => {
      const valid = [
        'atendimento', 'visita', 'retorno', 'documentacao', 'entrega', 'pos_venda',
        'aniversario', 'garantia', 'comercial', 'test_drive', 'negociacao',
        'pdi', 'feedback', 'funil',
      ]
      const lower = type.toLowerCase()
      return valid.includes(lower) ? lower : 'comercial'
    }

    const payload = {
      idempotency_key: action.idempotencyKey,
      source_type: 'manual',
      activity_type: mapActivityType(action.activityType),
      title: action.title,
      description: action.objective,
      due_at: action.dueAt.toISOString(),
      status: 'pendente',
      priority: mapPriority(action.priority),
      store_id: action.storeId,
      seller_id: action.sellerId,
      cliente_id: action.clientId,
      source_record_id: action.opportunityId,
      origin_module: 'mentor_comercial',
      active: true,
      updated_at: new Date().toISOString(),
    }

    const { error } = await this.client
      .from('execution_actions')
      .upsert(payload, { onConflict: 'idempotency_key' })

    if (error) throw error
  }

  async removeCentralAction(opportunityId: string, _reason: string): Promise<void> {
    const { error } = await this.client
      .from('execution_actions')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('source_record_id', opportunityId)
      .eq('active', true)

    if (error) throw error
  }

  async appendHistory(entry: HistoryEntry): Promise<void> {
    const payload = {
      cliente_id: entry.clientId,
      oportunidade_id: entry.opportunityId,
      loja_id: entry.storeId,
      seller_user_id: entry.sellerId,
      tipo_evento: entry.eventType,
      data_evento: entry.occurredAt.toISOString(),
      origem_modulo: 'mentor_comercial',
      observacao: entry.result ?? null,
      idempotency_key: entry.idempotencyKey,
      metadata: {
        previous_status_code: entry.previousStatusCode,
        status_code: entry.statusCode,
        result: entry.result,
      },
    }

    const { error } = await this.client
      .from('eventos_comerciais')
      .upsert(payload, { onConflict: 'idempotency_key', ignoreDuplicates: true })

    if (error) throw error
  }

  async appendScoreSnapshot(entry: ScoreSnapshotEntry): Promise<void> {
    const payload = {
      oportunidade_id: entry.opportunityId,
      loja_id: entry.storeId,
      seller_user_id: entry.sellerId,
      score: entry.score,
      score_class: entry.scoreClass,
      breakdown: entry.breakdown,
      priority_index: entry.priorityIndex,
      priority_class: entry.priorityClass,
      reason: entry.reason,
      rule_version: entry.ruleVersion,
      idempotency_key: entry.idempotencyKey,
    }

    const { error } = await this.client
      .from('mentor_score_snapshots')
      .upsert(payload, { onConflict: 'idempotency_key', ignoreDuplicates: true })

    if (error) throw error
  }

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return await work()
  }
}
