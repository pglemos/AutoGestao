import { describe, expect, test } from 'vitest'
import {
  attainmentOf,
  buildSellerGoalRecommendation,
  classifySellerGoal,
  countSellerGoalStatuses,
  sumSellerGoals,
  type SellerGoalRow,
} from './seller-goal-insights'

function row(name: string, realized: number, goal: number): SellerGoalRow {
  return { id: name, name, realized, goal }
}

describe('classifySellerGoal', () => {
  test('usa as faixas do Base44 (100 / 90 / 70) e trata meta zerada', () => {
    expect(classifySellerGoal(row('A', 10, 10))).toBe('acima')
    expect(classifySellerGoal(row('B', 9, 10))).toBe('no_ritmo')
    expect(classifySellerGoal(row('C', 7, 10))).toBe('risco')
    expect(classifySellerGoal(row('D', 6, 10))).toBe('critico')
    expect(classifySellerGoal(row('E', 5, 0))).toBe('sem_meta')
  })

  test('atingimento é nulo sem meta e arredondado com meta', () => {
    expect(attainmentOf(row('A', 5, 0))).toBeNull()
    expect(attainmentOf(row('B', 5, 8))).toBe(63)
  })
})

describe('countSellerGoalStatuses', () => {
  test('conta cada faixa separadamente', () => {
    expect(countSellerGoalStatuses([
      row('A', 12, 10),
      row('B', 9, 10),
      row('C', 7, 10),
      row('D', 1, 10),
      row('E', 3, 0),
    ])).toEqual({ acima: 1, no_ritmo: 1, risco: 1, critico: 1, sem_meta: 1 })
  })
})

describe('buildSellerGoalRecommendation', () => {
  test('cobra definição de meta quando a maioria está sem meta', () => {
    const result = buildSellerGoalRecommendation([row('A', 3, 0), row('B', 4, 0), row('C', 10, 10)])

    expect(result).toMatchObject({ tone: 'atencao', title: 'Metas não definidas' })
    expect(result?.text).toBe('2 de 3 vendedores estão sem meta individual. Defina metas para todos para acompanhar o desempenho da equipe.')
  })

  test('aponta os dois piores atingimentos abaixo de 80%', () => {
    const result = buildSellerGoalRecommendation([
      row('ANA', 2, 10),
      row('BRUNO', 5, 10),
      row('CARLA', 10, 10),
    ])

    expect(result).toMatchObject({ tone: 'risco' })
    expect(result?.text).toBe('ANA está em 20% da meta e BRUNO em 50%. Considere um plano de ação individual.')
  })

  test('celebra a equipe quando ninguém está abaixo de 80%', () => {
    const result = buildSellerGoalRecommendation([row('ANA', 9, 10), row('BRUNO', 10, 10)])

    expect(result).toMatchObject({ tone: 'positivo', title: 'Equipe no caminho certo' })
  })

  test('não recomenda nada sem vendedores', () => {
    expect(buildSellerGoalRecommendation([])).toBeNull()
  })
})

describe('sumSellerGoals', () => {
  test('soma realizado e meta e calcula o atingimento da equipe', () => {
    expect(sumSellerGoals([row('A', 6, 10), row('B', 4, 10)])).toEqual({ goal: 20, realized: 10, attainment: 50 })
  })

  test('atingimento fica nulo quando a equipe não tem meta', () => {
    expect(sumSellerGoals([row('A', 6, 0)])).toEqual({ goal: 0, realized: 6, attainment: null })
  })
})
