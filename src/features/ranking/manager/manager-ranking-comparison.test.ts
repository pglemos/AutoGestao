import { describe, expect, test } from 'vitest'
import type { RankedVendedor } from '@/features/ranking/hooks/useStoreRankingPageData'
import {
  buildComparisonInsights,
  buildComparisonRadar,
  initials,
  resolveComparisonWinner,
} from './manager-ranking-comparison'

function seller(overrides: Partial<RankedVendedor> & { id: string; nome: string }): RankedVendedor {
  return {
    vendas: 0,
    meta: 0,
    leads: 0,
    agendamentos: 0,
    visitas: 0,
    atingimento: 0,
    conversao: 0,
    rotina: 0,
    posicao: 1,
    pontuacao: 0,
    ...overrides,
  }
}

describe('buildComparisonRadar', () => {
  test('mantém percentuais e normaliza volumes pelo maior dos dois', () => {
    const radar = buildComparisonRadar(
      seller({ id: 'a', nome: 'ANA', atingimento: 90, conversao: 20, rotina: 70, agendamentos: 10, visitas: 40 }),
      seller({ id: 'b', nome: 'BRUNO', atingimento: 45, conversao: 30, rotina: 50, agendamentos: 20, visitas: 10 }),
    )

    expect(radar).toEqual([
      { metric: 'Meta', a: 90, b: 45 },
      { metric: 'Conversão', a: 20, b: 30 },
      { metric: 'Rotina', a: 70, b: 50 },
      { metric: 'Agendamentos', a: 50, b: 100 },
      { metric: 'Atendimentos', a: 100, b: 25 },
    ])
  })

  test('não divide por zero quando ninguém tem volume no período', () => {
    const radar = buildComparisonRadar(
      seller({ id: 'a', nome: 'ANA', rotina: null }),
      seller({ id: 'b', nome: 'BRUNO', rotina: null }),
    )

    expect(radar.map(point => [point.a, point.b])).toEqual([[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]])
  })
})

describe('resolveComparisonWinner', () => {
  test('aponta a maior pontuação, empata e recusa comparar sem pontuação apurada', () => {
    const ana = seller({ id: 'a', nome: 'ANA', pontuacao: 80 })
    const bruno = seller({ id: 'b', nome: 'BRUNO', pontuacao: 60 })
    const semRotina = seller({ id: 'c', nome: 'CARLA', pontuacao: null })

    expect(resolveComparisonWinner(ana, bruno)?.nome).toBe('ANA')
    expect(resolveComparisonWinner(bruno, ana)?.nome).toBe('ANA')
    expect(resolveComparisonWinner(ana, seller({ id: 'd', nome: 'DINA', pontuacao: 80 }))).toBeNull()
    expect(resolveComparisonWinner(ana, semRotina)).toBeNull()
  })
})

describe('buildComparisonInsights', () => {
  test('descreve cada diferença citando os dois valores', () => {
    const insights = buildComparisonInsights(
      seller({ id: 'a', nome: 'ANA SOUZA', atingimento: 90, conversao: 12, rotina: 80, agendamentos: 9, visitas: 30 }),
      seller({ id: 'b', nome: 'BRUNO LIMA', atingimento: 60, conversao: 20, rotina: 55, agendamentos: 14, visitas: 12 }),
    )

    expect(insights[0]).toBe('ANA SOUZA está com melhor atingimento de meta (90% vs 60%).')
    expect(insights[1]).toBe('BRUNO LIMA converte melhor (20% vs 12%) — repasse a abordagem para ANA.')
    expect(insights[2]).toBe('ANA SOUZA tem rotina mais disciplinada (80% vs 55%) — reforço de rotina recomendado a BRUNO.')
    expect(insights[3]).toBe('BRUNO LIMA agendou mais (14 vs 9) — base de pipeline maior.')
    expect(insights[4]).toBe('ANA SOUZA atendeu mais (30 vs 12) — volume de oportunidades superior.')
  })

  test('omite a rotina quando algum lado não tem execução apurada', () => {
    const insights = buildComparisonInsights(
      seller({ id: 'a', nome: 'ANA', rotina: null, atingimento: 50 }),
      seller({ id: 'b', nome: 'BRUNO', rotina: 90, atingimento: 50 }),
    )

    expect(insights.some(item => item.includes('rotina mais disciplinada'))).toBe(false)
  })

  test('assume indicadores próximos quando nada difere', () => {
    const insights = buildComparisonInsights(
      seller({ id: 'a', nome: 'ANA' }),
      seller({ id: 'b', nome: 'BRUNO' }),
    )

    expect(insights).toEqual(['Os dois vendedores estão com indicadores muito próximos neste período.'])
  })
})

describe('initials', () => {
  test('usa as duas primeiras iniciais e tolera nome vazio', () => {
    expect(initials('daniel dos santos')).toBe('DD')
    expect(initials('José')).toBe('J')
    expect(initials('')).toBe('?')
  })
})
