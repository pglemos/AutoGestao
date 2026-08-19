import { describe, expect, test } from 'bun:test'
import {
  calcAttainment,
  calcVariation,
  getAccumulatedAttainment,
  getAccumulatedUntilMonth,
  getPerformanceStatus,
} from './planPerformance'

describe('calcAttainment', () => {
  test('meta cumprida dá 100', () => {
    expect(calcAttainment(50, 50)).toBe(100)
  })

  test('meta zero não vira divisão por zero', () => {
    expect(calcAttainment(0, 10)).toBeNull()
  })

  test('sem meta ou sem realizado não há atingimento', () => {
    expect(calcAttainment(null, 10)).toBeNull()
    expect(calcAttainment(10, null)).toBeNull()
  })

  test('realizado zero é resultado, não ausência', () => {
    expect(calcAttainment(10, 0)).toBe(0)
  })
})

describe('calcVariation', () => {
  test('crescimento e queda', () => {
    expect(calcVariation(120, 100)).toBeCloseTo(20, 10)
    expect(calcVariation(80, 100)).toBeCloseTo(-20, 10)
  })

  test('base negativa usa módulo para não inverter o sinal', () => {
    expect(calcVariation(-50, -100)).toBeCloseTo(50, 10)
  })

  test('base zero não produz infinito', () => {
    expect(calcVariation(10, 0)).toBeNull()
  })
})

describe('getPerformanceStatus', () => {
  test('quanto maior melhor: faixas 100 / 90', () => {
    expect(getPerformanceStatus(100, 100, 'increase')).toBe('positivo')
    expect(getPerformanceStatus(100, 95, 'increase')).toBe('atencao')
    expect(getPerformanceStatus(100, 80, 'increase')).toBe('critico')
  })

  test('quanto menor melhor: ficar abaixo da meta é positivo', () => {
    // O caso que a fórmula única erra: custo de R$ 80 contra meta de R$ 100 é o
    // resultado desejado, não um desempenho crítico.
    expect(getPerformanceStatus(100, 80, 'decrease')).toBe('positivo')
    expect(getPerformanceStatus(100, 105, 'decrease')).toBe('atencao')
    expect(getPerformanceStatus(100, 130, 'decrease')).toBe('critico')
  })

  test('direção ausente é tratada como quanto maior melhor', () => {
    expect(getPerformanceStatus(100, 100, null)).toBe('positivo')
  })

  test('sem base quando falta meta, realizado ou a meta é zero', () => {
    expect(getPerformanceStatus(null, 10, 'increase')).toBe('sem_base')
    expect(getPerformanceStatus(10, null, 'increase')).toBe('sem_base')
    expect(getPerformanceStatus(0, 10, 'increase')).toBe('sem_base')
  })
})

describe('getAccumulatedUntilMonth', () => {
  const valueMap = {
    visits: { 1: 100, 2: 200, 3: 300 },
    sales_total: { 1: 10, 2: 40, 3: 90 },
    visit_to_sale_rate: { 1: 0.1, 2: 0.2, 3: 0.3 },
  }

  test('indicador aditivo soma os meses', () => {
    expect(getAccumulatedUntilMonth(valueMap, 'visits', 3)).toBe(600)
    expect(getAccumulatedUntilMonth(valueMap, 'visits', 2)).toBe(300)
  })

  test('taxa acumulada é recomposta pelas bases, não somada nem promediada', () => {
    // 140 vendas sobre 600 comparecimentos = 23,33%.
    // Somar as taxas daria 60%; a média daria 20%.
    const acumulado = getAccumulatedUntilMonth(valueMap, 'visit_to_sale_rate', 3)
    expect(acumulado).toBeCloseTo(140 / 600, 10)
    expect(acumulado).not.toBeCloseTo(0.6, 5)
    expect(acumulado).not.toBeCloseTo(0.2, 5)
  })

  test('acumulado respeita o mês de corte', () => {
    expect(getAccumulatedUntilMonth(valueMap, 'visit_to_sale_rate', 1)).toBeCloseTo(0.1, 10)
  })

  test('indicador sem valor algum devolve nulo em vez de zero', () => {
    expect(getAccumulatedUntilMonth({}, 'visits', 12)).toBeNull()
  })

  test('base faltante impede o acumulado da taxa', () => {
    expect(getAccumulatedUntilMonth({ sales_total: { 1: 10 } }, 'visit_to_sale_rate', 3)).toBeNull()
  })
})

describe('getAccumulatedAttainment', () => {
  test('compara acumulado de realizado contra acumulado de meta', () => {
    const meta = { visits: { 1: 100, 2: 100 } }
    const real = { visits: { 1: 90, 2: 110 } }
    expect(getAccumulatedAttainment(meta, real, 'visits', 2)).toBeCloseTo(100, 10)
  })

  test('atingimento acumulado de taxa usa as taxas recompostas dos dois lados', () => {
    const meta = { visits: { 1: 100, 2: 100 }, sales_total: { 1: 20, 2: 20 } }
    const real = { visits: { 1: 100, 2: 300 }, sales_total: { 1: 10, 2: 90 } }
    // meta acumulada 40/200 = 20%; realizado 100/400 = 25%; atingimento 125%.
    expect(getAccumulatedAttainment(meta, real, 'visit_to_sale_rate', 2)).toBeCloseTo(125, 8)
  })
})
