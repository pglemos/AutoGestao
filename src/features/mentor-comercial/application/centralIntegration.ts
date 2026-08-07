/**
 * Integração entre o Mentor Comercial e a Central de Execução (TASK 31, 32 e 33).
 *
 * Princípios fundamentais:
 * 1. A Central NÃO armazena clientes — ela operacionaliza ações em `execution_actions`.
 * 2. Toda ação possui vínculo inequívoco com cliente, oportunidade e chave idempotente (`actionId`).
 * 3. O Mentor é a fonte da verdade determinística para score, prioridade e transições de status.
 */

import type {
  MentorDecision,
  OpportunityFacts,
  StoreSettings,
} from '../engine/engine'
import {
  applyMentorEvent,
  buildCentralActionKey,
  type ApplyMentorEventResult,
  type CentralActionUpsert,
  type MentorRepository,
  type OpportunityRef,
} from './mentorApplicationService'

/**
 * Payload completo da ação operacionalizada na Central de Execução (`execution_actions`).
 * Vínculo inequívoco contendo: clientId, opportunityId, actionId, statusCode, activityType, dateTime e source.
 */
export type CentralExecutionActionPayload = {
  actionId: string
  clientId: string
  opportunityId: string
  storeId: string
  sellerId: string
  statusCode: string
  activityType: string
  dateTime: Date
  source: string
  title: string
  objective: string | null
  priority: string
  status: 'pending' | 'completed' | 'canceled'
  completedAt?: Date | null
  completionResult?: string | null
}

/**
 * Contexto de avaliação para criação de ações na Central de Execução.
 */
export type CentralActionEvaluationContext = {
  ref: OpportunityRef
  facts: OpportunityFacts
  storeSettings: StoreSettings
  decision?: MentorDecision | null
  clientInfo?: {
    birthday?: Date | string | null
    [key: string]: unknown
  }
  extendedDates?: {
    confirmationDueAt?: Date | null
    postSaleAt?: Date | null
    warrantyAt?: Date | null
    deliveryAt?: Date | null
    [key: string]: unknown
  }
}

/**
 * Resultado da avaliação dos 8 gatilhos operacionais da Central.
 */
export type CentralTriggerResult = {
  shouldCreate: boolean
  triggerReasons: string[]
  primaryReason: string | null
}

/**
 * Compara se duas datas são do mesmo dia (ano, mês e dia).
 */
export function isSameDay(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}

/**
 * Compara se duas datas pertencem ao mesmo mês e dia (aniversários).
 */
