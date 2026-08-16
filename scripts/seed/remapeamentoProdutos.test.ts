import { describe, expect, test } from 'bun:test'
import { escolherProduto } from './remapeamentoProdutos.mjs'

describe('remapeamento de produto legado', () => {
  test('jornada até 9 encontros cabe no PMR Plus', () => {
    expect(escolherProduto(0).key).toBe('pmr_plus')
    expect(escolherProduto(9).key).toBe('pmr_plus')
  })

  test('jornada acima de 9 exige PMR Híbrido', () => {
    expect(escolherProduto(10).key).toBe('pmr_hibrido')
    expect(escolherProduto(13).key).toBe('pmr_hibrido')
  })

  test('regra forçada ignora a jornada', () => {
    expect(escolherProduto(13, 'plus').key).toBe('pmr_plus')
    expect(escolherProduto(1, 'hibrido').key).toBe('pmr_hibrido')
  })
})
