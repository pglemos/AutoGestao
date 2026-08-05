import { describe, expect, it } from 'vitest'
import { buildTeamGoalRows, buildTeamGoalTotals, classifySeller, countByStatus } from './team-goals'
import type { OfficialSellerPerformance } from '@/hooks/useOfficialSellerPerformance'

function perf(partial: Partial<OfficialSellerPerformance>): OfficialSellerPerformance {
  return {
    seller_user_id: 's1',
    seller_name: 'VENDEDOR',
    store_id: 'loja-1',
    store_name: 'LOJA',
    vendas_realizadas: 0,
    vendas_ultimo_dia: 0,
    vendas_projetadas: 0,
    faturamento_realizado: 0,
    meta: 0,
    atingimento: 0,
    comissao_realizada: 0,
    comissao_projetada: 0,
    disciplina: 0,
    leads: 0,
    atendimentos: 0,
    agendamentos: 0,
    regularizacoes_pendentes: 0,
    regularizacoes_aprovadas: 0,
    ...partial,
  }
}

describe('classifySeller', () => {
  it('classifica pelos limites de meta e projeção', () => {
    expect(classifySeller(10, 10, 12)).toBe('excelente')
    expect(classifySeller(10, 4, 10)).toBe('bom')
    expect(classifySeller(10, 3, 7)).toBe('atencao')
    expect(classifySeller(10, 1, 6)).toBe('critico')
  })

  it('trata meta zero como sem meta (venda da loja)', () => {
    expect(classifySeller(0, 5, 6)).toBe('sem_meta')
  })
})

describe('buildTeamGoalRows', () => {
  it('mapeia a RPC e ordena pelo realizado', () => {
    const rows = buildTeamGoalRows([
      perf({ seller_user_id: 'a', seller_name: 'ANA', meta: 8, vendas_realizadas: 3, vendas_projetadas: 5.4 }),
      perf({ seller_user_id: 'b', seller_name: 'BRUNO', meta: 8, vendas_realizadas: 9, vendas_projetadas: 11 }),
    ])

    expect(rows.map(row => row.name)).toEqual(['BRUNO', 'ANA'])
    expect(rows[0]).toMatchObject({ status: 'excelente', atingimento: 113 })
    // 5 projetadas contra meta 8 fica abaixo do corte de 70% (5,6) → crítico.
    expect(rows[1]).toMatchObject({ projecao: 5, status: 'critico', atingimento: 38 })
  })
})

describe('buildTeamGoalTotals', () => {
  it('soma meta apenas de quem tem meta e realizado de todos', () => {
    const rows = buildTeamGoalRows([
      perf({ seller_user_id: 'a', meta: 8, vendas_realizadas: 4, vendas_projetadas: 6 }),
      perf({ seller_user_id: 'b', meta: 8, vendas_realizadas: 2, vendas_projetadas: 3 }),
      perf({ seller_user_id: 'c', meta: 0, vendas_realizadas: 5, vendas_projetadas: 5 }),
    ])

    expect(buildTeamGoalTotals(rows)).toMatchObject({
      meta: 16,
      realizado: 11,
      projecao: 14,
      atingimento: 69,
      gap: 5,
      comMeta: 2,
    })
  })

  it('devolve atingimento nulo quando a loja não tem meta configurada', () => {
    const totals = buildTeamGoalTotals(buildTeamGoalRows([perf({ meta: 0, vendas_realizadas: 3 })]))
    expect(totals.atingimento).toBeNull()
    expect(totals.projetado).toBeNull()
  })
})

describe('countByStatus', () => {
  it('conta cada faixa', () => {
    const rows = buildTeamGoalRows([
      perf({ seller_user_id: 'a', meta: 5, vendas_realizadas: 5, vendas_projetadas: 5 }),
      perf({ seller_user_id: 'b', meta: 5, vendas_realizadas: 1, vendas_projetadas: 1 }),
      perf({ seller_user_id: 'c', meta: 0, vendas_realizadas: 2, vendas_projetadas: 2 }),
    ])
    expect(countByStatus(rows)).toMatchObject({ excelente: 1, critico: 1, sem_meta: 1 })
  })
})
