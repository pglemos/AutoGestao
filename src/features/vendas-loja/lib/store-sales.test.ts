import { describe, expect, test } from 'bun:test'
import {
  buildStoreSaleCandidates,
  filterStoreSales,
  getStoreSaleCompetence,
  getStoreSaleDisplayDate,
  type StoreSaleCandidate,
  type StoreSaleEventRow,
} from './store-sales'

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

function event(overrides: Partial<StoreSaleEventRow> = {}): StoreSaleEventRow {
  return {
    id: 'event-1',
    tipo_evento: 'venda_realizada',
    cliente_id: 'client-1',
    data_evento: '2026-08-23T12:00:00Z',
    data_competencia: '2026-08-23',
    oportunidade_id: null,
    evento_origem_id: null,
    agendamento_id: null,
    seller_user_id: 'seller-1',
    metadata: {},
    observacao: null,
    seller: { name: 'Vendedor' },
    cliente: { nome: 'Cliente' },
    oportunidade: null,
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

  test('keeps a historical orphan without competence when no period is requested', () => {
    const orphan = sale({
      event_id: 'orphan-without-competence',
      oportunidade_id: null,
      data_competencia: null,
      oportunidade_data_competencia: null,
      oportunidade_sale_date: null,
    })

    expect(filterStoreSales([orphan])).toEqual([orphan])
    expect(getStoreSaleDisplayDate(orphan)).toBe('2026-08-23')
    expect(filterStoreSales([orphan], '2026-08-01', '2026-08-31')).toEqual([])
  })

  test('joins an orphan cancellation by event origin and keeps its event snapshot', () => {
    const rows = buildStoreSaleCandidates([
      event({
        id: 'orphan-sale',
        metadata: { valor_venda: '85.000,50', veiculo: 'SUV Turbo' },
        cliente: { nome: 'Cliente Órfão' },
      }),
      event({
        id: 'orphan-cancel',
        tipo_evento: 'venda_cancelada',
        evento_origem_id: 'orphan-sale',
        data_evento: '2026-08-24T15:00:00Z',
        observacao: 'Cliente desistiu após a aprovação do crédito.',
      }),
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      event_id: 'orphan-sale',
      cliente_nome: 'Cliente Órfão',
      veiculo_interesse: 'SUV Turbo',
      valor_negociado: 85000.5,
      etapa: 'cancelada',
      cancelada_em: '2026-08-24T15:00:00Z',
      motivo_cancelamento: 'Cliente desistiu após a aprovação do crédito.',
    })
  })

  test('does not treat an appointment-closure event as the sale cancellation', () => {
    const rows = buildStoreSaleCandidates([
      event({ id: 'sale-with-appointment' }),
      event({
        id: 'appointment-close',
        tipo_evento: 'venda_cancelada',
        oportunidade_id: null,
        agendamento_id: 'appointment-1',
        evento_origem_id: null,
      }),
    ])

    expect(rows[0]?.etapa).toBe('ganho')
  })

  test('keeps historical sales regardless of current seller membership', () => {
    const rows = filterStoreSales([
      sale({ event_id: 'active-sale', oportunidade_id: 'op-active', seller_user_id: 'seller-active', data_competencia: '2026-08-20' }),
      sale({ event_id: 'inactive-sale', oportunidade_id: 'op-inactive', seller_user_id: 'seller-inactive', data_competencia: '2026-08-21' }),
    ], '2026-08-01', '2026-08-31')

    expect(rows.map((row) => row.event_id)).toEqual(['inactive-sale', 'active-sale'])
  })
})
