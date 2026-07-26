import { describe, expect, it } from 'bun:test'
import { sumSeries } from '@/components/owner/strategic/strategicPlanLiveRepository'

describe('Plano Estratégico live — consolidação mensal', () => {
  it('soma séries na mesma posição mensal e preserva o tamanho da série', () => {
    expect(sumSeries([3, null, 2], [1, 4, null], [0, 2, 5])).toEqual([4, 6, 7])
  })

  it('aceita séries de tamanhos diferentes sem transformar linhas em totais', () => {
    expect(sumSeries([3], [2, 1])).toEqual([5, 1])
  })
})
