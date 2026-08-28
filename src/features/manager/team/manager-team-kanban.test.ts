import { describe, expect, test } from 'bun:test'
import type { RankingEntry } from '@/types/database'
import {
  buildManagerTeamCard,
  getManagerTeamStatus,
  groupManagerTeamCards,
  summarizeManagerTeam,
} from './manager-team-kanban'

function seller(overrides: Partial<RankingEntry> = {}): RankingEntry {
  return {
    user_id: 'seller-1',
    user_name: 'Vendedor MX',
    is_venda_loja: false,
    vnd_total: 8,
    leads: 20,
    agd_total: 10,
    visitas: 5,
    meta: 10,
    atingimento: 80,
    projecao: 8,
    ritmo: 1,
    efficiency: 0,
    status: { label: '', color: '' },
    gap: 2,
    position: 1,
    routine_execution: 80,
    discipline_score: 60,
    ...overrides,
  }
}

describe('manager team kanban', () => {
  test('aplica os limites de Resultado e Consistência da referência Base44', () => {
    const card = buildManagerTeamCard(seller())

    expect(card.result).toBe(80)
    expect(card.consistency).toBe(74)
    expect(card.resultStatus).toBe('attention')
    expect(card.consistencyStatus).toBe('attention')
  })

  test('aplica a matriz Resultado x Consistência na visão Todos', () => {
    const onTrack = buildManagerTeamCard(seller({ vnd_total: 10, routine_execution: 80, discipline_score: 80 }))
    const attention = buildManagerTeamCard(seller({ vnd_total: 8, routine_execution: 80, discipline_score: 80 }))
    const critical = buildManagerTeamCard(seller({ vnd_total: 4, routine_execution: 40, discipline_score: 40 }))

    expect(getManagerTeamStatus(onTrack, 'all')).toBe('on_track')
    expect(getManagerTeamStatus(attention, 'all')).toBe('on_track')
    expect(getManagerTeamStatus(critical, 'all')).toBe('critical')
  })

  test('não fabrica Consistência quando falta Rotina ou Disciplina verificável', () => {
    const withoutRoutine = buildManagerTeamCard(seller({ routine_execution: null }))
    const withoutDiscipline = buildManagerTeamCard(seller({ discipline_score: null }))

    expect(withoutRoutine.consistency).toBeNull()
    expect(withoutDiscipline.consistency).toBeNull()
    expect(getManagerTeamStatus(withoutRoutine, 'consistency')).toBe('not_applicable')
    expect(getManagerTeamStatus(withoutRoutine, 'all')).toBe('not_applicable')
    expect(getManagerTeamStatus(withoutDiscipline, 'all')).toBe('not_applicable')
  })

  test('agrupa vendedores e calcula o percentual elegível em dia', () => {
    const cards = [
      buildManagerTeamCard(seller({ user_id: 'one', vnd_total: 10, routine_execution: 80, discipline_score: 80 })),
      buildManagerTeamCard(seller({ user_id: 'two', vnd_total: 4, routine_execution: 40, discipline_score: 40 })),
      buildManagerTeamCard(seller({ user_id: 'three', meta: 0, routine_execution: null, discipline_score: null })),
    ]
    const groups = groupManagerTeamCards(cards, 'all')

    expect(groups.on_track).toHaveLength(1)
    expect(groups.critical).toHaveLength(1)
    expect(groups.not_applicable).toHaveLength(1)
    expect(summarizeManagerTeam(groups)).toEqual({ eligible: 2, onTrackPercentage: 50 })
  })
})

/**
 * "0% da equipe Em dia" lê-se como time inteiro atrasado. Quando não há
 * vendedor elegível no período, não há percentual — o kanban passa a dizer
 * isso em vez de exibir zero.
 */
describe('percentual da equipe sem vendedor elegível', () => {
  const vazio = { critical: [], attention: [], on_track: [] } as never

  test('sem elegíveis, o percentual é nulo e não zero', () => {
    const resumo = summarizeManagerTeam(vazio)
    expect(resumo.eligible).toBe(0)
    expect(resumo.onTrackPercentage).toBeNull()
  })

  test('zero medido continua sendo 0%', () => {
    // Há dois elegíveis e nenhum em dia: 0% é afirmação verdadeira.
    const comAtraso = { critical: [{}], attention: [{}], on_track: [] } as never
    expect(summarizeManagerTeam(comAtraso).onTrackPercentage).toBe(0)
  })

  test('metade em dia dá 50%', () => {
    const meio = { critical: [{}], attention: [], on_track: [{}] } as never
    expect(summarizeManagerTeam(meio).onTrackPercentage).toBe(50)
  })
})
