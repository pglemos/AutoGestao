import { describe, expect, test } from 'bun:test'
import { deriveDeterministicActions } from '@/lib/deterministic-actions'
import {
  applyDeterministicResolutions,
  buildDeterministicActionInput,
  filterResolvedActions,
  toManualCompletions,
} from './deterministic-action-data'

describe('deterministic action production data adapter', () => {
  test('maps canonical Supabase rows into every engine source', () => {
    const input = buildDeterministicActionInput(
      {
        opportunities: [
          {
            id: 'opp-1',
            cliente_id: 'client-1',
            etapa: 'negociacao',
            valor_negociado: '75000.50',
            seller_user_id: 'seller-1',
            created_at: '2026-07-20T10:00:00Z',
            updated_at: '2026-07-27T10:00:00Z',
          },
        ],
        customers: [
          {
            id: 'client-1',
            nome: 'Cliente Real',
            status: 'ativo',
            proxima_acao: 'Retornar proposta',
            proxima_acao_em: '2026-07-25',
            ultima_interacao: '2026-07-24',
            seller_user_id: 'seller-1',
            do_not_contact: false,
          },
        ],
        appointments: [
          {
            id: 'appointment-1',
            cliente_id: 'client-1',
            oportunidade_id: 'opp-1',
            data_hora: '2026-07-29T17:30:00Z',
            status: 'aguardando',
          },
        ],
        proposalEvents: [
          {
            id: 'proposal-event-1',
            cliente_id: 'client-1',
            oportunidade_id: 'opp-1',
            data_evento: '2026-07-24T13:00:00Z',
          },
        ],
        resolutions: [],
      },
      {
        refDate: '2026-07-28',
        role: 'seller',
        userId: 'seller-1',
        storeId: 'store-1',
      },
    )

    expect(input.opportunities?.[0]).toMatchObject({
      id: 'opp-1',
      valor: 75000.5,
      vendedor_id: 'seller-1',
    })
    expect(input.customers?.[0]).toMatchObject({
      id: 'client-1',
      do_not_contact: false,
    })
    expect(input.appointments?.[0]).toMatchObject({
      id: 'appointment-1',
      data_agendamento: '2026-07-29',
      horario: '14:30',
    })
    expect(input.proposals?.[0]).toMatchObject({
      id: 'proposal-event-1',
      oportunidade_id: 'opp-1',
    })
    expect(input.manualCompletions).toBeUndefined()
  })

  test('permanently suppresses resolved non-recurring actions for the same rule version', () => {
    const input = buildDeterministicActionInput(
      {
        opportunities: [
          {
            id: 'opp-2',
            cliente_id: 'client-2',
            etapa: 'cancelada',
            cancelada_em: '2026-07-27T10:00:00Z',
            motivo_cancelamento: 'Sem aprovação',
            seller_user_id: 'seller-1',
          },
        ],
        customers: [{ id: 'client-2', nome: 'Cliente Cancelado', seller_user_id: 'seller-1' }],
        appointments: [],
        proposalEvents: [],
        resolutions: [],
      },
      {
        refDate: '2026-07-28',
        role: 'seller',
        userId: 'seller-1',
        storeId: 'store-1',
      },
    )
    const actions = deriveDeterministicActions(input)
    const action = actions.find((item) => item.scenarioCode === 'CANCELLED_SALE')
    expect(action).toBeDefined()

    const filtered = filterResolvedActions(actions, [
      {
        action_id: action!.id,
        scenario_code: action!.scenarioCode,
        completed_at: '2026-07-26T10:00:00Z',
        completed_by: 'seller-1',
        rule_version: 'deterministic-actions/v0',
      },
      {
        action_id: action!.id,
        scenario_code: action!.scenarioCode,
        completed_at: '2026-07-27T10:00:00Z',
        completed_by: 'seller-1',
        rule_version: action!.ruleVersion,
      },
    ])

    expect(filtered.some((item) => item.id === action!.id)).toBe(false)
    expect(filtered.some((item) => item.scenarioCode === 'AUTOMATIC_TASK_ORIGIN_PENDING')).toBe(false)

    const staleOnly = filterResolvedActions(actions, [
      {
        action_id: action!.id,
        scenario_code: action!.scenarioCode,
        completed_at: '2026-07-26T10:00:00Z',
        completed_by: 'seller-1',
        rule_version: 'deterministic-actions/v0',
      },
    ])
    expect(staleOnly.some((item) => item.id === action!.id)).toBe(true)
  })

  test('replaces a resolved source-bound action when its canonical origin remains active', () => {
    const input = buildDeterministicActionInput(
      {
        opportunities: [
          {
            id: 'opp-3',
            cliente_id: 'client-3',
            etapa: 'negociacao',
            seller_user_id: 'seller-1',
            updated_at: '2026-07-20T10:00:00Z',
          },
        ],
        customers: [
          {
            id: 'client-3',
            nome: 'Cliente Pendente',
            proxima_acao: 'Retornar',
            proxima_acao_em: '2026-07-20',
            seller_user_id: 'seller-1',
          },
        ],
        appointments: [],
        proposalEvents: [],
        resolutions: [],
      },
      {
        refDate: '2026-07-28',
        role: 'seller',
        userId: 'seller-1',
        storeId: 'store-1',
      },
    )
    const actions = deriveDeterministicActions(input)
    const overdue = actions.find((item) => item.scenarioCode === 'OVERDUE_ACTION')
    expect(overdue).toBeDefined()

    const applied = applyDeterministicResolutions(actions, [
      {
        action_id: overdue!.id,
        scenario_code: overdue!.scenarioCode,
        completed_at: '2026-07-27T10:00:00Z',
        completed_by: 'seller-1',
        rule_version: overdue!.ruleVersion,
      },
    ])

    expect(applied.some((item) => item.id === overdue!.id)).toBe(false)
    const originPending = applied.find((item) => item.scenarioCode === 'AUTOMATIC_TASK_ORIGIN_PENDING')
    expect(originPending).toMatchObject({
      actionType: 'REGULARIZE_ORIGIN',
      actionUrl: overdue!.actionUrl,
      customerId: overdue!.customerId,
      opportunityId: overdue!.opportunityId,
    })
    expect(originPending?.evidence).toMatchObject({
      originalActionId: overdue!.id,
      originalScenarioCode: 'OVERDUE_ACTION',
    })
  })

  test('does not apply a resolution from another rule version or action id', () => {
    const action = deriveDeterministicActions({
      refDate: '2026-07-28',
      role: 'manager',
      userId: 'manager-1',
      storeId: 'store-1',
      targetPace: {
        storeId: 'store-1',
        targetSales: 30,
        realizedSales: 2,
        dayOfMonth: 28,
        daysInMonth: 31,
      },
    })[0]

    const result = applyDeterministicResolutions([action], [
      {
        action_id: action.id,
        scenario_code: action.scenarioCode,
        completed_at: '2026-07-28T10:00:00Z',
        completed_by: 'manager-1',
        rule_version: 'old-rule-version',
      },
      {
        action_id: 'another-action',
        scenario_code: action.scenarioCode,
        completed_at: '2026-07-28T10:00:00Z',
        completed_by: 'manager-1',
        rule_version: action.ruleVersion,
      },
    ])

    expect(result).toEqual([action])
  })

  test('converts persisted resolutions into manual completion evidence', () => {
    const completions = toManualCompletions([
      {
        action_id: 'task-1',
        scenario_code: 'PENDING_CLOSING',
        opportunity_id: 'opp-9',
        customer_id: 'client-9',
        completed_at: '2026-07-28T10:00:00Z',
        completed_by: 'manager-1',
        rule_version: 'v1.2-deterministic',
      },
    ])

    expect(completions).toEqual([
      {
        taskId: 'task-1',
        scenarioCode: 'PENDING_CLOSING',
        opportunityId: 'opp-9',
        customerId: 'client-9',
        completedAt: '2026-07-28T10:00:00Z',
        completedBy: 'manager-1',
      },
    ])
  })
})
