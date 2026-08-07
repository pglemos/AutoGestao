/**
 * DailyProcessor Application Module (TASK 36 & 37).
 *
 * Processador diário idempotente do Mentor Comercial.
 * Função pura de orquestração por loja, recebendo repositório e `now` por parâmetro.
 *
 * Executa, em ordem rigorosa:
 * 1. Atualizar visita D-2, D-1 e D0
 * 2. Ativar contatos futuros cuja data chegou
 * 3. Encontrar ações vencidas
 * 4. Criar/atualizar action na Central
 * 5. Recalcular score
 * 6. Recalcular prioridade
 * 7. Recalcular Qualidade da Carteira
 * 8. Encerrar cadências concluídas
 * 9. Marcar elegibilidade ao Plano de Ataque
 * 10. Atualizar status derivados por data
 */

import {
  buildCentralActionKey,
  type CentralActionUpsert,
  type MentorRepository,
  type OpportunityRef,
} from './mentorApplicationService'
import {
  resolveMentorDecision,
  type MentorDecision,
  type MentorDecisionInput,
  type OpportunityFacts,
} from '../engine/engine'
import type { PriorityClassification } from '../engine/priority'
import type { ScoreClassification } from '../engine/score'
import { getEligibleAttackMission } from './attackMissions'
import { resolveVisitStatusByDate } from './closingIntegration'

export interface DailyProcessorRepository extends MentorRepository {
  loadStoreOpportunities(storeId: string): Promise<OpportunityRef[]>
  saveCarteiraQualityReport?(report: StoreCarteiraQualityReport): Promise<void>
}

export type DailyProcessorInput = {
  storeId: string
  now: Date
  ruleVersion?: string
}

export type StoreCarteiraQualityReport = {
  storeId: string
  calculatedAt: Date
  totalOpportunities: number
  averageScore: number
  scoreClassificationDistribution: Record<ScoreClassification, number>
  priorityClassificationDistribution: Record<PriorityClassification, number>
  overdueActionsCount: number
  awaitingClientResponseCount: number
  awaitingSellerResponseCount: number
  attackEligibleCount: number
}

export type DailyProcessorResult = {
  storeId: string
  processedAt: Date
  totalOpportunitiesProcessed: number
  updatedVisitsCount: number
  activatedFutureContactsCount: number
  overdueActionsCount: number
  upsertedCentralActionsCount: number
  completedCadencesCount: number
  attackEligibleCount: number
  carteiraQuality: StoreCarteiraQualityReport
  opportunitiesResults: Array<{
    ref: OpportunityRef
    decision: MentorDecision
    centralAction: CentralActionUpsert | null
  }>
}

