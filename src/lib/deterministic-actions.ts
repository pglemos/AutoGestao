/**
 * Motor de Ações Determinísticas do MX Gestão Preditiva.
 *
 * Não usa IA. Toda saída deriva de fatos canônicos do banco, regras versionadas
 * e condições de resolução auditáveis.
 */

export type ActionPriority = 'critical' | 'high' | 'medium' | 'low'

export interface DeterministicAction {
  id: string
  scenarioCode: string
  role: string
  userId: string | null
  storeId: string | null
  sellerUserId: string | null
  customerId: string | null
  opportunityId: string | null
  title: string
  explanation: string
  priority: ActionPriority
  dueAt: string | null
  actionType: string
  actionUrl: string | null
  evidence: Record<string, unknown>
  resolutionKey: string
  ruleVersion: string
}

export interface OpportunityItem {
  id: string
  cliente_id: string
  etapa: string
  valor?: number | null
  closed_at?: string | null
  cancelada_em?: string | null
  cancelada_por?: string | null
  motivo_cancelamento?: string | null
  motivo_perda?: string | null
  created_at?: string | null
  updated_at?: string | null
  vendedor_id?: string | null
}

export interface CustomerItem {
  id: string
  nome: string
  status?: string | null
  proxima_acao?: string | null
  proxima_acao_em?: string | null
  ultima_interacao?: string | null
  vendedor_id?: string | null
  do_not_contact?: boolean | null
}

export interface AppointmentItem {
  id: string
  cliente_id: string
  oportunidade_id?: string | null
  data_agendamento: string
  horario?: string | null
  status: 'confirmado' | 'aguardando' | 'compareceu' | 'nao_compareceu' | 'cancelado' | string
}

export interface ProposalItem {
  id: string
  oportunidade_id: string
  cliente_id: string
  created_at: string
  status?: string | null
}

export interface TargetPaceInfo {
  storeId: string
  targetSales: number
  realizedSales: number
  dayOfMonth: number
  daysInMonth: number
}

export interface ManualCompletionItem {
  taskId: string
  scenarioCode: string
  opportunityId?: string | null
  customerId?: string | null
  completedAt: string
  completedBy: string
}

export interface DeterministicActionInput {
  refDate: string
  role: 'seller' | 'manager' | 'owner' | 'admin' | string
  userId: string
  storeId: string
  opportunities?: OpportunityItem[]
  customers?: CustomerItem[]
  appointments?: AppointmentItem[]
  proposals?: ProposalItem[]
  targetPace?: TargetPaceInfo
  manualCompletions?: ManualCompletionItem[]
}

export const DETERMINISTIC_RULE_VERSION = 'v1.1-deterministic'

const TERMINAL_STAGES = new Set(['ganho', 'perdido', 'cancelada'])
const PRIORITY_RANK: Record<ActionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function datePart(value: string): string {
  return value.substring(0, 10)
}

function daysBetween(from: string, to: string): number {
  const start = new Date(`${datePart(from)}T12:00:00Z`)
  const end = new Date(`${datePart(to)}T12:00:00Z`)
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000))
}

function formatDatePtBr(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
  if (Number.isNaN(date.getTime())) return datePart(value)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

function customerUrl(customerId: string): string {
  return `/carteira-clientes?clienteId=${encodeURIComponent(customerId)}`
}

function canRecommendContact(customer: CustomerItem | undefined): boolean {
  return Boolean(customer && customer.do_not_contact !== true)
}

function dedupeAndSort(actions: DeterministicAction[]): DeterministicAction[] {
  const deduped = new Map<string, DeterministicAction>()

  for (const action of actions) {
    const entityKey = action.opportunityId || action.customerId || action.storeId || action.id
    const key = `${action.scenarioCode}:${entityKey}`
    const current = deduped.get(key)

    if (!current) {
      deduped.set(key, action)
      continue
    }

    const currentDue = current.dueAt || '9999-12-31'
    const nextDue = action.dueAt || '9999-12-31'
    if (nextDue < currentDue || (nextDue === currentDue && action.id < current.id)) {
      deduped.set(key, action)
    }
  }

  return [...deduped.values()].sort((left, right) => {
    const priority = PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority]
    if (priority !== 0) return priority

    const leftDue = left.dueAt || '9999-12-31'
    const rightDue = right.dueAt || '9999-12-31'
    if (leftDue !== rightDue) return leftDue.localeCompare(rightDue)

    return left.id.localeCompare(right.id)
  })
}

