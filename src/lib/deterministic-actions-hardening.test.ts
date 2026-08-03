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

  test('emits one customer-state action per customer, not one per open opportunity', () => {
    // `proxima_acao_em` é estado do CLIENTE, mas a varredura percorre
    // oportunidades. Um cliente com duas oportunidades abertas produzia duas
    // ações com o mesmo id — React então reclamava de chave duplicada em
    // /gerente/mentor e podia omitir ou duplicar o item renderizado.
    const actions = deriveDeterministicActions({
      ...base,
      opportunities: [
        { id: 'opp-a', cliente_id: 'client-4', etapa: 'negociacao', vendedor_id: 'seller-1' },
        { id: 'opp-b', cliente_id: 'client-4', etapa: 'proposta', vendedor_id: 'seller-1' },
      ],
      customers: [
        {
          id: 'client-4',
          nome: 'Cliente com duas oportunidades',
          proxima_acao: 'Ligar',
          proxima_acao_em: '2026-07-20',
          vendedor_id: 'seller-1',
        },
      ],
    })

    const overdue = actions.filter((action) => action.scenarioCode === 'OVERDUE_ACTION')
    expect(overdue).toHaveLength(1)
    expect(new Set(actions.map((action) => action.id)).size).toBe(actions.length)
  })

  test('chooses the same canonical opportunity when input order changes', () => {
    const opportunities = [
      {
        id: 'opp-older',
        cliente_id: 'client-order-independent',
        etapa: 'negociacao',
        updated_at: '2026-07-20T10:00:00Z',
        vendedor_id: 'seller-older',
      },
      {
        id: 'opp-newer',
        cliente_id: 'client-order-independent',
        etapa: 'proposta',
        updated_at: '2026-07-27T10:00:00Z',
        vendedor_id: 'seller-newer',
      },
    ]
    const customers = [{ id: 'client-order-independent', nome: 'Cliente estável' }]

    const select = (orderedOpportunities: typeof opportunities) => {
      const action = deriveDeterministicActions({
        ...base,
        opportunities: orderedOpportunities,
        customers,
      }).find((candidate) => candidate.scenarioCode === 'MISSING_NEXT_STEP')

      return {
        id: action?.id,
        sellerUserId: action?.sellerUserId,
        opportunityId: action?.opportunityId,
        sourceState: action?.evidence.sourceState,
      }
    }

    expect(select(opportunities)).toEqual(select([...opportunities].reverse()))
    expect(select(opportunities)).toEqual({
      id: 'act-missing-step-client-order-independent-2026-07-27T100000Z',
      sellerUserId: 'seller-newer',
      opportunityId: 'opp-newer',
      sourceState: '2026-07-27T10:00:00Z',
    })
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

  test('changes recurring action ids when the source state changes', () => {
    const build = (nextActionDate: string, opportunityUpdatedAt: string, refDate = '2026-07-28') =>
      deriveDeterministicActions({
        ...base,
        refDate,
        role: 'manager',
        opportunities: [
          {
            id: 'opp-stateful',
            cliente_id: 'client-stateful',
            etapa: 'negociacao',
            updated_at: opportunityUpdatedAt,
            vendedor_id: 'seller-1',
          },
        ],
        customers: [
          {
            id: 'client-stateful',
            nome: 'Cliente Stateful',
            proxima_acao: 'Retornar',
            proxima_acao_em: nextActionDate,
            vendedor_id: 'seller-1',
          },
        ],
        targetPace: {
          storeId: 'store-1',
          targetSales: 30,
          realizedSales: 2,
          dayOfMonth: 28,
          daysInMonth: 31,
        },
      })

    const first = build('2026-07-20', '2026-07-20T10:00:00Z')
    const changedSource = build('2026-07-21', '2026-07-21T10:00:00Z')
    const nextDay = build('2026-07-21', '2026-07-21T10:00:00Z', '2026-07-29')

    expect(first.find((action) => action.scenarioCode === 'OVERDUE_ACTION')?.id)
      .not.toBe(changedSource.find((action) => action.scenarioCode === 'OVERDUE_ACTION')?.id)
    expect(changedSource.find((action) => action.scenarioCode === 'TARGET_BEHIND_PACE')?.id)
      .not.toBe(nextDay.find((action) => action.scenarioCode === 'TARGET_BEHIND_PACE')?.id)
  })
})
