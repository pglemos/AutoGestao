import { describe, expect, test } from 'bun:test'
import { listedIndicatorCount } from './strategicPlanAdmin'

describe('listedIndicatorCount', () => {
  test('itens do pacote vencem o total desatualizado da versão', () => {
    expect(listedIndicatorCount({ packageItemCount: 46, packageTotal: 45, cycleRosterCount: 45 })).toBe(46)
  })

  test('cai no total da versão quando ainda não há itens carregados', () => {
    expect(listedIndicatorCount({ packageItemCount: 0, packageTotal: 46, cycleRosterCount: 12 })).toBe(46)
  })

  test('ciclo sem pacote usa o roster persistido', () => {
    expect(listedIndicatorCount({ packageItemCount: 0, packageTotal: 0, cycleRosterCount: 19 })).toBe(19)
  })
})