export function deriveDeterministicActions(input: DeterministicActionInput): DeterministicAction[] {
  const actions: DeterministicAction[] = []
  const { refDate, role, userId, storeId } = input
  const customersMap = new Map<string, CustomerItem>()
  const opportunitiesMap = new Map<string, OpportunityItem>()

  input.customers?.forEach((customer) => customersMap.set(customer.id, customer))
  input.opportunities?.forEach((opportunity) => opportunitiesMap.set(opportunity.id, opportunity))

  for (const opportunity of input.opportunities ?? []) {
    if (opportunity.etapa !== 'cancelada') continue

    const customer = customersMap.get(opportunity.cliente_id)
    if (!canRecommendContact(customer)) continue

    const cancellationDate = opportunity.cancelada_em || opportunity.closed_at || refDate
    const reason = opportunity.motivo_cancelamento || 'Sem motivo registrado'

    actions.push({
      id: `act-cancelled-${opportunity.id}`,
      scenarioCode: 'CANCELLED_SALE',
      role,
      userId,
      storeId,
      sellerUserId: opportunity.vendedor_id || customer?.vendedor_id || null,
      customerId: opportunity.cliente_id,
      opportunityId: opportunity.id,
      title: `Recuperação de venda cancelada — ${customer?.nome || 'Cliente'}`,
      explanation: `A venda foi cancelada em ${formatDatePtBr(cancellationDate)}. Motivo: "${reason}".`,
      priority: 'high',
      dueAt: refDate,
      actionType: 'ANALYZE_RECOVERY',
      actionUrl: customerUrl(opportunity.cliente_id),
      evidence: {
        motivo: reason,
        dataCancelamento: cancellationDate,
        autor: opportunity.cancelada_por || 'desconhecido',
        valorOriginal: opportunity.valor || 0,
      },
      resolutionKey: 'STRATEGY_REGISTERED_OR_NEW_OPP',
      ruleVersion: DETERMINISTIC_RULE_VERSION,
    })
  }

  for (const opportunity of input.opportunities ?? []) {
    if (TERMINAL_STAGES.has(opportunity.etapa)) continue

    const customer = customersMap.get(opportunity.cliente_id)
    if (!canRecommendContact(customer)) continue

    if (customer.proxima_acao_em && customer.proxima_acao_em < refDate) {
      const overdueDays = daysBetween(customer.proxima_acao_em, refDate)
      actions.push({
        id: `act-overdue-${customer.id}`,
        scenarioCode: 'OVERDUE_ACTION',
        role,
        userId,
        storeId,
        sellerUserId: customer.vendedor_id || opportunity.vendedor_id || null,
        customerId: customer.id,
        opportunityId: opportunity.id,
        title: `Próxima ação vencida — ${customer.nome}`,
        explanation: `A ação "${customer.proxima_acao || 'Contato previsto'}" venceu há ${overdueDays} dia(s), em ${formatDatePtBr(customer.proxima_acao_em)}.`,
        priority: 'critical',
        dueAt: customer.proxima_acao_em,
        actionType: 'EXECUTE_NEXT_STEP',
        actionUrl: customerUrl(customer.id),
        evidence: {
          proximaAcao: customer.proxima_acao,
          dataPrevista: customer.proxima_acao_em,
          diasAtraso: overdueDays,
        },
        resolutionKey: 'NEW_INTERACTION_OR_RESCHEDULED',
        ruleVersion: DETERMINISTIC_RULE_VERSION,
      })
    } else if (!customer.proxima_acao || !customer.proxima_acao_em) {
      actions.push({
        id: `act-missing-step-${customer.id}`,
        scenarioCode: 'MISSING_NEXT_STEP',
        role,
        userId,
        storeId,
        sellerUserId: customer.vendedor_id || opportunity.vendedor_id || null,
        customerId: customer.id,
        opportunityId: opportunity.id,
        title: `Sem próxima ação definida — ${customer.nome}`,
        explanation: `Oportunidade ativa na etapa ${opportunity.etapa} sem próxima ação agendada.`,
        priority: 'medium',
        dueAt: refDate,
        actionType: 'DEFINE_NEXT_STEP',
        actionUrl: customerUrl(customer.id),
        evidence: { etapaAtual: opportunity.etapa },
        resolutionKey: 'NEXT_STEP_DEFINED',
        ruleVersion: DETERMINISTIC_RULE_VERSION,
      })
    }
  }

  for (const appointment of input.appointments ?? []) {
    if (appointment.status !== 'aguardando') continue

    const customer = customersMap.get(appointment.cliente_id)
    if (!canRecommendContact(customer)) continue

    actions.push({
      id: `act-unconfirmed-visit-${appointment.id}`,
      scenarioCode: 'UNCONFIRMED_VISIT',
      role,
      userId,
      storeId,
      sellerUserId: customer.vendedor_id || null,
      customerId: appointment.cliente_id,
      opportunityId: appointment.oportunidade_id || null,
      title: `Visita pendente de confirmação — ${customer.nome}`,
      explanation: `Agendamento para ${formatDatePtBr(appointment.data_agendamento)} às ${appointment.horario || 'horário não informado'} aguarda confirmação.`,
      priority: 'high',
      dueAt: appointment.data_agendamento,
      actionType: 'CONFIRM_APPOINTMENT',
      actionUrl: customerUrl(appointment.cliente_id),
      evidence: {
        dataAgendamento: appointment.data_agendamento,
        horario: appointment.horario,
        statusAtual: appointment.status,
      },
      resolutionKey: 'VISIT_CONFIRMED_OR_CANCELLED',
      ruleVersion: DETERMINISTIC_RULE_VERSION,
    })
  }

  for (const proposal of input.proposals ?? []) {
    const opportunity = opportunitiesMap.get(proposal.oportunidade_id)
    if (!opportunity || !['apresentacao', 'negociacao'].includes(opportunity.etapa)) continue

    const customer = customersMap.get(proposal.cliente_id)
    if (!canRecommendContact(customer)) continue

    const sentDaysAgo = daysBetween(proposal.created_at, refDate)
    if (sentDaysAgo < 3) continue

    actions.push({
      id: `act-proposal-no-return-${proposal.id}`,
      scenarioCode: 'PROPOSAL_NO_RETURN',
      role,
      userId,
      storeId,
      sellerUserId: opportunity.vendedor_id || customer.vendedor_id || null,
      customerId: proposal.cliente_id,
      opportunityId: proposal.oportunidade_id,
      title: `Proposta sem retorno há ${sentDaysAgo} dias — ${customer.nome}`,
      explanation: `Proposta enviada em ${formatDatePtBr(proposal.created_at)} ainda não possui devolutiva comercial registrada.`,
      priority: 'high',
      dueAt: refDate,
      actionType: 'FOLLOWUP_PROPOSAL',
      actionUrl: customerUrl(proposal.cliente_id),
      evidence: {
        diasEnviada: sentDaysAgo,
        dataProposta: proposal.created_at,
        etapaAtual: opportunity.etapa,
      },
      resolutionKey: 'PROPOSAL_RETURN_REGISTERED',
      ruleVersion: DETERMINISTIC_RULE_VERSION,
    })
  }

  for (const opportunity of input.opportunities ?? []) {
    if (opportunity.etapa !== 'fechamento') continue

    const customer = customersMap.get(opportunity.cliente_id)
    const startDate = opportunity.updated_at || opportunity.created_at || refDate
    const closingDays = daysBetween(startDate, refDate)
    if (closingDays < 1) continue

    actions.push({
      id: `act-pending-closing-${opportunity.id}`,
      scenarioCode: 'PENDING_CLOSING',
      role,
      userId,
      storeId,
      sellerUserId: opportunity.vendedor_id || customer?.vendedor_id || null,
      customerId: opportunity.cliente_id,
      opportunityId: opportunity.id,
      title: `Fechamento pendente — ${customer?.nome || 'Cliente'}`,
      explanation: `A oportunidade está em fechamento há ${closingDays} dia(s) e precisa ser concluída ou reclassificada.`,
      priority: 'critical',
      dueAt: refDate,
      actionType: 'COMPLETE_CLOSING',
      actionUrl: customerUrl(opportunity.cliente_id),
      evidence: { diasEmFechamento: closingDays, valor: opportunity.valor || 0 },
      resolutionKey: 'CLOSING_FINALIZED_OR_STAGE_CHANGED',
      ruleVersion: DETERMINISTIC_RULE_VERSION,
    })
  }

  if (input.targetPace && ['manager', 'owner', 'admin'].includes(role)) {
    const { targetSales, realizedSales, dayOfMonth, daysInMonth } = input.targetPace
    const safeDaysInMonth = Math.max(daysInMonth, 1)
    const expectedPace = Math.round((targetSales * dayOfMonth) / safeDaysInMonth)

    if (targetSales > 0 && realizedSales < expectedPace) {
      actions.push({
        id: `act-target-pace-${input.targetPace.storeId}`,
        scenarioCode: 'TARGET_BEHIND_PACE',
        role,
        userId,
        storeId,
        sellerUserId: null,
        customerId: null,
        opportunityId: null,
        title: 'Meta da loja abaixo do ritmo esperado',
        explanation: `Realizado no mês: ${realizedSales}. Ritmo esperado até hoje: ${expectedPace}. Meta: ${targetSales}.`,
        priority: 'critical',
        dueAt: refDate,
        actionType: 'REVIEW_TEAM_PIPELINE',
        actionUrl: '/gerente/rotina-equipe',
        evidence: { targetSales, realizedSales, expectedPace, dayOfMonth, daysInMonth },
        resolutionKey: 'CLOSING_PIPELINE_REVIEWED',
        ruleVersion: DETERMINISTIC_RULE_VERSION,
      })
    }
  }

  for (const completion of input.manualCompletions ?? []) {
    if (!completion.opportunityId) continue

    const opportunity = opportunitiesMap.get(completion.opportunityId)
    if (!opportunity || !['fechamento', 'apresentacao', 'negociacao'].includes(opportunity.etapa)) continue

    const customer = customersMap.get(opportunity.cliente_id)
    actions.push({
      id: `act-origin-pending-${completion.taskId}`,
      scenarioCode: 'AUTOMATIC_TASK_ORIGIN_PENDING',
      role,
      userId,
      storeId,
      sellerUserId: opportunity.vendedor_id || customer?.vendedor_id || null,
      customerId: opportunity.cliente_id,
      opportunityId: opportunity.id,
      title: `Pendência de origem ainda ativa — ${customer?.nome || 'Cliente'}`,
      explanation: `A ação ${completion.scenarioCode} foi marcada como resolvida em ${formatDatePtBr(completion.completedAt)}, mas a oportunidade continua na etapa ${opportunity.etapa}.`,
      priority: 'high',
      dueAt: refDate,
      actionType: 'REGULARIZE_ORIGIN',
      actionUrl: customerUrl(opportunity.cliente_id),
      evidence: {
        scenarioCode: completion.scenarioCode,
        completedBy: completion.completedBy,
        completedAt: completion.completedAt,
        etapaAtual: opportunity.etapa,
      },
      resolutionKey: 'ORIGIN_ENTITY_RESOLVED',
      ruleVersion: DETERMINISTIC_RULE_VERSION,
    })
  }

  return dedupeAndSort(actions)
}
