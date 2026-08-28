import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/**
 * A coluna QUALIDADE do acompanhamento diário de consultoria calculava
 * `conv = leads > 0 ? (vendas / leads) * 100 : 0` e escolhia a faixa do badge
 * pelo valor. Sem lead no dia, o resultado era "0.0% Conv." na pior faixa —
 * indistinguível de um dia com leads e nenhuma venda.
 *
 * Medido em produção: 1.735 dos 2.354 lançamentos diários (74%) têm
 * `leads_prev_day = 0`. Três em cada quatro linhas da tela recebiam o rótulo
 * pior por ausência de denominador, não por desempenho.
 */
const view = readFileSync(new URL('./components/ConsultingDailyTrackingView.tsx', import.meta.url), 'utf8')

describe('qualidade do dia sem lead é ausência, não 0%', () => {
  test('a conversão vira null quando não há lead', () => {
    expect(view).toContain('const conv = leads > 0 ? (totalVnd / leads) * 100 : null')
  })

  test('o badge diz que não houve lead, em vez de mostrar 0.0%', () => {
    expect(view).toContain('Sem lead no dia')
  })

  test('com lead, o percentual e as faixas continuam valendo', () => {
    expect(view).toContain("conv >= 3 ? 'success' : conv >= 1 ? 'warning' : 'outline'")
    expect(view).toContain('{conv.toFixed(1)}% Conv.')
  })

  test('o motivo e a medição ficam registrados no arquivo', () => {
    expect(view).toContain('74%')
    expect(view).toContain('igual a quem teve leads e não vendeu')
  })
})
