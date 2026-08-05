import { describe, expect, it } from 'vitest'
import { buildTeamFunnel, buildTeamRanking, collectSellerIds, dropCancelledSales } from './team-funnel'

const period = { start: new Date('2026-07-01T00:00:00'), end: new Date('2026-07-31T23:59:59') }

const names = new Map([
  ['s1', 'ANA PAULA'],
  ['s2', 'DANIEL'],
])

function sale(seller: string, canal: string | null, opportunity: string, day = '10') {
  return {
    id: `${seller}-${opportunity}`,
    tipo_evento: 'venda_realizada',
    canal,
    oportunidade_id: opportunity,
    seller_user_id: seller,
    loja_id: 'loja-1',
    data_evento: `2026-07-${day}T12:00:00Z`,
  }
}

describe('buildTeamRanking', () => {
  it('agrega vendas por vendedor e canal, ordenando pelo total', () => {
    const rows = [
      sale('s1', 'internet', 'o1'),
      sale('s1', 'carteira', 'o2'),
      sale('s1', 'showroom', 'o3'),
      sale('s2', 'internet', 'o4'),
    ]

    const ranking = buildTeamRanking(rows, period, names)

    expect(ranking.map(row => [row.name, row.total])).toEqual([['ANA PAULA', 3], ['DANIEL', 1]])
    expect(ranking[0]).toMatchObject({ showroom: 1, internet: 1, carteira: 1 })
  })

  it('desconta venda cancelada da mesma oportunidade', () => {
    const rows = [
      sale('s1', 'internet', 'o1'),
      { ...sale('s1', 'internet', 'o1'), id: 'cancel', tipo_evento: 'venda_cancelada' },
      sale('s1', 'internet', 'o2'),
    ]

    expect(buildTeamRanking(rows, period, names)[0].total).toBe(1)
  })

  it('ignora eventos fora do período', () => {
    const rows = [sale('s1', 'internet', 'o1'), { ...sale('s1', 'internet', 'o9'), data_evento: '2026-06-10T12:00:00Z' }]
    expect(buildTeamRanking(rows, period, names)[0].total).toBe(1)
  })

  it('separa venda sem canal em coluna própria, fechando com o total', () => {
    const ranking = buildTeamRanking([sale('s1', null, 'o1'), sale('s1', 'internet', 'o2')], period, names)
    expect(ranking[0]).toMatchObject({ total: 2, showroom: 0, internet: 1, carteira: 0, semCanal: 1 })
    expect(ranking[0].showroom + ranking[0].internet + ranking[0].carteira + ranking[0].semCanal).toBe(ranking[0].total)
  })

  it('nomeia vendedor desconhecido sem inventar dado', () => {
    expect(buildTeamRanking([sale('sx', 'internet', 'o1')], period, names)[0].name).toBe('Vendedor sem cadastro')
  })
})

describe('dropCancelledSales / collectSellerIds', () => {
  it('preserva eventos que não são venda', () => {
    const rows = [
      { tipo_evento: 'agendamento_criado', oportunidade_id: 'o1', seller_user_id: 's1' },
      sale('s1', 'internet', 'o1'),
      { ...sale('s1', 'internet', 'o1'), tipo_evento: 'venda_cancelada' },
    ]
    const kept = dropCancelledSales(rows)
    expect(kept.filter(row => row.tipo_evento === 'venda_realizada')).toHaveLength(0)
    expect(kept.filter(row => row.tipo_evento === 'agendamento_criado')).toHaveLength(1)
  })

  it('coleta ids únicos de vendedores', () => {
    expect(collectSellerIds([sale('s1', 'internet', 'o1'), sale('s1', 'carteira', 'o2'), sale('s2', null, 'o3')]).sort()).toEqual(['s1', 's2'])
  })
})

describe('buildTeamFunnel', () => {
  it('monta o funil dos três canais com todos os vendedores da loja', () => {
    const rows = [
      { tipo_evento: 'oportunidade_registrada', canal: 'internet', seller_user_id: 's1', loja_id: 'loja-1', data_evento: '2026-07-05T12:00:00Z', cliente_id: 'c1' },
      { tipo_evento: 'cliente_qualificado', canal: 'internet', seller_user_id: 's1', loja_id: 'loja-1', data_evento: '2026-07-06T12:00:00Z', cliente_id: 'c1' },
      sale('s2', 'internet', 'o1'),
    ]

    const dashboard = buildTeamFunnel({ events: rows, period, storeId: 'loja-1', meta: 10 })
    const internet = dashboard.channels.find(channel => channel.channel === 'Internet')

    expect(internet?.steps.find(step => step.key === 'oportunidades')?.value).toBe(1)
    expect(internet?.steps.find(step => step.key === 'venda')?.value).toBe(1)
    expect(dashboard.kpis.meta).toBe(10)
    expect(dashboard.kpis.realizado).toBe(1)
  })
})
