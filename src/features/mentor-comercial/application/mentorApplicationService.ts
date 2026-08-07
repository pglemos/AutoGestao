/**
 * Application Service do Mentor Comercial (TASK 11).
 *
 * Orquestra a persistência ao redor do motor puro. O motor decide; esta camada
 * grava. Toda a escrita passa por uma porta (`MentorRepository`), para que a
 * ordem das operações e as invariantes sejam testáveis sem banco.
 *
 * Ordem obrigatória:
 *   carregar → decidir → persistir oportunidade → pending flags → cadência
 *   → action da Central (upsert idempotente) → histórico → snapshot de score
 *
 * Se qualquer etapa crítica falhar, a unidade transacional é revertida: não se
 * deixa oportunidade avançada com Central desatualizada sem tratamento explícito.
 */

import {
  resolveMentorDecision,
  type MentorDecision,
  type MentorDecisionInput,
  type MentorEvent,
  type OpportunityFacts,
  type RuleCatalog,
  type StoreSettings,
} from '../engine/engine'

export type OpportunityRef = {
  opportunityId: string
  clientId: string
  storeId: string
  sellerId: string
}

export type CentralActionUpsert = {
  /**
   * Identidade idempotente da ação. Duas execuções do mesmo fato lógico produzem
   * a mesma chave, e o banco tem índice único sobre ela — é isso que impede a
   * mesma ação de aparecer duas vezes na Central (§22, invariante 5).
   */
  idempotencyKey: string
  opportunityId: string
  clientId: string
  storeId: string
  sellerId: string
  activityType: string
  title: string
  objective: string | null
  dueAt: Date
  statusCode: string
  priority: string
  sourceType: string
}

export type HistoryEntry = {
  opportunityId: string
  clientId: string
  storeId: string
  sellerId: string
  eventType: string
  previousStatusCode: string | null
  statusCode: string
  result: string | null
  idempotencyKey: string
  occurredAt: Date
}

export type ScoreSnapshotEntry = {
  opportunityId: string
  storeId: string
  sellerId: string
  score: number
  scoreClass: string
  breakdown: Record<string, number>
  priorityIndex: number
  priorityClass: string
  reason: string
  ruleVersion: string
  idempotencyKey: string
}

export interface MentorRepository {
  loadFacts(ref: OpportunityRef): Promise<OpportunityFacts>
  loadStoreSettings(storeId: string): Promise<StoreSettings>
  loadCatalog(ruleVersion: string): Promise<RuleCatalog>

  saveOpportunityState(ref: OpportunityRef, decision: MentorDecision): Promise<void>
  savePendingFlags(ref: OpportunityRef, flags: string[]): Promise<void>
  saveCadenceState(ref: OpportunityRef, decision: MentorDecision): Promise<void>
  upsertCentralAction(action: CentralActionUpsert): Promise<void>
  removeCentralAction(opportunityId: string, reason: string): Promise<void>
  appendHistory(entry: HistoryEntry): Promise<void>
  appendScoreSnapshot(entry: ScoreSnapshotEntry): Promise<void>

  runInTransaction<T>(work: () => Promise<T>): Promise<T>
}

export type ApplyMentorEventInput = {
  ref: OpportunityRef
  event?: MentorEvent
  now: Date
  ruleVersion?: string
  /**
   * Chave de idempotência do fato de negócio (ex.: `${opportunityId}:${event}:${dia}`).
   * Reexecutar o mesmo fato não pode duplicar action, histórico nem snapshot.
   */
  idempotencyKey: string
}

export type ApplyMentorEventResult = {
  decision: MentorDecision
  centralAction: CentralActionUpsert | null
  persisted: boolean
}

/**
 * Chave determinística da ação da Central.
 * Mesma oportunidade + mesmo status + mesmo dia de vencimento = mesma chave.
 * É o que garante que reprocessar o dia inteiro não crie uma segunda action.
 */
export function buildCentralActionKey(
  opportunityId: string,
  statusCode: string,
  dueAt: Date,
): string {
  const day = dueAt.toISOString().slice(0, 10)
  return `mentor:${opportunityId}:${statusCode}:${day}`
}

function decisionToCentralAction(
  ref: OpportunityRef,
  decision: MentorDecision,
): CentralActionUpsert | null {
  if (!decision.centralAction) return null
  // Sem data de vencimento não existe ação a cobrar hoje.
  if (decision.nextActionAt === null) return null

  return {
    idempotencyKey: buildCentralActionKey(
      ref.opportunityId,
      decision.statusCode,
      decision.nextActionAt,
    ),
    opportunityId: ref.opportunityId,
    clientId: ref.clientId,
    storeId: ref.storeId,
    sellerId: ref.sellerId,
    activityType: decision.family,
    title: decision.nextStep,
    objective: decision.objective,
    dueAt: decision.nextActionAt,
    statusCode: decision.statusCode,
    priority: decision.priority.classification,
    sourceType: 'mentor_comercial',
  }
}

export async function applyMentorEvent(
  repository: MentorRepository,
  input: ApplyMentorEventInput,
): Promise<ApplyMentorEventResult> {
  const ruleVersion = input.ruleVersion ?? 'v1'

  const [facts, storeSettings, catalog] = await Promise.all([
    repository.loadFacts(input.ref),
    repository.loadStoreSettings(input.ref.storeId),
    repository.loadCatalog(ruleVersion),
  ])

  const decisionInput: MentorDecisionInput = {
    facts,
    event: input.event,
    storeSettings,
    catalog,
    now: input.now,
  }

  const decision = resolveMentorDecision(decisionInput)
  const centralAction = decisionToCentralAction(input.ref, decision)

  await repository.runInTransaction(async () => {
    await repository.saveOpportunityState(input.ref, decision)
    await repository.savePendingFlags(input.ref, decision.pendingFlags)
    await repository.saveCadenceState(input.ref, decision)

    if (centralAction) {
      await repository.upsertCentralAction(centralAction)
    } else {
      // A oportunidade deixou de exigir ação hoje: sai da visão ativa da Central,
      // mas a action concluída permanece no histórico (§47).
      await repository.removeCentralAction(input.ref.opportunityId, 'no_central_action')
    }

    await repository.appendHistory({
      opportunityId: input.ref.opportunityId,
      clientId: input.ref.clientId,
      storeId: input.ref.storeId,
      sellerId: input.ref.sellerId,
      eventType: input.event ? 'mentor_transition' : 'mentor_recalculation',
      previousStatusCode: decision.previousStatusCode,
      statusCode: decision.statusCode,
      result: input.event?.result ?? null,
      idempotencyKey: `${input.idempotencyKey}:history`,
      occurredAt: input.now,
    })

    await repository.appendScoreSnapshot({
      opportunityId: input.ref.opportunityId,
      storeId: input.ref.storeId,
      sellerId: input.ref.sellerId,
      score: decision.score.total,
      scoreClass: decision.score.classification,
      breakdown: decision.score.breakdown,
      priorityIndex: decision.priority.index,
      priorityClass: decision.priority.classification,
      reason: input.event ? `event:${input.event.result}` : 'recalculation',
      ruleVersion,
      idempotencyKey: `${input.idempotencyKey}:score`,
    })
  })

  return { decision, centralAction, persisted: true }
}
