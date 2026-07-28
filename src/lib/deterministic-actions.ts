/**
 * Módulo de Ações Determinísticas do MX Gestão Preditiva (Sem IA).
 * Produz recomendações, prioridades e próximos passos estritamente baseados em
 * regras de negócio determinísticas, fatos canônicos do banco e condições de resolução auditáveis.
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
  refDate: string // Formato YYYY-MM-DD
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

const RULE_VERSION = 'v1.0-deterministic'

function diasDiff(d1: string, d2: string): number {
  const date1 = new Date(`${d1.substring(0, 10)}T00:00:00`)
  const date2 = new Date(`${d2.substring(0, 10)}T00:00:00`)
  return Math.round((date2.getTime() - date1.getTime()) / 86400000)
}

export function deriveDeterministicActions(input: DeterministicActionInput): DeterministicAction[] {
  const actions: DeterministicAction[] = []
  const { refDate, role, userId, storeId } = input

  const customersMap = new Map<string, CustomerItem>()
  input.customers?.forEach((c) => customersMap.set(c.id, c))

  // Scenario 1: CANCELLED_SALE
  input.opportunities?.forEach((opp) => {
    if (opp.etapa === 'cancelada') {
      const customer = customersMap.get(opp.cliente_id)
      const customerName = customer?.nome || 'Cliente'
      const dataCancelamento = opp.cancelada_em || opp.closed_at || refDate
      const motivo = opp.motivo_cancelamento || 'Sem motivo registrado'

      actions.push({
        id: `act-cancelled-${opp.id}`,
        scenarioCode: 'CANCELLED_SALE',
        role,
        userId,
        storeId,
        sellerUserId: opp.vendedor_id || customer?.vendedor_id || null,
        customerId: opp.cliente_id,
        opportunityId: opp.id,
        title: `Recuperação de venda cancelada — ${customerName}`,
        explanation: `A venda de ${customerName} foi cancelada em ${new Date(dataCancelamento).toLocaleDateString('pt-BR')}. Motivo: "${motivo}".`,
        priority: 'high',
        dueAt: refDate,
        actionType: 'ANALYZE_RECOVERY',
        actionUrl: `/carteira?clienteId=${opp.cliente_id}`,
        evidence: {
          motivo,
          dataCancelamento,
          autor: opp.cancelada_por || 'desconhecido',
          valorOriginal: opp.valor || 0,
        },
        resolutionKey: 'STRATEGY_REGISTERED_OR_NEW_OPP',
        ruleVersion: RULE_VERSION,
      })
    }
  })

  // Scenario 2: OVERDUE_ACTION & Scenario 3: MISSING_NEXT_STEP
  input.opportunities?.forEach((opp) => {
    if (['ganho', 'perdido', 'cancelada'].includes(opp.etapa)) return
    const customer = customersMap.get(opp.cliente_id)
    if (!customer) return

    if (customer.proxima_acao_em && customer.proxima_acao_em < refDate) {
      const diasAtraso = diasDiff(customer.proxima_acao_em, refDate)
      actions.push({
        id: `act-overdue-${customer.id}`,
        scenarioCode: 'OVERDUE_ACTION',
        role,
        userId,
        storeId,
        sellerUserId: customer.vendedor_id || opp.vendedor_id || null,
        customerId: customer.id,
        opportunityId: opp.id,
        title: `Próxima ação vencida — ${customer.nome}`,
        explanation: `A ação "${customer.proxima_acao || 'Contato previsto'}" venceu há ${diasAtraso} dia(s) (em ${customer.proxima_acao_em}).`,
        priority: 'critical',
        dueAt: customer.proxima_acao_em,
        actionType: 'EXECUTE_NEXT_STEP',
        actionUrl: `/carteira?clienteId=${customer.id}`,
        evidence: {
          proximaAcao: customer.proxima_acao,
          dataPrevista: customer.proxima_acao_em,
          diasAtraso,
        },
        resolutionKey: 'NEW_INTERACTION_OR_RESCHEDULED',
        ruleVersion: RULE_VERSION,
      })
    } else if (!customer.proxima_acao || !customer.proxima_acao_em) {
      actions.push({
        id: `act-missing-step-${customer.id}`,
        scenarioCode: 'MISSING_NEXT_STEP',
        role,
        userId,
        storeId,
        sellerUserId: customer.vendedor_id || opp.vendedor_id || null,
        customerId: customer.id,
        opportunityId: opp.id,
        title: `Sem próxima ação definida — ${customer.nome}`,
        explanation: `Oportunidade ativa na etapa de ${opp.etapa} sem próxima ação agendada.`,
        priority: 'medium',
        dueAt: refDate,
        actionType: 'DEFINE_NEXT_STEP',
        actionUrl: `/carteira?clienteId=${customer.id}`,
        evidence: {
          etapaAtual: opp.etapa,
        },
        resolutionKey: 'NEXT_STEP_DEFINED',
        ruleVersion: RULE_VERSION,
      })
    }
  })

  // Scenario 4: UNCONFIRMED_VISIT
  input.appointments?.forEach((apt) => {
    if (apt.status === 'aguardando') {
      const customer = customersMap.get(apt.cliente_id)
      const customerName = customer?.nome || 'Cliente'
      actions.push({
        id: `act-unconfirmed-visit-${apt.id}`,
        scenarioCode: 'UNCONFIRMED_VISIT',
        role,
        userId,
        storeId,
        sellerUserId: customer?.vendedor_id || null,
        customerId: apt.cliente_id,
        opportunityId: apt.oportunidade_id || null,
        title: `Visita pendente de confirmação — ${customerName}`,
        explanation: `Agendamento para ${apt.data_agendamento} às ${apt.horario || 'horário não especificado'} aguarda confirmação.`,
        priority: 'high',
        dueAt: apt.data_agendamento,
        actionType: 'CONFIRM_APPOINTMENT',
        actionUrl: `/carteira?clienteId=${apt.cliente_id}`,
        evidence: {
          dataAgendamento: apt.data_agendamento,
          horario: apt.horario,
          statusAtual: apt.status,
        },
        resolutionKey: 'VISIT_CONFIRMED_OR_CANCELLED',
        ruleVersion: RULE_VERSION,
      })
    }
  })

  // Scenario 5: PROPOSAL_NO_RETURN
  input.proposals?.forEach((prop) => {
    const opp = input.opportunities?.find((o) => o.id === prop.oportunidade_id)
    if (opp && ['apresentacao', 'negociacao'].includes(opp.etapa)) {
      const diasEnviada = diasDiff(prop.created_at, refDate)
      if (diasEnviada >= 3) {
        const customer = customersMap.get(prop.cliente_id)
        actions.push({
          id: `act-proposal-no-return-${prop.id}`,
          scenarioCode: 'PROPOSAL_NO_RETURN',
          role,
          userId,
          storeId,
          sellerUserId: opp.vendedor_id || customer?.vendedor_id || null,
          customerId: prop.cliente_id,
          opportunityId: prop.oportunidade_id,
          title: `Proposta sem retorno há ${diasEnviada} dias — ${customer?.nome || 'Cliente'}`,
          explanation: `Proposta enviada em ${new Date(prop.created_at).toLocaleDateString('pt-BR')} aguarda devolutiva comercial.`,
          priority: 'high',
          dueAt: refDate,
          actionType: 'FOLLOWUP_PROPOSAL',
          actionUrl: `/carteira?clienteId=${prop.cliente_id}`,
          evidence: {
            diasEnviada,
            dataProposta: prop.created_at,
            etapaAtual: opp.etapa,
          },
          resolutionKey: 'PROPOSAL_RETURN_REGISTERED',
          ruleVersion: RULE_VERSION,
        })
      }
    }
  })

  // Scenario 6: PENDING_CLOSING
  input.opportunities?.forEach((opp) => {
    if (opp.etapa === 'fechamento') {
      const customer = customersMap.get(opp.cliente_id)
      const dataInicio = opp.updated_at || opp.created_at || refDate
      const diasEmFechamento = diasDiff(dataInicio, refDate)
      if (diasEmFechamento >= 1) {
        actions.push({
          id: `act-pending-closing-${opp.id}`,
          scenarioCode: 'PENDING_CLOSING',
          role,
          userId,
          storeId,
          sellerUserId: opp.vendedor_id || customer?.vendedor_id || null,
          customerId: opp.cliente_id,
          opportunityId: opp.id,
          title: `Fechamento pendente — ${customer?.nome || 'Cliente'}`,
          explanation: `Oportunidade está em fase de fechamento há ${diasEmFechamento} dia(s).`,
          priority: 'critical',
          dueAt: refDate,
          actionType: 'COMPLETE_CLOSING',
          actionUrl: `/carteira?clienteId=${opp.cliente_id}`,
          evidence: {
            diasEmFechamento,
            valor: opp.valor || 0,
          },
          resolutionKey: 'CLOSING_FINALIZED_OR_STAGE_CHANGED',
          ruleVersion: RULE_VERSION,
        })
      }
    }
  })

  // Scenario 7: TARGET_BEHIND_PACE
  if (input.targetPace && (role === 'manager' || role === 'owner' || role === 'admin')) {
    const { targetSales, realizedSales, dayOfMonth, daysInMonth } = input.targetPace
    const expectedPace = Math.round((targetSales * dayOfMonth) / daysInMonth)
    if (realizedSales < expectedPace) {
      actions.push({
        id: `act-target-pace-${input.targetPace.storeId}`,
        scenarioCode: 'TARGET_BEHIND_PACE',
        role,
        userId,
        storeId,
        sellerUserId: null,
        customerId: null,
        opportunityId: null,
        title: `Meta da loja abaixo do ritmo esperado`,
        explanation: `Realizado no mês (${realizedSales} vendas) está abaixo do ritmo esperado (${expectedPace} vendas) para o dia ${dayOfMonth} do mês (Meta: ${targetSales}).`,
        priority: 'critical',
        dueAt: refDate,
        actionType: 'REVIEW_TEAM_PIPELINE',
        actionUrl: `/rotina-gerente`,
        evidence: {
          targetSales,
          realizedSales,
          expectedPace,
          dayOfMonth,
          daysInMonth,
        },
        resolutionKey: 'CLOSING_PIPELINE_REVIEWED',
        ruleVersion: RULE_VERSION,
      })
    }
  }

  // Scenario 8: AUTOMATIC_TASK_ORIGIN_PENDING
  input.manualCompletions?.forEach((mc) => {
    if (mc.opportunityId) {
      const opp = input.opportunities?.find((o) => o.id === mc.opportunityId)
      if (opp && (opp.etapa === 'fechamento' || opp.etapa === 'apresentacao' || opp.etapa === 'negociacao')) {
        const customer = customersMap.get(opp.cliente_id)
        actions.push({
          id: `act-origin-pending-${mc.taskId}`,
          scenarioCode: 'AUTOMATIC_TASK_ORIGIN_PENDING',
          role,
          userId,
          storeId,
          sellerUserId: opp.vendedor_id || customer?.vendedor_id || null,
          customerId: opp.cliente_id,
          opportunityId: opp.id,
          title: `Pendência de origem ativa — ${customer?.nome || 'Cliente'}`,
          explanation: `A tarefa "${mc.scenarioCode}" foi concluída manualmente em ${new Date(mc.completedAt).toLocaleDateString('pt-BR')}, mas a pendência de origem na etapa ${opp.etapa} continua ativa.`,
          priority: 'high',
          dueAt: refDate,
          actionType: 'REGULARIZE_ORIGIN',
          actionUrl: `/carteira?clienteId=${opp.cliente_id}`,
          evidence: {
            scenarioCode: mc.scenarioCode,
            completedBy: mc.completedBy,
            completedAt: mc.completedAt,
            etapaAtual: opp.etapa,
          },
          resolutionKey: 'ORIGIN_ENTITY_RESOLVED',
          ruleVersion: RULE_VERSION,
        })
      }
    }
  })

  return actions
}
