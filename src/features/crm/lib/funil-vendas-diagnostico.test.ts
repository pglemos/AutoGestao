import { describe, expect, it } from 'bun:test'
import {
  buildFunnelDashboard,
  countWorkingDays,
  resolveMetaTarget,
  type FunnelRow,
} from './funil-vendas-diagnostico'

const period = {
  start: new Date('2026-06-01T00:00:00-03:00'),
  end: new Date('2026-06-30T23:59:59-03:00'),
}

const event = (partial: FunnelRow): FunnelRow => ({
  vendedor_id: 'seller-1',
  store_id: 'store-1',
  data_evento: '2026-06-10T12:00:00-03:00',
  canal_mx: 'Internet',
  ...partial,
})

describe('funil de vendas diagnostico', () => {
  it('deduplica venda de cliente quando existe evento de venda para o mesmo cliente', () => {
    const dashboard = buildFunnelDashboard({
      events: [
        event({ id: 'sale-1', tipo_evento: 'venda_realizada', cliente_id: 'client-1' }),
        event({ id: 'sale-2', tipo_evento: 'venda_realizada', cliente_id: 'client-2' }),
      ],
      customers: [
        {
          id: 'customer-1',
          vendedor_id: 'seller-1',
          store_id: 'store-1',
          cliente_id: 'client-1',
          canal_mx: 'Internet',
          vendido: 'Sim',
          data_venda: '2026-06-10T12:00:00-03:00',
        },
        {
          id: 'customer-3',
          vendedor_id: 'seller-1',
          store_id: 'store-1',
          cliente_id: 'client-3',
          canal_mx: 'Carteira',
          vendido: 'Sim',
          data_venda: '2026-06-11T12:00:00-03:00',
        },
      ],
      period,
      sellerIds: ['seller-1'],
      storeId: 'store-1',
      meta: 5,
      referenceDate: new Date('2026-06-15T12:00:00-03:00'),
    })

    expect(dashboard.kpis.realizado).toBe(3)
    expect(dashboard.kpis.faltam).toBe(2)
  })

  it('CAN-13/CAN-23 — nao conta como realizado a venda que foi cancelada', () => {
    // O cancelamento preserva o evento `venda_realizada` original (histórico) e
    // acrescenta um `venda_cancelada`. Sem descontar o par, o funil e a meta
    // continuavam contando a venda revertida como realizada.
    const dashboard = buildFunnelDashboard({
      events: [
        event({ id: 'sale-1', tipo_evento: 'venda_realizada', cliente_id: 'client-1', oportunidade_id: 'opp-1' }),
        event({ id: 'sale-2', tipo_evento: 'venda_realizada', cliente_id: 'client-2', oportunidade_id: 'opp-2' }),
        event({ id: 'cancel-1', tipo_evento: 'venda_cancelada', cliente_id: 'client-1', oportunidade_id: 'opp-1', data_evento: '2026-06-20T12:00:00-03:00' }),
      ],
      customers: [],
      period,
      sellerIds: ['seller-1'],
      storeId: 'store-1',
      meta: 5,
      referenceDate: new Date('2026-06-25T12:00:00-03:00'),
    })

    expect(dashboard.kpis.realizado).toBe(1)
  })

  it('cancelamento nao remove a venda de outra oportunidade do mesmo cliente', () => {
    const dashboard = buildFunnelDashboard({
      events: [
        event({ id: 'sale-1', tipo_evento: 'venda_realizada', cliente_id: 'client-1', oportunidade_id: 'opp-1' }),
        event({ id: 'sale-2', tipo_evento: 'venda_realizada', cliente_id: 'client-1', oportunidade_id: 'opp-2' }),
        event({ id: 'cancel-1', tipo_evento: 'venda_cancelada', cliente_id: 'client-1', oportunidade_id: 'opp-1', data_evento: '2026-06-20T12:00:00-03:00' }),
      ],
      customers: [],
      period,
      sellerIds: ['seller-1'],
      storeId: 'store-1',
      meta: 5,
      referenceDate: new Date('2026-06-25T12:00:00-03:00'),
    })

    expect(dashboard.kpis.realizado).toBe(1)
  })

  it('monta os tres canais com etapas esperadas e modalidades discretas', () => {
    const dashboard = buildFunnelDashboard({
      events: [
        event({ tipo_evento: 'atendimento_comercial_realizado', canal_mx: 'Showroom' }),
        event({ tipo_evento: 'venda_realizada', canal_mx: 'Showroom' }),
        event({ tipo_evento: 'oportunidade_registrada', canal_mx: 'Internet' }),
        event({ tipo_evento: 'cliente_qualificado', canal_mx: 'Internet' }),
        event({ tipo_evento: 'agendamento_criado', canal_mx: 'Internet', modalidade: 'Videochamada' }),
        event({ tipo_evento: 'atendimento_comercial_realizado', canal_mx: 'Internet', modalidade: 'Atendimento externo' }),
        event({ tipo_evento: 'venda_realizada', canal_mx: 'Internet' }),
        event({ tipo_evento: 'cliente_qualificado', canal_mx: 'Carteira', origem_detalhada: 'Indicação' }),
        event({ tipo_evento: 'agendamento_criado', canal_mx: 'Carteira', modalidade: 'Visita na loja' }),
        event({ tipo_evento: 'atendimento_comercial_realizado', canal_mx: 'Carteira', modalidade: 'Visita na loja' }),
      ],
      customers: [],
      period,
      sellerIds: ['seller-1'],
      storeId: 'store-1',
      meta: null,
      referenceDate: new Date('2026-06-15T12:00:00-03:00'),
    })

    expect(dashboard.channels.map((channel) => channel.channel)).toEqual(['Showroom', 'Internet', 'Carteira'])
    expect(dashboard.channels[0].steps.map((step) => step.label)).toEqual(['Atendimento Comercial', 'Venda'])
    expect(dashboard.channels[1].steps.map((step) => step.label)).toEqual(['Oportunidades', 'Qualificados', 'Agendamento', 'Atendimento Comercial', 'Venda'])
    expect(dashboard.channels[2].steps.map((step) => step.label)).toEqual(['Qualificados', 'Agendamento', 'Atendimento Comercial', 'Venda'])
    expect(dashboard.channels[1].steps[2].modalities).toEqual({ Videochamada: 1 })
    expect(dashboard.channels[2].steps[2].modalities).toEqual({ 'Visita na loja': 1 })
  })

  it('seleciona ate tres recomendacoes por maior perda absoluta', () => {
    const dashboard = buildFunnelDashboard({
      events: [
        ...Array.from({ length: 10 }, (_, index) => event({ id: `opp-${index}`, tipo_evento: 'oportunidade_registrada', canal_mx: 'Internet' })),
        ...Array.from({ length: 2 }, (_, index) => event({ id: `qual-${index}`, tipo_evento: 'cliente_qualificado', canal_mx: 'Internet' })),
        ...Array.from({ length: 8 }, (_, index) => event({ id: `cart-qual-${index}`, tipo_evento: 'cliente_qualificado', canal_mx: 'Carteira' })),
        event({ id: 'cart-agd-1', tipo_evento: 'agendamento_criado', canal_mx: 'Carteira' }),
        ...Array.from({ length: 4 }, (_, index) => event({ id: `show-${index}`, tipo_evento: 'atendimento_comercial_realizado', canal_mx: 'Showroom' })),
      ],
      customers: [],
      period,
      sellerIds: ['seller-1'],
      storeId: 'store-1',
      meta: null,
      referenceDate: new Date('2026-06-15T12:00:00-03:00'),
    })

    expect(dashboard.recommendations).toHaveLength(3)
    expect(dashboard.recommendations[0].loss).toBe(8)
    expect(dashboard.recommendations[0].title).toBe('Internet precisa de mais qualificação')
    expect(dashboard.recommendations[1].title).toBe('Falta gerar compromisso')
  })

  it('resolve meta apenas para o vendedor e mes selecionados', () => {
    const target = resolveMetaTarget([
      { user_id: 'seller-2', store_id: 'store-1', month: 6, year: 2026, target: 20 },
      { user_id: 'seller-1', store_id: 'store-1', month: 5, year: 2026, target: 15 },
      { user_id: 'seller-1', store_id: 'store-1', month: 6, year: 2026, target: 12 },
    ], ['seller-1'], 'store-1', new Date('2026-06-10T12:00:00-03:00'))

    expect(target).toBe(12)
  })

  it('considera segunda a sabado como dias uteis quando nao ha configuracao', () => {
    expect(countWorkingDays(new Date(2026, 5, 1), new Date(2026, 5, 7, 23, 59, 59))).toBe(6)
  })
})
