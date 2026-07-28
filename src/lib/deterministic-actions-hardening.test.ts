import { describe, expect, test } from 'bun:test'
import { deriveDeterministicActions, type DeterministicActionInput } from './deterministic-actions'

describe('deterministic action hardening', () => {
  const base: Pick<DeterministicActionInput, 'refDate' | 'role' | 'userId' | 'storeId'> = {
    refDate: '2026-07-28',
    role: 'seller',
    userId: 'seller-1',
    storeId: 'store-1',
  }

  test('uses canonical existing application routes', () => {
    const actions = deriveDeterministicActions({
      ...base,
      opportunities: [
        {
          id: 'opp-1',
          cliente_id: 'client-1',
          etapa: 'cancelada',
          cancelada_em: '2026-07-27T12:00:00Z',
          motivo_cancelamento: 'Cliente desistiu',
          vendedor_id: 'seller-1',
        },
      ],
      customers: [{ id: 'client-1', nome: 'Cliente Teste', vendedor_id: 'seller-1' }],
    })

    expect(actions[0]?.actionUrl).toBe('/carteira-clientes?clienteId=client-1')
  })

  test('does not recommend contact actions for do-not-contact customers', () => {
    const actions = deriveDeterministicActions({
      ...base,
      opportunities: [
        {
          id: 'opp-2',
          cliente_id: 'client-2',
          etapa: 'negociacao',
          vendedor_id: 'seller-1',
        },
      ],
      customers: [
        {
          id: 'client-2',
          nome: 'Cliente Bloqueado',
          proxima_acao: 'Ligar',
          proxima_acao_em: '2026-07-20',
          vendedor_id: 'seller-1',
          do_not_contact: true,
        },
      ],
    })

    expect(actions.some((action) => action.scenarioCode === 'OVERDUE_ACTION')).toBe(false)
    expect(actions.some((action) => action.scenarioCode === 'MISSING_NEXT_STEP')).toBe(false)
  })

  test('returns deterministic priority order and removes duplicate scenario/entity actions', () => {
    const actions = deriveDeterministicActions({
      ...base,
      opportunities: [
        {
          id: 'opp-3',
          cliente_id: 'client-3',
          etapa: 'fechamento',
          updated_at: '2026-07-25T10:00:00Z',
          vendedor_id: 'seller-1',
        },
        {
          id: 'opp-3',
          cliente_id: 'client-3',
          etapa: 'fechamento',
          updated_at: '2026-07-25T10:00:00Z',
          vendedor_id: 'seller-1',
        },
      ],
      customers: [
        {
          id: 'client-3',
          nome: 'Cliente Duplicado',
          proxima_acao: null,
          proxima_acao_em: null,
          vendedor_id: 'seller-1',
        },
      ],
    })

    expect(actions.filter((action) => action.scenarioCode === 'PENDING_CLOSING')).toHaveLength(1)
    expect(actions.filter((action) => action.scenarioCode === 'MISSING_NEXT_STEP')).toHaveLength(1)

    const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 } as const
    for (let index = 1; index < actions.length; index += 1) {
      expect(priorityRank[actions[index - 1].priority]).toBeLessThanOrEqual(priorityRank[actions[index].priority])
    }
  })
})
