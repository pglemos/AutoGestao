import { describe, expect, test } from 'bun:test'
import {
  DETERMINISTIC_RULE_VERSION,
  deriveDeterministicActions,
  type DeterministicActionInput,
} from './deterministic-actions'

describe('deriveDeterministicActions', () => {
  const baseDate = '2026-07-28'

  test('Cenário 1 — CANCELLED_SALE: gera ação determinística para venda cancelada com evidência e resolução', () => {
    const input: DeterministicActionInput = {
      refDate: baseDate,
      role: 'seller',
      userId: 'user-1',
      storeId: 'store-1',
      opportunities: [
        {
          id: 'opp-1',
          cliente_id: 'cli-1',
          etapa: 'cancelada',
          valor: 50000,
          cancelada_em: '2026-07-27T14:30:00Z',
          cancelada_por: 'user-1',
          motivo_cancelamento: 'Desistiu por preço',
          vendedor_id: 'user-1',
        },
      ],
      customers: [
        {
          id: 'cli-1',
          nome: 'João da Silva',
          status: 'inativo',
          proxima_acao: null,
          proxima_acao_em: null,
          vendedor_id: 'user-1',
        },
      ],
    }

    const actions = deriveDeterministicActions(input)
    expect(actions).toHaveLength(1)

    const action = actions[0]
    expect(action.scenarioCode).toBe('CANCELLED_SALE')
    expect(action.role).toBe('seller')
    expect(action.customerId).toBe('cli-1')
    expect(action.opportunityId).toBe('opp-1')
    expect(action.priority).toBe('high')
    expect(action.title).toContain('Recuperação de venda cancelada')
    expect(action.explanation).toContain('Desistiu por preço')
    expect(action.evidence).toEqual({
      motivo: 'Desistiu por preço',
      dataCancelamento: '2026-07-27T14:30:00Z',
      autor: 'user-1',
      valorOriginal: 50000,
    })
    expect(action.resolutionKey).toBe('STRATEGY_REGISTERED_OR_NEW_OPP')
    expect(action.ruleVersion).toBe(DETERMINISTIC_RULE_VERSION)
  })

  test('Cenário 2 — OVERDUE_ACTION: identifica ação vencida em oportunidade ativa', () => {
    const input: DeterministicActionInput = {
      refDate: baseDate,
      role: 'seller',
      userId: 'user-1',
      storeId: 'store-1',
      opportunities: [
        {
          id: 'opp-2',
          cliente_id: 'cli-2',
          etapa: 'negociacao',
          valor: 80000,
          vendedor_id: 'user-1',
        },
      ],
      customers: [
        {
          id: 'cli-2',
          nome: 'Maria Santos',
          status: 'em_atendimento',
          proxima_acao: 'Enviar proposta revisada',
          proxima_acao_em: '2026-07-25',
          vendedor_id: 'user-1',
        },
      ],
    }

    const actions = deriveDeterministicActions(input)
    const overdue = actions.find((a) => a.scenarioCode === 'OVERDUE_ACTION')
    expect(overdue).toBeDefined()
    expect(overdue?.priority).toBe('critical')
    expect(overdue?.explanation).toContain('Enviar proposta revisada')
    expect(overdue?.resolutionKey).toBe('NEW_INTERACTION_OR_RESCHEDULED')
  })

  test('Cenário 3 — MISSING_NEXT_STEP: identifica oportunidade ativa sem próxima ação', () => {
    const input: DeterministicActionInput = {
      refDate: baseDate,
      role: 'seller',
      userId: 'user-1',
      storeId: 'store-1',
      opportunities: [
        {
          id: 'opp-3',
          cliente_id: 'cli-3',
          etapa: 'apresentacao',
          valor: 60000,
          vendedor_id: 'user-1',
        },
      ],
      customers: [
        {
          id: 'cli-3',
          nome: 'Carlos Oliveira',
          status: 'em_atendimento',
          proxima_acao: null,
          proxima_acao_em: null,
          vendedor_id: 'user-1',
        },
      ],
    }

    const actions = deriveDeterministicActions(input)
    const missing = actions.find((a) => a.scenarioCode === 'MISSING_NEXT_STEP')
    expect(missing).toBeDefined()
    expect(missing?.priority).toBe('medium')
    expect(missing?.resolutionKey).toBe('NEXT_STEP_DEFINED')
  })

  test('Cenário 4 — UNCONFIRMED_VISIT: identifica agendamento pendente de confirmação', () => {
    const input: DeterministicActionInput = {
      refDate: baseDate,
      role: 'seller',
      userId: 'user-1',
      storeId: 'store-1',
      appointments: [
        {
          id: 'apt-1',
          cliente_id: 'cli-4',
          oportunidade_id: 'opp-4',
          data_agendamento: '2026-07-28',
          horario: '14:00',
          status: 'aguardando',
        },
      ],
      customers: [
        {
          id: 'cli-4',
          nome: 'Ana Souza',
          status: 'em_atendimento',
          vendedor_id: 'user-1',
        },
      ],
    }

    const actions = deriveDeterministicActions(input)
    const visit = actions.find((a) => a.scenarioCode === 'UNCONFIRMED_VISIT')
    expect(visit).toBeDefined()
    expect(visit?.priority).toBe('high')
    expect(visit?.resolutionKey).toBe('VISIT_CONFIRMED_OR_CANCELLED')
  })

  test('Cenário 7 — TARGET_BEHIND_PACE: alerta de meta gerencial abaixo do ritmo', () => {
    const input: DeterministicActionInput = {
      refDate: baseDate,
      role: 'manager',
      userId: 'mgr-1',
      storeId: 'store-1',
      targetPace: {
        storeId: 'store-1',
        targetSales: 30,
        realizedSales: 5,
        dayOfMonth: 20,
        daysInMonth: 30,
      },
    }

    const actions = deriveDeterministicActions(input)
    const targetAction = actions.find((a) => a.scenarioCode === 'TARGET_BEHIND_PACE')
    expect(targetAction).toBeDefined()
    expect(targetAction?.role).toBe('manager')
    expect(targetAction?.priority).toBe('critical')
    expect(targetAction?.explanation).toContain('Realizado no mês: 5')
    expect(targetAction?.explanation).toContain('Meta: 30')
    expect(targetAction?.resolutionKey).toBe('CLOSING_PIPELINE_REVIEWED')
  })

  test('Cenário 8 — AUTOMATIC_TASK_ORIGIN_PENDING: tarefa concluída pelo usuário com origem ainda pendente', () => {
    const input: DeterministicActionInput = {
      refDate: baseDate,
      role: 'manager',
      userId: 'mgr-1',
      storeId: 'store-1',
      manualCompletions: [
        {
          taskId: 'task-closing-1',
          scenarioCode: 'PENDING_CLOSING',
          opportunityId: 'opp-5',
          completedAt: '2026-07-27T10:00:00Z',
          completedBy: 'mgr-1',
        },
      ],
      opportunities: [
        {
          id: 'opp-5',
          cliente_id: 'cli-5',
          etapa: 'fechamento',
          vendedor_id: 'user-2',
        },
      ],
      customers: [
        {
          id: 'cli-5',
          nome: 'Pedro Alvares',
          status: 'em_atendimento',
          vendedor_id: 'user-2',
        },
      ],
    }

    const actions = deriveDeterministicActions(input)
    const originPending = actions.find((a) => a.scenarioCode === 'AUTOMATIC_TASK_ORIGIN_PENDING')
    expect(originPending).toBeDefined()
    expect(originPending?.priority).toBe('high')
    expect(originPending?.explanation).toContain('foi marcada como resolvida')
    expect(originPending?.explanation).toContain('continua na etapa fechamento')
    expect(originPending?.resolutionKey).toBe('ORIGIN_ENTITY_RESOLVED')
  })
})
