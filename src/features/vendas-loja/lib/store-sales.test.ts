import { describe, expect, test } from 'bun:test'
import { filterStoreSales, getStoreSaleCompetence, type StoreSaleCandidate } from './store-sales'

function sale(overrides: Partial<StoreSaleCandidate> = {}): StoreSaleCandidate {
  return {
    event_id: 'event-1',
    oportunidade_id: 'op-1',
    data_evento: '2026-08-23T12:00:00Z',
    data_competencia: null,
    oportunidade_data_competencia: null,
    oportunidade_sale_date: null,
    etapa: 'ganho',
    cliente_id: 'client-1',
    cliente_nome: 'Cliente',
    veiculo_interesse: 'Veículo',
    valor_negociado: 100,
    seller_user_id: 'seller-1',
    seller_nome: 'Vendedor',
    closed_at: null,
    cancelada_em: null,
    motivo_cancelamento: null,
    ...overrides,
  }
}

describe('store sales detail read model', () => {
  test('resolves date-only competence without timezone drift', () => {
    expect(getStoreSaleCompetence(sale({ data_competencia: '2026-08-05' }))).toBe('2026-08-05')
    expect(getStoreSaleCompetence(sale({ oportunidade_data_competencia: '2026-08-06T00:00:00.000Z' }))).toBe('2026-08-06')
    expect(getStoreSaleCompetence(sale({ oportunidade_sale_date: '2026-08-07T03:00:00.000Z' }))).toBe('2026-08-07')
    expect(getStoreSaleCompetence(sale({ data_evento: '2026-08-08T12:00:00Z' }))).toBeNull()
  })

  test('filters by competence, keeps cancelled rows, and deduplicates opportunities', () => {
    const rows = filterStoreSales([
      sale({ event_id: 'fallback-event', oportunidade_data_competencia: '2026-08-11' }),
      sale({ event_id: 'explicit-event', data_competencia: '2026-08-12' }),
      sale({ event_id: 'cancelled', oportunidade_id: 'op-2', etapa: 'cancelada', data_competencia: '2026-08-13' }),
      sale({ event_id: 'old', oportunidade_id: 'op-3', data_competencia: '2026-07-31' }),
      sale({ event_id: 'missing-competence', oportunidade_id: 'op-4' }),
      sale({ event_id: 'outside-stage', oportunidade_id: 'op-5', etapa: 'perdida', data_competencia: '2026-08-14' }),
    ], '2026-08-01', '2026-08-23')

    expect(rows.map((row) => row.event_id)).toEqual(['explicit-event', 'cancelled'])
  })

  test('prefers the explicit event competence when duplicate events exist', () => {
    const rows = filterStoreSales([
      sale({ event_id: 'fallback-event', data_evento: '2026-08-23T12:00:00Z', oportunidade_data_competencia: '2026-08-11' }),
      sale({ event_id: 'explicit-event', data_evento: '2026-08-12T12:00:00Z', data_competencia: '2026-08-12' }),
    ], '2026-08-01', '2026-08-23')

    expect(rows).toHaveLength(1)
    expect(rows[0]?.event_id).toBe('explicit-event')
  })

  test('keeps an official sale event even when its opportunity is unavailable', () => {
    const rows = filterStoreSales([
      sale({ event_id: 'event-without-opportunity', oportunidade_id: null, data_competencia: '2026-08-20', etapa: 'ganho' }),
    ], '2026-08-01', '2026-08-25')

    expect(rows).toHaveLength(1)
    expect(rows[0]?.oportunidade_id).toBeNull()
  })
})