function decisionToCentralAction(
  ref: OpportunityRef,
  decision: MentorDecision,
): CentralActionUpsert | null {
  if (!decision.centralAction) return null
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

export function computeStoreCarteiraQuality(
  storeId: string,
  now: Date,
  items: Array<{ decision: MentorDecision; facts: OpportunityFacts }>,
): StoreCarteiraQualityReport {
  const totalOpportunities = items.length
  let scoreSum = 0

  const scoreClassificationDistribution: Record<ScoreClassification, number> = {
    Excelente: 0,
    Boa: 0,
    Atenção: 0,
    Crítica: 0,
  }

  const priorityClassificationDistribution: Record<PriorityClassification, number> = {
    Máxima: 0,
    Alta: 0,
    Média: 0,
    Baixa: 0,
  }

  let overdueActionsCount = 0
  let awaitingClientResponseCount = 0
  let awaitingSellerResponseCount = 0
  let attackEligibleCount = 0

  for (const item of items) {
    const { decision, facts } = item
    scoreSum += decision.score.total

    scoreClassificationDistribution[decision.score.classification] += 1
    priorityClassificationDistribution[decision.priority.classification] += 1

    if (decision.urgency === 'actionOverdue') {
      overdueActionsCount += 1
    }

    if (decision.urgency === 'clientRespondedAwaitingSeller') {
      awaitingSellerResponseCount += 1
    } else if (facts.clientRespondedAt === null) {
      awaitingClientResponseCount += 1
    }

    if (decision.attackEligible) {
      attackEligibleCount += 1
    }
  }

  const averageScore = totalOpportunities > 0 ? Math.round(scoreSum / totalOpportunities) : 0

  return {
    storeId,
    calculatedAt: now,
    totalOpportunities,
    averageScore,
    scoreClassificationDistribution,
    priorityClassificationDistribution,
    overdueActionsCount,
    awaitingClientResponseCount,
    awaitingSellerResponseCount,
    attackEligibleCount,
  }
}

/**
 * Processa o lote diário de oportunidades para uma loja de forma puramente determinística e idempotente.
 */
export async function processDailyStoreBatch(
  repository: DailyProcessorRepository,
  input: DailyProcessorInput,
): Promise<DailyProcessorResult> {
  const { storeId, now, ruleVersion = 'v1' } = input

  const [opportunitiesRefs, storeSettings, catalog] = await Promise.all([
    repository.loadStoreOpportunities(storeId),
    repository.loadStoreSettings(storeId),
    repository.loadCatalog(ruleVersion),
  ])

  let updatedVisitsCount = 0
  let activatedFutureContactsCount = 0
  let overdueActionsCount = 0
  let upsertedCentralActionsCount = 0
  let completedCadencesCount = 0
  let attackEligibleCount = 0

  const opportunitiesResults: Array<{
    ref: OpportunityRef
    decision: MentorDecision
    centralAction: CentralActionUpsert | null
  }> = []

  const processedItemsForQuality: Array<{ decision: MentorDecision; facts: OpportunityFacts }> = []

  const dayStr = now.toISOString().slice(0, 10)

  for (const ref of opportunitiesRefs) {
    let facts = await repository.loadFacts(ref)

    // 1. Atualizar visita D-2, D-1 e D0
    if (facts.appointmentAt !== null) {
      const targetVisitStatus = resolveVisitStatusByDate(facts.appointmentAt, now)
      if (facts.statusCode.startsWith('INT-V') && facts.statusCode !== targetVisitStatus) {
        facts = {
          ...facts,
          statusCode: targetVisitStatus,
        }
        updatedVisitsCount += 1
      }
    }

    // 2. Ativar contatos futuros cuja data chegou
    if (facts.nextActionAt !== null) {
      const actionUtc = Date.UTC(
        facts.nextActionAt.getUTCFullYear(),
        facts.nextActionAt.getUTCMonth(),
        facts.nextActionAt.getUTCDate(),
      )
      const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

      if (actionUtc <= nowUtc) {
        activatedFutureContactsCount += 1
      }
    }

    // 3. Encontrar ações vencidas & ajustar qualidade de execução
    const updatedQuality = { ...facts.quality }
    if (facts.nextActionAt !== null) {
      const overdueMs = now.getTime() - facts.nextActionAt.getTime()
      if (overdueMs > 0) {
        overdueActionsCount += 1
        if (overdueMs > 86_400_000) {
          updatedQuality.execution = 'lateOver24h'
        } else {
          updatedQuality.execution = 'lateUnder24h'
        }
      }
    }

    facts = {
      ...facts,
      quality: updatedQuality,
    }

    // 4, 5, 6. Decisão determinística do Mentor (Central, Score, Prioridade)
    const decisionInput: MentorDecisionInput = {
      facts,
      storeSettings,
      catalog,
      now,
    }

    const decision = resolveMentorDecision(decisionInput)

    // 8. Encerrar cadências concluídas
    if (
      decision.cadenceState &&
      (decision.cadenceState.status === 'completedWithoutResponse' ||
        decision.cadenceState.currentAttempt >= decision.cadenceState.totalAttempts)
    ) {
      completedCadencesCount += 1
    }

    // 9. Marcar elegibilidade ao Plano de Ataque
    const isAttackEligible =
      decision.attackEligible ||
      decision.cadenceState?.status === 'completedWithoutResponse' ||
      getEligibleAttackMission({
        opportunityId: ref.opportunityId,
        clientId: ref.clientId,
        statusCode: decision.statusCode,
        cadenceStateStatus: decision.cadenceState?.status,
        attackEligible: decision.attackEligible,
      }) !== null

    if (isAttackEligible) {
      attackEligibleCount += 1
    }

    const finalDecision: MentorDecision = {
      ...decision,
      attackEligible: isAttackEligible,
    }

    // 4 (continuação). Central Action
    const centralAction = decisionToCentralAction(ref, finalDecision)
    if (centralAction) {
      upsertedCentralActionsCount += 1
    }

    // 10. Persistência idempotente e atualização de status derivados por data
    const dailyOppKey = `daily_processor:${ref.storeId}:${ref.opportunityId}:${dayStr}`

    await repository.runInTransaction(async () => {
      await repository.saveOpportunityState(ref, finalDecision)
      await repository.savePendingFlags(ref, finalDecision.pendingFlags)
      await repository.saveCadenceState(ref, finalDecision)

      if (centralAction) {
        await repository.upsertCentralAction(centralAction)
      } else {
        await repository.removeCentralAction(ref.opportunityId, 'no_central_action')
      }

      await repository.appendHistory({
        opportunityId: ref.opportunityId,
        clientId: ref.clientId,
        storeId: ref.storeId,
        sellerId: ref.sellerId,
        eventType: 'daily_processing',
        previousStatusCode: facts.statusCode,
        statusCode: finalDecision.statusCode,
        result: 'Processamento diário automatizado',
        idempotencyKey: `${dailyOppKey}:history`,
        occurredAt: now,
      })

      await repository.appendScoreSnapshot({
        opportunityId: ref.opportunityId,
        storeId: ref.storeId,
        sellerId: ref.sellerId,
        score: finalDecision.score.total,
        scoreClass: finalDecision.score.classification,
        breakdown: finalDecision.score.breakdown,
        priorityIndex: finalDecision.priority.index,
        priorityClass: finalDecision.priority.classification,
        reason: 'daily_processing',
        ruleVersion,
        idempotencyKey: `${dailyOppKey}:score`,
      })
    })

    opportunitiesResults.push({
      ref,
      decision: finalDecision,
      centralAction,
    })

    processedItemsForQuality.push({
      decision: finalDecision,
      facts,
    })
  }

  // 7. Recalcular Qualidade da Carteira
  const carteiraQuality = computeStoreCarteiraQuality(storeId, now, processedItemsForQuality)

  if (repository.saveCarteiraQualityReport) {
    await repository.saveCarteiraQualityReport(carteiraQuality)
  }

  return {
    storeId,
    processedAt: now,
    totalOpportunitiesProcessed: opportunitiesRefs.length,
    updatedVisitsCount,
    activatedFutureContactsCount,
    overdueActionsCount,
    upsertedCentralActionsCount,
    completedCadencesCount,
    attackEligibleCount,
    carteiraQuality,
    opportunitiesResults,
  }
}
