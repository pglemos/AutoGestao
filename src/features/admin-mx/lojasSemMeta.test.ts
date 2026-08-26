import { describe, expect, test } from 'bun:test'
import { vendedoresImpactados, type LojaSemMeta } from './lojasSemMeta'

const lojas: LojaSemMeta[] = [
  { storeId: 'a', loja: 'AUTO UP', vendedores: 7 },
  { storeId: 'b', loja: 'GOTO MOTORS', vendedores: 5 },
  { storeId: 'c', loja: 'PROMAC JPA', vendedores: 0 },
]

describe('lojasSemMeta', () => {
  test('soma os vendedores impactados por meta zerada', () => {
    expect(vendedoresImpactados(lojas)).toBe(12)
    expect(vendedoresImpactados([])).toBe(0)
  })
})
