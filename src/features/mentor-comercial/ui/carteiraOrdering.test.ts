import { describe, expect, it } from 'bun:test'
import {
  getNextActionTimestamp,
  getPotentialRank,
  getPriorityValue,
  getScoreValue,
  sortCarteiraAtiva,
  type CarteiraSortableItem,
} from './carteiraOrdering'

describe('carteiraOrdering — extratores de valor', () => {
  it('extrai prioridade de snake_case ou camelCase', () => {
    expect(getPriorityValue({ priority_index: 90 })).toBe(90)
    expect(getPriorityValue({ priorityIndex: 75 })).toBe(75)
    expect(getPriorityValue({})).toBe(0)
  })

  it('extrai timestamp da próxima ação', () => {
    const d = new Date('2026-08-10T10:00:00Z')
    expect(getNextActionTimestamp({ next_action_at: d })).toBe(d.getTime())
    expect(getNextActionTimestamp({ nextActionAt: '2026-08-10T10:00:00Z' })).toBe(d.getTime())
    expect(getNextActionTimestamp({ next_action_at: null })).toBe(Infinity)
  })

  it('extrai rank de potencial', () => {
    expect(getPotentialRank({ potential: 'Muito alto' })).toBe(4)
    expect(getPotentialRank({ potential: 'Alto' })).toBe(3)
    expect(getPotentialRank({ potential: 'Médio' })).toBe(2)
    expect(getPotentialRank({ potential: 'Baixo' })).toBe(1)
    expect(getPotentialRank({ potential: null })).toBe(0)
  })

  it('extrai valor do score', () => {
    expect(getScoreValue({ mentor_score: 85 })).toBe(85)
    expect(getScoreValue({ mentorScore: 40 })).toBe(40)
    expect(getScoreValue({})).toBe(0)
  })
})

describe('carteiraOrdering — ordenação por quatro chaves e empates', () => {
  it('ordena por prioridade desc (chave 1)', () => {
    const items: CarteiraSortableItem[] = [
      { priority_index: 50 },
      { priority_index: 95 },
      { priority_index: 70 },
    ]
    const sorted = sortCarteiraAtiva(items)
    expect(sorted.map((i) => i.priority_index)).toEqual([95, 70, 50])
  })

  it('desempata por nextAction asc quando prioridade é igual (chave 2)', () => {
    const items: CarteiraSortableItem[] = [
      { priority_index: 90, next_action_at: '2026-08-15' },
      { priority_index: 90, next_action_at: '2026-08-01' },
      { priority_index: 90, next_action_at: '2026-08-10' },
    ]
    const sorted = sortCarteiraAtiva(items)
    expect(sorted.map((i) => i.next_action_at)).toEqual([
      '2026-08-01',
      '2026-08-10',
      '2026-08-15',
    ])
  })

  it('desempata por potencial desc quando prioridade e nextAction são iguais (chave 3)', () => {
    const items: CarteiraSortableItem[] = [
      { priority_index: 90, next_action_at: '2026-08-01', potential: 'Baixo' },
      { priority_index: 90, next_action_at: '2026-08-01', potential: 'Muito alto' },
      { priority_index: 90, next_action_at: '2026-08-01', potential: 'Médio' },
    ]
    const sorted = sortCarteiraAtiva(items)
    expect(sorted.map((i) => i.potential)).toEqual(['Muito alto', 'Médio', 'Baixo'])
  })

  it('desempata por score asc quando prioridade, nextAction e potencial são iguais (chave 4)', () => {
    const items: CarteiraSortableItem[] = [
      { priority_index: 90, next_action_at: '2026-08-01', potential: 'Alto', mentor_score: 80 },
      { priority_index: 90, next_action_at: '2026-08-01', potential: 'Alto', mentor_score: 30 },
      { priority_index: 90, next_action_at: '2026-08-01', potential: 'Alto', mentor_score: 60 },
    ]
    const sorted = sortCarteiraAtiva(items)
    expect(sorted.map((i) => i.mentor_score)).toEqual([30, 60, 80])
  })

  it('preserva a ordem em empate total nas quatro chaves', () => {
    const itemA: CarteiraSortableItem = {
      priority_index: 90,
      next_action_at: '2026-08-01',
      potential: 'Alto',
      mentor_score: 50,
    }
    const itemB: CarteiraSortableItem = {
      priority_index: 90,
      next_action_at: '2026-08-01',
      potential: 'Alto',
      mentor_score: 50,
    }
    const sorted = sortCarteiraAtiva([itemA, itemB])
    expect(sorted[0]).toBe(itemA)
    expect(sorted[1]).toBe(itemB)
  })

  it('trata itens sem next_action_at colocando ao final do grupo asc', () => {
    const items: CarteiraSortableItem[] = [
      { priority_index: 90, next_action_at: null },
      { priority_index: 90, next_action_at: '2026-08-05' },
    ]
    const sorted = sortCarteiraAtiva(items)
    expect(sorted[0].next_action_at).toBe('2026-08-05')
    expect(sorted[1].next_action_at).toBeNull()
  })
})
