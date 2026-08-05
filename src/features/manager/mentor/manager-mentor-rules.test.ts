import { describe, expect, test } from 'vitest'
import type { RankingEntry } from '@/types/database'
import { buildMentorRecommendations, countMentorLevels, resolveMentorSituation } from './manager-mentor-rules'

function ranking(overrides: Partial<RankingEntry> & { user_name: string }): RankingEntry {
  return {
    user_id: overrides.user_name,
    is_venda_loja: false,
    vnd_total: 0,
    leads: 0,
    agd_total: 0,
    visitas: 0,
    meta: 0,
    atingimento: 0,
    projecao: 0,
    ritmo: 0,
    efficiency: 0,
    status: { label: '', color: '' },
    gap: 0,
    position: 1,
    ...overrides,
  }
}

const noStoreGoal = { goalValue: 0, totalSales: 0, elapsedDays: 10, totalDays: 22 }

describe('buildMentorRecommendations', () => {
  test('cobra fechamento de cada vendedor pendente', () => {
    const result = buildMentorRecommendations({
      ranking: [],
      pendingDisciplineSellers: [{ name: 'JOSÉ' }, { name: 'DANIEL SANTOS' }],
      ...noStoreGoal,
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ level: 'atencao', type: 'fechamento' })
    expect(result[0].message).toBe('JOSÉ ainda não realizou o fechamento diário.')
  })

  test('marca rotina abaixo de 60% como crítica e arredonda o percentual', () => {
    const result = buildMentorRecommendations({
      ranking: [ranking({ user_name: 'JOSÉ', routine_execution: 47.4 })],
      pendingDisciplineSellers: [],
      ...noStoreGoal,
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ level: 'critico', type: 'rotina' })
    expect(result[0].message).toBe('JOSÉ está com rotina crítica (47%).')
  })

  test('não gera alerta de rotina sem dado apurado nem no limite de 60%', () => {
    const result = buildMentorRecommendations({
      ranking: [
        ranking({ user_name: 'SEM DADO', routine_execution: null }),
        ranking({ user_name: 'NO LIMITE', routine_execution: 60 }),
      ],
      pendingDisciplineSellers: [],
      ...noStoreGoal,
    })

    expect(result).toHaveLength(0)
  })

  test('acusa loja abaixo da meta proporcional ao dia decorrido', () => {
    const result = buildMentorRecommendations({
      ranking: [],
      pendingDisciplineSellers: [],
      goalValue: 220,
      totalSales: 60,
      elapsedDays: 10,
      totalDays: 22,
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ level: 'critico', type: 'meta' })
    expect(result[0].message).toBe('Loja abaixo da meta proporcional. Realizado: 60 / Necessário: 100.')
  })

  test('silencia a regra de meta quando a loja está no ritmo ou sem meta definida', () => {
    const noRule = buildMentorRecommendations({
      ranking: [],
      pendingDisciplineSellers: [],
      goalValue: 220,
      totalSales: 120,
      elapsedDays: 10,
      totalDays: 22,
    })
    const noGoal = buildMentorRecommendations({
      ranking: [],
      pendingDisciplineSellers: [],
      goalValue: 0,
      totalSales: 0,
      elapsedDays: 10,
      totalDays: 22,
    })

    expect(noRule).toHaveLength(0)
    expect(noGoal).toHaveLength(0)
  })
})

describe('resolveMentorSituation', () => {
  test('classifica a operação pelo volume de críticos', () => {
    const critical = Array.from({ length: 3 }, () => ({ level: 'critico', type: 'rotina', message: '', action: '' }) as const)

    expect(resolveMentorSituation([])).toBe('controlada')
    expect(resolveMentorSituation([{ level: 'atencao', type: 'fechamento', message: '', action: '' }])).toBe('atencao')
    expect(resolveMentorSituation(critical.slice(0, 2))).toBe('atencao')
    expect(resolveMentorSituation(critical)).toBe('critica')
  })
})

describe('countMentorLevels', () => {
  test('separa os contadores exibidos no card de situação', () => {
    expect(countMentorLevels([
      { level: 'critico', type: 'meta', message: '', action: '' },
      { level: 'atencao', type: 'fechamento', message: '', action: '' },
      { level: 'atencao', type: 'fechamento', message: '', action: '' },
    ])).toEqual({ critical: 1, attention: 2, total: 3 })
  })
})