export function isSameMonthAndDay(dateA: Date, dateB: Date): boolean {
  return (
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}

/**
 * Avalia os 8 gatilhos operacionais para criação de ação na Central (TASK 31):
 * 1. Próxima ação hoje
 * 2. Visita hoje
 * 3. Confirmação vence hoje
 * 4. Cliente respondeu (aguardando retorno)
 * 5. Pós-venda hoje (quando habilitado na loja)
 * 6. Garantia hoje (quando habilitada na loja)
 * 7. Entrega hoje (quando habilitada)
 * 8. Aniversário hoje (quando aplicável)
 */
export function evaluateCentralActionTrigger(
  context: CentralActionEvaluationContext,
  now: Date,
): CentralTriggerResult {
  const { facts, storeSettings, decision, clientInfo, extendedDates } = context
  const reasons: string[] = []

  // 1. Próxima ação hoje
  const nextActionAt = decision?.nextActionAt ?? facts.nextActionAt
  if (nextActionAt && isSameDay(new Date(nextActionAt), now)) {
    reasons.push('next_action_today')
  }

  // 2. Visita hoje
  if (facts.appointmentAt && isSameDay(new Date(facts.appointmentAt), now)) {
    reasons.push('visit_today')
  }

  // 3. Confirmação vence hoje
  if (
    extendedDates?.confirmationDueAt &&
    isSameDay(new Date(extendedDates.confirmationDueAt), now)
  ) {
    reasons.push('confirmation_today')
  }

  // 4. Cliente respondeu
  if (facts.clientRespondedAt !== null) {
    reasons.push('client_responded')
  }

  // 5. Pós-venda hoje (quando habilitado na loja)
  if (
    storeSettings.postSaleEnabled &&
    extendedDates?.postSaleAt &&
    isSameDay(new Date(extendedDates.postSaleAt), now)
  ) {
    reasons.push('post_sale_today')
  }

  // 6. Garantia hoje (quando habilitada na loja)
  if (
    storeSettings.warrantyFollowupEnabled &&
    extendedDates?.warrantyAt &&
    isSameDay(new Date(extendedDates.warrantyAt), now)
  ) {
    reasons.push('warranty_today')
  }

  // 7. Entrega hoje quando habilitada
  const deliveryEnabled =
    (storeSettings as { deliveryEnabled?: boolean }).deliveryEnabled ?? true
  if (
    deliveryEnabled &&
    extendedDates?.deliveryAt &&
    isSameDay(new Date(extendedDates.deliveryAt), now)
  ) {
    reasons.push('delivery_today')
  }

  // 8. Aniversário hoje quando aplicável
  if (clientInfo?.birthday) {
    const bday = new Date(clientInfo.birthday)
    if (!isNaN(bday.getTime()) && isSameMonthAndDay(bday, now)) {
      reasons.push('birthday_today')
    }
  }

  // Suporte a indicação determinística do motor
  if (decision?.centralAction && !reasons.includes('next_action_today')) {
    reasons.push('mentor_decision')
  }

  return {
    shouldCreate: reasons.length > 0,
    triggerReasons: reasons,
    primaryReason: reasons[0] ?? null,
  }
}

/**
 * Constrói a estrutura de ação com vínculo inequívoco para `execution_actions`.
 * Garante identidade idempotente (`actionId`) usando `buildCentralActionKey`.
 */
export function createCentralExecutionActionPayload(
  ref: OpportunityRef,
  statusCode: string,
  activityType: string,
  dateTime: Date,
  title: string,
  objective: string | null = null,
  priority: string = 'Média',
  source: string = 'mentor_comercial',
): CentralExecutionActionPayload {
  const actionId = buildCentralActionKey(ref.opportunityId, statusCode, dateTime)
  return {
    actionId,
    clientId: ref.clientId,
    opportunityId: ref.opportunityId,
    storeId: ref.storeId,
    sellerId: ref.sellerId,
    statusCode,
    activityType,
    dateTime,
    source,
    title,
    objective,
    priority,
    status: 'pending',
  }
}

/**
 * Mapeia a ação do Mentor (`CentralActionUpsert`) para o formato da Central de Execução.
 */
export function mapUpsertToExecutionPayload(
  upsert: CentralActionUpsert,
): CentralExecutionActionPayload {
  return {
    actionId: upsert.idempotencyKey,
    clientId: upsert.clientId,
    opportunityId: upsert.opportunityId,
    storeId: upsert.storeId,
    sellerId: upsert.sellerId,
    statusCode: upsert.statusCode,
    activityType: upsert.activityType,
    dateTime: upsert.dueAt,
    source: upsert.sourceType,
    title: upsert.title,
    objective: upsert.objective,
    priority: upsert.priority,
    status: 'pending',
  }
}

/**
 * Entrada para conclusão de ação pela Central de Execução (TASK 32).
 */
export type CompleteCentralActionInput = {
  ref: OpportunityRef
  actionId: string
  result: string
  now: Date
  idempotencyKey?: string
  ruleVersion?: string
}

/**
 * Repositório estendido com capacidade de marcar ações como concluídas na Central.
 */
export interface CentralIntegrationRepository extends MentorRepository {
  isActionCompleted?(actionId: string): Promise<boolean>
  markActionCompleted?(
    actionId: string,
    completedAt: Date,
    result: string,
  ): Promise<void>
}

/**
 * Registro em memória para idempotência estrita entre chamadas simultâneas.
 */
const completedActionsRegistry = new Set<string>()

/**
 * Reseta o registro in-memory de idempotência para fins de teste.
 */
export function _resetIdempotencyRegistryForTesting(): void {
  completedActionsRegistry.clear()
}

/**
 * Processa a conclusão de uma ação iniciada pela Central de Execução (TASK 32).
 *
 * Sequência e garantias:
 * 1. Operação Idempotente: clique duplo ou re-execução não duplica o evento.
 * 2. Conclui a action mantendo seu histórico e registro em `execution_actions`.
 * 3. Atualiza o Mentor Comercial chamando `applyMentorEvent`.
 * 4. Grava o histórico de eventos da oportunidade.
 * 5. Recalcula score e prioridade e grava o snapshot.
 * 6. Remove/Atualiza a ação da lista ativa sem apagar o histórico nem a oportunidade.
 */
export async function completeCentralAction(
  repository: CentralIntegrationRepository,
  input: CompleteCentralActionInput,
): Promise<{
  actionId: string
  status: 'completed'
  alreadyCompleted: boolean
  mentorResult: ApplyMentorEventResult | null
}> {
  const { ref, actionId, result, now, ruleVersion } = input
  const idempotencyKey = input.idempotencyKey ?? `${actionId}:completion`

  // Verificação de idempotência (banco / repositório + registro in-memory)
  const isCompletedInRepo = repository.isActionCompleted
    ? await repository.isActionCompleted(actionId)
    : false

  if (
    isCompletedInRepo ||
    completedActionsRegistry.has(actionId) ||
    completedActionsRegistry.has(idempotencyKey)
  ) {
    return {
      actionId,
      status: 'completed',
      alreadyCompleted: true,
      mentorResult: null,
    }
  }

  // Registra a execução imediatamente para bloquear duplo clique concorrente
  completedActionsRegistry.add(actionId)
  completedActionsRegistry.add(idempotencyKey)

  // Atualiza Mentor, recalcula score/prioridade e grava histórico
  const mentorResult = await applyMentorEvent(repository, {
    ref,
    event: { result, at: now },
    now,
    ruleVersion,
    idempotencyKey,
  })

  // Marca ação como concluída no repositório (preservando o registro no banco)
  if (repository.markActionCompleted) {
    await repository.markActionCompleted(actionId, now, result)
  }

  return {
    actionId,
    status: 'completed',
    alreadyCompleted: false,
    mentorResult,
  }
}

/**
 * Parâmetros para geração do Deep Link do cliente.
 */
export type ClientDeepLinkParams = {
  clientId: string
  opportunityId: string
  tab?: string
}

/**
 * Função pura que monta o destino do botão "Abrir cliente" (TASK 33).
 *
 * Garante redirecionamento direto levando obrigatoriamente clientId e opportunityId,
 * sem passar por rotas genéricas.
 */
export function buildClientDeepLink(
  clientIdOrParams: string | ClientDeepLinkParams,
  opportunityIdParam?: string,
): string {
  let clientId: string
  let opportunityId: string
  let tab: string | undefined

  if (typeof clientIdOrParams === 'object') {
    clientId = clientIdOrParams.clientId
    opportunityId = clientIdOrParams.opportunityId
    tab = clientIdOrParams.tab
  } else {
    clientId = clientIdOrParams
    opportunityId = opportunityIdParam ?? ''
  }

  if (!clientId || !opportunityId) {
    throw new Error('buildClientDeepLink exige clientId e opportunityId válidos.')
  }

  const searchParams = new URLSearchParams()
  searchParams.set('clientId', clientId)
  searchParams.set('opportunityId', opportunityId)
  if (tab) {
    searchParams.set('tab', tab)
  }

  return `/carteira/cliente?${searchParams.toString()}`
}
