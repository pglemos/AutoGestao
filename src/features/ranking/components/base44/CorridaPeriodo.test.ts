import { describe, expect, it } from 'vitest'
import { layoutCorredores, selecionarCorredores } from './CorridaPeriodo'

const TRACK = 1350
const GAP = 86
const MARGEM = 24

function menorDistancia(xs: number[]): number {
  const ordenado = [...xs].sort((a, b) => a - b)
  let min = Infinity
  for (let i = 1; i < ordenado.length; i++) min = Math.min(min, ordenado[i] - ordenado[i - 1])
  return min
}

describe('layoutCorredores', () => {
  it('separa empatados por pelo menos o gap pedido', () => {
    // 4 vendedores empatados em 4 vendas — o caso que colidia com o passo fixo de 42px.
    const xs = layoutCorredores([9, 4, 4, 4, 4, 2, 1, 0], 12, TRACK, GAP, MARGEM)
    expect(menorDistancia(xs)).toBeGreaterThanOrEqual(GAP - 0.01)
  })

  it('separa valores distintos prensados contra o piso da pista', () => {
    // 0 e 1 venda contra uma meta de 12 caem quase no mesmo ponto.
    const xs = layoutCorredores([0, 1], 12, TRACK, GAP, MARGEM)
    expect(menorDistancia(xs)).toBeGreaterThanOrEqual(GAP - 0.01)
  })

  it('mantém a ordem por volume de vendas', () => {
    const valores = [0, 9, 4, 2]
    const xs = layoutCorredores(valores, 12, TRACK, GAP, MARGEM)
    expect(xs[1]).toBeGreaterThan(xs[2])
    expect(xs[2]).toBeGreaterThan(xs[3])
    expect(xs[3]).toBeGreaterThan(xs[0])
  })

  it('devolve uma posição por corredor, na ordem de entrada', () => {
    const xs = layoutCorredores([5, 1, 3], 10, TRACK, GAP, MARGEM)
    expect(xs).toHaveLength(3)
    expect(xs.every(Number.isFinite)).toBe(true)
  })

  it('não vaza da pista quando ela é estreita demais para todos', () => {
    const xs = layoutCorredores([0, 0, 0, 0, 0, 0, 0, 0], 12, 285, 32, 16)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(16)
    expect(Math.max(...xs)).toBeLessThanOrEqual(285 - 16)
  })

  it('não quebra antes da pista ser medida (largura 0)', () => {
    const xs = layoutCorredores([3, 1], 10, 0, GAP, MARGEM)
    expect(xs.every(Number.isFinite)).toBe(true)
  })
})

describe('selecionarCorredores', () => {
  // Lista já ordenada por vendas (desc), como o hook entrega.
  const lista = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(id => ({ id }))

  it('devolve tudo quando cabe', () => {
    expect(selecionarCorredores(lista.slice(0, 4), 'b', 4)).toHaveLength(4)
  })

  it('mantém líder, você e seus dois vizinhos diretos', () => {
    // 'e' é o 5º; vizinhos diretos são 'd' e 'f'; líder é 'a'.
    expect(selecionarCorredores(lista, 'e', 4).map(v => v.id)).toEqual(['a', 'd', 'e', 'f'])
  })

  it('não duplica quando você é o líder', () => {
    expect(selecionarCorredores(lista, 'a', 4).map(v => v.id)).toEqual(['a', 'b'])
  })

  it('preserva a ordem de entrada', () => {
    const out = selecionarCorredores(lista, 'g', 4).map(v => v.id)
    expect(out).toEqual([...out].sort((x, y) => lista.findIndex(v => v.id === x) - lista.findIndex(v => v.id === y)))
  })

  it('cai no topo quando você não está na lista', () => {
    expect(selecionarCorredores(lista, undefined, 4).map(v => v.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('a escala deixa de ser distorcida com 4 corredores na pista estreita', () => {
    // Antes, 8 corredores em 285px eram empurrados para espaçamento uniforme:
    // as posições paravam de representar vendas.
    const oito = layoutCorredores([9, 4, 4, 4, 4, 2, 1, 0], 12, 285, 32, 16)
    const quatro = layoutCorredores([9, 4, 4, 2], 12, 285, 32, 16)
    const desvio = (xs: number[], vals: number[]) => {
      const usable = 285 - 32
      return Math.max(...xs.map((x, i) => Math.abs(x - (16 + (vals[i] / 12) * usable))))
    }
    expect(desvio(quatro, [9, 4, 4, 2])).toBeLessThan(desvio(oito, [9, 4, 4, 4, 4, 2, 1, 0]))
  })
})
