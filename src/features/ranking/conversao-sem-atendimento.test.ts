import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { calculateManagerScore } from './hooks/useStoreRankingPageData'

/**
 * A conversão do vendedor tinha dois tratamentos no mesmo módulo: o modal de
 * perfil já devolvia `null` sem atendimento e mostrava '—' com a ajuda "Sem
 * atendimentos registrados no período", enquanto a lista do ranking mostrava
 * "0%" para a mesma pessoa no mesmo período.
 *
 * Pior que a inconsistência: esse 0 entrava em `calculateManagerScore` como
 * 25% da nota e gerava texto de comparação ("converte melhor, X% vs 0% —
 * repasse a abordagem"), cobrando o vendedor por uma divisão por zero.
 *
 * Sem atendimento não há conversão. Zero medido (houve atendimento e nenhuma
 * venda) continua sendo 0%.
 */
const hook = readFileSync(new URL('./hooks/useStoreRankingPageData.ts', import.meta.url), 'utf8')
const view = readFileSync(new URL('./views/ManagerRankingReference.tsx', import.meta.url), 'utf8')
const comparison = readFileSync(new URL('./manager/manager-ranking-comparison.ts', import.meta.url), 'utf8')

describe('conversão sem atendimento é ausência, não zero', () => {
  test('o hook devolve null quando não houve atendimento', () => {
    expect(hook).toContain('r.visitas > 0 ? Math.round((r.vnd_total / r.visitas) * 100) : null')
  })

  test('a tabela do gerente mostra traço, como já fazia com rotina', () => {
    expect(view).toContain("{seller.conversao === null ? '—' : `${seller.conversao}%`}")
  })

  test('a comparação entre vendedores ignora conversão ausente', () => {
    expect(comparison).toContain('a.conversao !== null && b.conversao !== null')
  })

  test('o líder de conversão não sai de quem não tem conversão', () => {
    expect(view).toContain('data.vendedores.filter(item => item.conversao !== null)')
  })
})

describe('calculateManagerScore não pontua sem conversão', () => {
  test('conversão ausente devolve nota nula, como a rotina ausente', () => {
    expect(calculateManagerScore({ attainment: 80, conversion: null, routine: 90 })).toBeNull()
    expect(calculateManagerScore({ attainment: 80, conversion: 10, routine: null })).toBeNull()
  })

  test('com os três presentes, a nota sai ponderada', () => {
    // 80*0.5 + 40*0.25 + 60*0.25 = 40 + 10 + 15 = 65
    expect(calculateManagerScore({ attainment: 80, conversion: 40, routine: 60 })).toBe(65)
  })

  test('conversão medida em zero continua pontuando como zero', () => {
    // 80*0.5 + 0 + 60*0.25 = 55 — zero real não pode virar ausência.
    expect(calculateManagerScore({ attainment: 80, conversion: 0, routine: 60 })).toBe(55)
  })
})
