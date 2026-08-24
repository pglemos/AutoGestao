import { describe, expect, test } from 'bun:test'
import { filterOfficialSellerSales, getOfficialSaleCompetence, getPeriodEndExclusive, type OfficialSellerSale } from './official-seller-sales'

function sale(overrides: Partial<OfficialSellerSale> = {}): OfficialSellerSale {
  return {
    id: 'event-1',
    data_competencia: null,
    data_evento: '2026-08-23T12:00:00Z',
    oportunidade_id: 'op-1',
    canal: 'porta',
    oportunidade: {
      etapa: 'ganho',
      data_competencia: null,
      sale_date: null,
      valor_negociado: 100,
      veiculo_interesse: 'Veículo',
      placa_veiculo: null,
      tipo_veiculo: null,
      cliente_nome: 'Cliente',
    },
    ...overrides,
  }
}

describe('official seller sales detail read model', () => {
  test('builds an exclusive Sao Paulo end boundary for bounded fallback queries', () => {
    expect(getPeriodEndExclusive('2026-08-12')).toBe('2026-08-13T03:00:00.000Z')
  })

  test('uses event, opportunity, then sale_date competence without data_evento fallback', () => {
    expect(getOfficialSaleCompetence(sale({
      data_competencia: '2026-08-05',
      oportunidade: { ...sale().oportunidade!, data_competencia: '2026-08-06', sale_date: '2026-08-07' },
    }))).toBe('2026-08-05')
    expect(getOfficialSaleCompetence(sale({
      oportunidade: { ...sale().oportunidade!, data_competencia: '2026-08-06' },
    }))).toBe('2026-08-06')
    expect(getOfficialSaleCompetence(sale({
      oportunidade: { ...sale().oportunidade!, sale_date: '2026-08-07' },
    }))).toBe('2026-08-07')
    expect(getOfficialSaleCompetence(sale({
      data_evento: '2026-08-08T12:00:00Z',
    }))).toBeNull()
  })

  test('excludes cancelled and out-of-period rows and deduplicates opportunity events', () => {
    const rows = filterOfficialSellerSales([
      sale({ id: 'fallback-event', data_evento: '2026-08-23T12:00:00Z', oportunidade_id: 'op-1', oportunidade: { ...sale().oportunidade!, data_competencia: '2026-08-11' } }),
      sale({ id: 'explicit-event', data_competencia: '2026-08-12', data_evento: '2026-08-12T12:00:00Z', oportunidade_id: 'op-1' }),
      sale({ id: 'cancelled', oportunidade_id: 'op-2', oportunidade: { ...sale().oportunidade!, etapa: 'cancelada', data_competencia: '2026-08-13' } }),
      sale({ id: 'old', oportunidade_id: 'op-3', oportunidade: { ...sale().oportunidade!, data_competencia: '2026-07-31' } }),
      sale({ id: 'no-competence', oportunidade_id: 'op-4' }),
    ], '2026-08-01', '2026-08-23')

    expect(rows.map((row) => row.id)).toEqual(['explicit-event'])
  })
})
